App({
  globalData: {
    user: null,
    envId: wx.cloud.DYNAMIC_CURRENT_ENV,
    adminProfiles: [
      { phone: '17611681866', name: '系统管理员' },
      { phone: '13900000000', name: '备用管理员' }
    ]
  },

  resolveActiveRole(user) {
    if (!user) return 'student'
    const fromCache = wx.getStorageSync('activeRole')
    if (user.role === 'admin') {
      const allow = ['student', 'teacher', 'admin']
      return allow.includes(fromCache) ? fromCache : 'admin'
    }
    return user.role || 'student'
  },

  async onLaunch() {
    if (!wx.cloud) {
      wx.showModal({
        title: '提示',
        content: '请使用 2.2.3 以上基础库以支持云开发',
        showCancel: false
      })
      return
    }

    wx.cloud.init({
      env: this.globalData.envId,
      traceUser: true
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'core',
        data: { action: 'login' }
      })
      const user = res.result?.data || null
      if (user) {
        user.activeRole = this.resolveActiveRole(user)
      }
      this.globalData.user = user
    } catch (error) {
      console.error('登录初始化失败', error)
    }
  }
})
