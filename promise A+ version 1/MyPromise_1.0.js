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

  status = PENDING // 储存状态
  value = null // 成功之后的值
  reason = null // 失败之后的原因

  // 更改成功后的状态
  resolve = value => {
    // 只有状态是等待，才执行状态修改
    if (this.status === PENDING) {
      this.status = FULFILLED
      this.value = value // 保存成功之后的值
    }
  }

  // 更改失败后的状态
  reject = reason => {
    // 只有状态是等待，才执行状态修改
    if (this.status === PENDING) {
      this.status = REJECTED
      this.reason = reason // 保存失败后的原因
    }
  }

  then(onFulfilled, onRejected) {
    // 判断状态
    if (this.status === FULFILLED) {
      // 调用成功回调，并且把值返回
      onFulfilled(this.value)
    } else if (this.status === REJECTED) {
      // 调用失败回调，并且把原因返回
      onRejected(this.reason)
    }
  }
}

module.exports = MyPromise

// 测试
const promise = new MyPromise((resolve, reject) => {
  resolve('success')
  reject('err')
})

promise.then(
  value => {
    console.log('resolve', value)
  },
  reason => {
    console.log('reject', reason)
  }
)

// 执行结果：resolve success
