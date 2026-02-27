const { callApi } = require('../../utils/request')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    credits: {
      points: 0,
      credits: 0
    }
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return
    const res = await callApi('getMyCredits')
    if (res.success) {
      this.setData({ credits: res.data || { points: 0, credits: 0 } })
    }
  }
})
