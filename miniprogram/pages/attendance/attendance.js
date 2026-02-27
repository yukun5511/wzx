const { callApi } = require('../../utils/request')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    records: []
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return
    const res = await callApi('getMyAttendance')
    if (res.success) {
      this.setData({ records: res.data || [] })
    }
  }
})
