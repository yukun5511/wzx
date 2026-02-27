const { isTeacher, getEffectiveRole } = require('../../utils/auth')
const { callApi } = require('../../utils/request')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    user: {},
    isTeacher: false,
    isAdmin: false,
    canSwitchRole: false,
    activeRole: 'student',
    needPhoneAuth: false,
    manualPhone: '',
    roleOptions: ['student', 'teacher', 'admin'],
    roleLabels: {
      student: '学生',
      teacher: '老师',
      admin: '管理员'
    },
    roleIndex: 0,
    activeRoleText: '学生'
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return
    await this.refreshUser()
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
    getApp().globalData.user = user
    const roleOptions = this.data.roleOptions
    const currentRole = getEffectiveRole(user)
    const roleIndex = roleOptions.indexOf(currentRole)
    this.setData({
      user,
      isTeacher: isTeacher(user),
      isAdmin: currentRole === 'admin',
      canSwitchRole: user.role === 'admin',
      activeRole: currentRole,
      needPhoneAuth: !user.phoneBound,
      roleIndex: roleIndex >= 0 ? roleIndex : 0,
      activeRoleText: this.data.roleLabels[currentRole] || '学生'
    })
  },

  onRoleChange(e) {
    const index = Number(e.detail.value)
    const activeRole = this.data.roleOptions[index] || 'student'
    this.applyActiveRole(activeRole, index)
  },

  applyActiveRole(activeRole, index) {
    const user = { ...this.data.user, activeRole }
    wx.setStorageSync('activeRole', activeRole)
    getApp().globalData.user = user
    this.setData({
      user,
      roleIndex: index,
      activeRoleText: this.data.roleLabels[activeRole] || '学生',
      isTeacher: isTeacher(user),
      isAdmin: activeRole === 'admin',
      canSwitchRole: user.role === 'admin',
      activeRole
    })
  },

  openRoleSwitcher() {
    if (!this.data.canSwitchRole || this.data.needPhoneAuth) {
      wx.showToast({ icon: 'none', title: '仅管理员可切换' })
      return
    }
    const options = this.data.roleOptions.map(item => this.data.roleLabels[item])
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const index = Number(res.tapIndex)
        const activeRole = this.data.roleOptions[index]
        if (!activeRole) return
        this.applyActiveRole(activeRole, index)
      }
    })
  },

  onManualPhoneInput(e) {
    this.setData({ manualPhone: (e.detail.value || '').trim() })
  },

  async onManualBindPhone() {
    const phone = this.data.manualPhone
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ icon: 'none', title: '请输入11位手机号' })
      return
    }

    const app = getApp()
    const res = await callApi('bindPhoneRoleManual', {
      phone,
      adminPhones: (app.globalData.adminProfiles || []).map(item => item.phone)
    })

    if (!res.success) {
      wx.showModal({
        title: '绑定失败',
        content: res.message || '请检查手机号与云函数配置',
        showCancel: false
      })
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
    getApp().globalData.user = user
    this.setData({
      user,
      isTeacher: isTeacher(user),
      isAdmin: user.activeRole === 'admin',
      canSwitchRole: user.role === 'admin',
      activeRole: user.activeRole,
      needPhoneAuth: !user.phoneBound,
      manualPhone: '',
      roleIndex: this.data.roleOptions.indexOf(user.activeRole),
      activeRoleText: this.data.roleLabels[user.activeRole] || '学生'
    })
    wx.showToast({ title: '绑定成功' })
  },

  go(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url })
  }
})
