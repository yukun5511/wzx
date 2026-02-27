const { callApi } = require('../../utils/request')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    qrCode: ''
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return
  },

  onCodeInput(e) {
    this.setData({ qrCode: e.detail.value })
  },

  signByLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: async (res) => {
        const result = await callApi('signIn', {
          method: 'location',
          latitude: res.latitude,
          longitude: res.longitude
        })
        if (result.success) {
          wx.showToast({ title: '签到成功' })
        } else {
          wx.showToast({ icon: 'none', title: result.message || '签到失败' })
        }
      },
      fail: () => wx.showToast({ icon: 'none', title: '定位失败' })
    })
  },

  async signByCode() {
    if (!this.data.qrCode) {
      wx.showToast({ icon: 'none', title: '请输入签到码' })
      return
    }
    const result = await callApi('signIn', {
      method: 'qrcode',
      code: this.data.qrCode
    })
    if (result.success) {
      wx.showToast({ title: '签到成功' })
      return
    }
    wx.showToast({ icon: 'none', title: result.message || '签到失败' })
  }
})
