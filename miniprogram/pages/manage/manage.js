const { callApi } = require('../../utils/request')
const { isTeacher, getEffectiveRole } = require('../../utils/auth')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    user: {},
    activeRole: 'student',
    isTeacher: false,
    isAdmin: false,
    applyReason: '',
    myTeacherApplication: null,
    pendingTeacherApplications: []
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return

    await this.refreshUser()

    if (this.data.activeRole === 'student') {
      await this.loadMyTeacherApplication()
    }

    if (this.data.activeRole === 'admin') {
      await this.loadPendingTeacherApplications()
    }
  },

  async refreshUser() {
    const res = await callApi('login')
    const app = getApp()
    const user = res.success ? (res.data || {}) : (app.globalData.user || {})

    const cacheRole = wx.getStorageSync('activeRole')
    if (user.role === 'admin') {
      const allow = ['student', 'teacher', 'admin']
      user.activeRole = allow.includes(cacheRole) ? cacheRole : 'admin'
    } else {
      user.activeRole = user.role || 'student'
    }

    app.globalData.user = user

    const activeRole = getEffectiveRole(user)
    this.setData({
      user,
      activeRole,
      isTeacher: isTeacher(user),
      isAdmin: activeRole === 'admin',
      pendingTeacherApplications: activeRole === 'admin' ? this.data.pendingTeacherApplications : []
    })
  },

  onReasonInput(e) {
    this.setData({ applyReason: e.detail.value })
  },

  async submitTeacherApplication() {
    const res = await callApi('submitTeacherApplication', { reason: this.data.applyReason })
    if (!res.success) {
      wx.showToast({ icon: 'none', title: res.message || '提交失败' })
      return
    }
    wx.showToast({ title: '申请已提交' })
    this.setData({ applyReason: '' })
    this.loadMyTeacherApplication()
  },

  async loadMyTeacherApplication() {
    const res = await callApi('getMyTeacherApplication')
    if (res.success) {
      this.setData({ myTeacherApplication: res.data || null })
    }
  },

  async loadPendingTeacherApplications() {
    const res = await callApi('listTeacherApplications')
    if (res.success) {
      this.setData({ pendingTeacherApplications: res.data || [] })
    }
  },

  async reviewTeacherApplication(e) {
    const { id, pass } = e.currentTarget.dataset
    const res = await callApi('reviewTeacherApplication', {
      applicationId: id,
      pass: !!pass,
      remark: ''
    })
    if (!res.success) {
      wx.showToast({ icon: 'none', title: res.message || '处理失败' })
      return
    }
    wx.showToast({ title: pass ? '已通过' : '已拒绝' })
    this.loadPendingTeacherApplications()
  },

  goTeacherWorkbench() {
    wx.navigateTo({ url: '/pages/teacher/teacher' })
  },

  goSignIn() {
    wx.navigateTo({ url: '/pages/signin/signin' })
  }
})
