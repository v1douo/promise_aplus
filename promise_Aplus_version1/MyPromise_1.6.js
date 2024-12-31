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
    // 为了链式调用这里直接创建一个 MyPromise，并在后面 return 出去
    const retPromise = new MyPromise((resolve, reject) => {
      if (this.status === FULFILLED) {
        queueMicrotask(() => {
          try {
            const returnData = onFulfilled(this.value)
            resolvePromise(retPromise, returnData, resolve, reject)
          } catch (error) {
            reject(error)
          }
        })
      } else if (this.status === REJECTED) {
        queueMicrotask(() => {
          try {
            // 调用失败回调后，将返回值传递给下一个 then
            const returnData = onRejected(this.reason)
            resolvePromise(retPromise, returnData, resolve, reject)
          } catch (error) {
            reject(error)
          }
        })
      } else if (this.status === PENDING) {
        // 因为不知道后面状态的变化情况，所以将成功回调和失败回调存储起来
        this.onFulfilledCallbacks.push(() => {
          // 确保执行顺序,在 resolve 后,执行回调数组中的方法,将回调任务放入微任务队列中
          queueMicrotask(() => {
            // pending 结束后执行成功回调,如果过程中抛出错误,也需要 reject,保证下一个 then 的第二个回调执行
            try {
              const returnData = onFulfilled(this.value)
              // pending 结束后也需要返回一个 promise,所以需要传入 resolve 和 reject
              resolvePromise(retPromise, returnData, resolve, reject)
            } catch (error) {
              reject(error)
            }
          })
        })
        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const returnData = onRejected(this.reason)
              resolvePromise(retPromise, returnData, resolve, reject)
            } catch (error) {
              reject(error)
            }
          })
        })
      }
    })
    return retPromise
  }
}

function resolvePromise(retPromise, returnData, resolve, reject) {
  // 如果相等了，说明 return 的是自己，抛出类型错误并返回
  if (retPromise === returnData) {
    return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
  }
  // 如果是 MyPromise 实例对象
  if (returnData instanceof MyPromise) {
    // 调用实例的 then 方法的本质其实就是状态传递，等待 returnData 执行完毕
    returnData.then(resolve, reject)
  } else {
    resolve(returnData)
  }
}

module.exports = MyPromise

// 下面实现 then 方法两个回调函数的选择性传递,不传递也不会影响执行。
