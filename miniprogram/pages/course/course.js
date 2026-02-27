const { callApi } = require('../../utils/request')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    course: {
      schedule: '暂无课程安排',
      rules: '暂无规则说明',
      tips: '暂无温馨提示'
    }
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return
    try {
      const res = await callApi('getCourseInfo')
      if (res.success && res.data) {
        this.setData({ course: res.data })
      }
    } catch (error) {
      console.error(error)
    }
  }
})
