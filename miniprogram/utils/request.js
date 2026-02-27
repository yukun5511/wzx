function callApi(action, data = {}) {
  return wx.cloud.callFunction({
    name: 'core',
    data: {
      action,
      ...data
    }
  }).then(res => res.result)
}

module.exports = {
  callApi
}
