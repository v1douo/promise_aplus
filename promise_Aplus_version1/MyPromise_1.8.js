// 状态
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class MyPromise {
  constructor(executor) {
    try {
      executor(this.resolve, this.reject)
    } catch (error) {
      // 如果在执行创建 promise 的同步代码中有错误，执行 reject
      this.reject(error)
    }
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

      // 判断失败回调是否存在，如果存在就调用
      while (this.onRejectedCallbacks.length) {
        this.onRejectedCallbacks.shift()(reason)
      }
    }
  }

  then(onFulfilled, onRejected) {
    // 如果不传，就使用默认函数
    const realOnFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    const realOnRejected =
      typeof onRejected === 'function'
        ? onRejected
        : reason => {
            throw reason
          }

    // 为了链式调用这里直接创建一个 MyPromise，并在后面 return 出去
    const retPromise = new MyPromise((resolve, reject) => {
      const fulfilledMicrotask = () => {
        queueMicrotask(() => {
          try {
            const returnData = realOnFulfilled(this.value)
            resolvePromise(retPromise, returnData, resolve, reject)
          } catch (error) {
            reject(error)
          }
        })
      }

      const rejectedMicrotask = () => {
        queueMicrotask(() => {
          try {
            // 调用失败回调后，将返回值传递给下一个 then
            const returnData = realOnRejected(this.reason)
            resolvePromise(retPromise, returnData, resolve, reject)
          } catch (error) {
            reject(error)
          }
        })
      }

      if (this.status === FULFILLED) {
        fulfilledMicrotask()
      } else if (this.status === REJECTED) {
        rejectedMicrotask()
      } else if (this.status === PENDING) {
        // 因为不知道后面状态的变化情况，所以将成功回调和失败回调存储起来
        this.onFulfilledCallbacks.push(fulfilledMicrotask)
        this.onRejectedCallbacks.push(rejectedMicrotask)
      }
    })

    return retPromise
  }

  // resolve 静态方法
  static resolve(parameter) {
    // 如果传入 MyPromise 就直接返回
    if (parameter instanceof MyPromise) {
      return parameter
    }

    return new MyPromise(resolve => resolve(parameter))
  }

  // reject 静态方法
  static reject(reason) {
    return new MyPromise((resolve, reject) => reject(reason))
  }
}

function resolvePromise(retPromise, returnData, resolve, reject) {
  // 如果相等了，说明 return 的是自己，抛出类型错误并返回
  if (retPromise === returnData) {
    return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
  }

  if (typeof returnData === 'object' || typeof returnData === 'function') {
    // returnData 为 null 直接返回，走后面的逻辑会报错
    if (returnData === null) {
      return resolve(returnData)
    }

    let then
    try {
      // 把 returnData.then 赋值给 then
      then = returnData.then
    } catch (error) {
      // 如果取 returnData.then 的值时抛出错误 error ，则以 error 为据因拒绝 promise
      return reject(error)
    }

    // 如果 then 是函数
    if (typeof then === 'function') {
      let called = false
      try {
        then.call(
          returnData, // this 指向 returnData
          // 如果 resolvePromise 以值 x 为参数被调用，则运行 [[Resolve]](promise, x)
          x => {
            // 如果 resolvePromise 和 rejectPromise 均被调用，
            // 或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
            // 实现这条需要前面加一个变量 called
            if (called) return
            called = true
            resolvePromise(retPromise, x, resolve, reject)
          },
          // 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
          r => {
            if (called) return
            called = true
            reject(r)
          }
        )
      } catch (error) {
        // 如果调用 then 方法抛出了异常 error：
        // 如果 resolvePromise 或 rejectPromise 已经被调用，直接返回
        if (called) return

        // 否则以 error 为据因拒绝 promise
        reject(error)
      }
    } else {
      // 如果 then 不是函数，以 returnData 为参数执行 promise
      resolve(returnData)
    }
  } else {
    // 如果 returnData 不为对象或者函数
    resolve(returnData)
  }
}

MyPromise.deferred = function () {
  var result = {}
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve
    result.reject = reject
  })

  return result
}

module.exports = MyPromise
