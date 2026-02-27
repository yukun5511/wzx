const { callApi } = require('./request')

async function ensurePhoneBound() {
  const app = getApp()
  let user = app.globalData.user || {}

  try {
    const res = await callApi('login')
    if (res.success) {
      user = res.data || user
    }
  } catch (error) {
    console.error('校验手机号绑定失败', error)
  }

  app.globalData.user = user

  if (user.phoneBound) {
    return { ok: true, user }
  }

  wx.showToast({ icon: 'none', title: '请先绑定手机号' })
  wx.switchTab({ url: '/pages/index/index' })
  return { ok: false, user }
}

module.exports = {
  ensurePhoneBound
}
