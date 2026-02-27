const { callApi } = require('../../utils/request')

Page({
  data: {
    showPhoneAuthPopup: false,
    manualPhone: '',
    binding: false,
    bindError: '',
    menus: [
      { title: '行程收集', desc: '填写参课意向、房型、到达时间和交通信息', path: '/pages/trip/trip' },
      { title: '资料存档', desc: '上传 Word 文档并进行课程资料归档', path: '/pages/materials/materials' },
      { title: '积分/学分', desc: '查询个人累计积分与学分', path: '/pages/credits/credits' },
      { title: '个人考勤', desc: '查看历史出勤记录', path: '/pages/attendance/attendance' }
    ]
  },

  async onShow() {
    let user = getApp().globalData.user || {}
    try {
      const res = await callApi('login')
      user = res.success ? (res.data || user) : user
      if (res && res.success === false) {
        this.setData({ bindError: `云函数返回：${res.message || '未知错误'}` })
      }
    } catch (error) {
      console.error('首页登录态刷新失败', error)
      this.setData({ bindError: `调用失败：${error.errMsg || error.message || '未知错误'}` })
    }

    getApp().globalData.user = user
    const phoneBound = !!user.phoneBound
    this.setData({ showPhoneAuthPopup: !phoneBound, bindError: '' })
  },

  onCloseAuthPopup() {
    wx.showToast({ icon: 'none', title: '请先绑定手机号后使用' })
  },

  onManualPhoneInput(e) {
    this.setData({
      manualPhone: (e.detail.value || '').trim(),
      bindError: ''
    })
  },

  async onManualBindPhone() {
    if (this.data.binding) return

    const phone = this.data.manualPhone
    if (!/^1\d{10}$/.test(phone)) {
      this.setData({ bindError: '请输入正确的11位手机号' })
      return
    }

    this.setData({ binding: true, bindError: '' })

    try {
      const app = getApp()
      const res = await callApi('bindPhoneRoleManual', {
        phone,
        adminPhones: (app.globalData.adminProfiles || []).map(item => item.phone)
      })

      if (!res || !res.success) {
        this.setData({ bindError: `绑定失败：${res?.message || '未知错误'}` })
        return
      }

      const user = { ...res.data }
      if (user.role === 'admin') {
        user.activeRole = 'admin'
        wx.setStorageSync('activeRole', 'admin')
      } else {
        user.activeRole = user.role || 'student'
        wx.setStorageSync('activeRole', user.activeRole)
      }

      app.globalData.user = user
      this.setData({ showPhoneAuthPopup: false, bindError: '' })
      wx.showToast({ title: '手机号绑定成功' })
    } catch (error) {
      console.error('手动绑定手机号失败', error)
      this.setData({ bindError: `调用失败：${error.errMsg || error.message || '网络异常'}` })
    } finally {
      this.setData({ binding: false })
    }
  },

  go(e) {
    if (this.data.showPhoneAuthPopup) {
      wx.showToast({ icon: 'none', title: '请先完成手机号绑定' })
      return
    }
    const { path } = e.currentTarget.dataset
    wx.navigateTo({ url: path })
  }
})
