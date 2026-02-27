const { callApi } = require('../../utils/request')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    roomTypes: ['单人间', '双人间', '标准间'],
    transports: ['高铁', '飞机', '自驾', '其他'],
    roomTypeIndex: 0,
    transportIndex: 0,
    form: {
      participate: true,
      roomCount: '1',
      roomType: '单人间',
      arrivalTime: '',
      transportType: '高铁',
      transportNo: ''
    }
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return
    const res = await callApi('getMyTrip')
    if (res.success && res.data) {
      const roomTypeIndex = this.data.roomTypes.indexOf(res.data.roomType)
      const transportIndex = this.data.transports.indexOf(res.data.transportType)
      this.setData({
        form: res.data,
        roomTypeIndex: roomTypeIndex >= 0 ? roomTypeIndex : 0,
        transportIndex: transportIndex >= 0 ? transportIndex : 0
      })
    }
  },

  onParticipateChange(e) {
    this.setData({ 'form.participate': e.detail.value })
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value })
  },

  onRoomTypeChange(e) {
    const index = Number(e.detail.value)
    this.setData({
      roomTypeIndex: index,
      'form.roomType': this.data.roomTypes[index]
    })
  },

  onTransportChange(e) {
    const index = Number(e.detail.value)
    this.setData({
      transportIndex: index,
      'form.transportType': this.data.transports[index]
    })
  },

  async submit() {
    const res = await callApi('saveTrip', { payload: this.data.form })
    if (res.success) {
      wx.showToast({ title: '保存成功' })
      return
    }
    wx.showToast({ icon: 'none', title: res.message || '保存失败' })
  }
})
