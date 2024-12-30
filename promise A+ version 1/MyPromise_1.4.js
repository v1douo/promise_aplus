// 状态
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class MyPromise {
  constructor(executor) {
    // 传入 resolve 和 reject 方法
    // 注意这里 resolve 和 reject 是箭头函数，保证 this 指向当前实例
    executor(this.resolve, this.reject)
  }

  // 存储成功回调函数
  onFulfilledCallbacks = []
  // 存储失败回调函数
  onRejectedCallbacks = []

  status = PENDING // 储存状态
  value = null // 成功之后的值
  reason = null // 失败之后的原因

  // 更改成功后的状态
  resolve = value => {
    // 只有状态是等待，才执行状态修改
    if (this.status === PENDING) {
      this.status = FULFILLED
      this.value = value // 保存成功之后的值

      // 将所有成功的回调拿出来执行
      while (this.onFulfilledCallbacks.length) {
        // 注意这里用 shift 保证数组中的回调执行后销毁
        this.onFulfilledCallbacks.shift()(value)
      }
    }
  }

  // 更改失败后的状态
  reject = reason => {
    // 只有状态是等待，才执行状态修改
    if (this.status === PENDING) {
      this.status = REJECTED
      this.reason = reason // 保存失败后的原因
    }
    // 判断失败回调是否存在，如果存在就调用
    while (this.onRejectedCallbacks.length) {
      this.onRejectedCallbacks.shift()(reason)
    }
  }

  then(onFulfilled, onRejected) {
    // 为了链式调用这里直接创建一个 MyPromise，并在后面 return 出去
    return new MyPromise((resolve, reject) => {
      if (this.status === FULFILLED) {
        // 获取成功回调函数的执行结果
        const returnData = onFulfilled(this.value)
        // 传入 resolvePromise 集中处理
        resolvePromise(returnData, resolve, reject)
      } else if (this.status === REJECTED) {
        // 调用失败回调，并且把原因返回
        onRejected(this.reason)
      } else if (this.status === PENDING) {
        // 因为不知道后面状态的变化情况，所以将成功回调和失败回调存储起来
        this.onFulfilledCallbacks.push(onFulfilled)
        this.onRejectedCallbacks.push(onRejected)
      }
    })
  }
}

function resolvePromise(returnData, resolve, reject) {
  // 如果是 MyPromise 实例对象
  if (returnData instanceof MyPromise) {
    /**
     *  如果一个 then 的 onFulfilled 回调返回的是一个 FULFILLED Promise：
     *  在执行 then 的时候，首先创建要返回的新的 Promise 实例，然后执行 onFulfilled 回调，得到一个 fulfilled Promise
     *  传入 resolvePromise 的三个参数为 fulfilled Promise，then 要返回的新的 Promise 实例的 resolve 和 reject 方法
     *  然后执行 resolvePromise 方法，将 fulfilled Promise 的状态传递给新的 Promise 实例
     *  1. 执行 fulfilled Promise 的 then 方法（这里依然会创建一个新的 Promise 返回，但是无关紧要），status 为 FULFILLED
     *  2. 执行 onFulfilled 回调（也就是新 Promise 的 resolve 方法），给 then 要返回的新 Promise 实例传递值，并改变状态为 FULFILLED
     *  3. 回调返回值为 undefined，传入给 resolvePromise 的参数为 undefined，没用的 Promise 实例的 resolve 和 reject 方法
     *  4. 执行 resolvePromise，给这个没用的 Promise 实例 resolve 一个 undefined
     *  返回新的 Promise 实例，完成状态的传递
     */

    // 调用实例的 then 方法的本质其实就是状态传递，不论是同步的状态传递，或是异步情况，等待 returnData 的状态改变后再去执行相应的回调进行传递
    returnData.then(resolve, reject)
    // 等价于 returnData.then(value => resolve(value), reason => reject(reason))
  } else {
    // 普通值
    resolve(returnData)
  }
}

module.exports = MyPromise

// 测试
const promise = new MyPromise((resolve, reject) => {
  // 目前这里只处理同步的问题
  resolve('success') // status = FULFILLED, value = 'success'
})

promise
  .then(value => {
    console.log(1)
    console.log('resolve', value)
    return new MyPromise(resolve => {
      // 可以在这里切换同步异步情况
      setTimeout(() => {
        resolve('other')
      }, 1000)
    })
  })
  .then(value => {
    console.log(2)
    console.log('resolve', value)
  })

// 1
// resolve success
// 2
// resolve other

// 如果 then 方法返回的是自己的 Promise 对象，则会发生循环调用，这个时候程序应该报错
