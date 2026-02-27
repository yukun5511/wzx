const { callApi } = require('../../utils/request')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    list: []
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return
    this.loadAssignments()
  },

  async loadAssignments() {
    const res = await callApi('listAssignments')
    if (res.success) {
      this.setData({ list: res.data || [] })
    }
  },

  submitWork(e) {
    const assignmentId = e.currentTarget.dataset.id
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: async (res) => {
        const file = res.tempFiles[0]
        const cloudPath = `homework/${assignmentId}/${Date.now()}-${file.name}`
        wx.showLoading({ title: '提交中' })
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: file.path
          })
          const submitRes = await callApi('submitAssignment', {
            assignmentId,
            fileName: file.name,
            fileID: uploadRes.fileID
          })
          wx.hideLoading()
          if (submitRes.success) {
            wx.showToast({ title: '提交成功' })
            this.loadAssignments()
          } else {
            wx.showToast({ icon: 'none', title: submitRes.message || '提交失败' })
          }
        } catch (error) {
          wx.hideLoading()
          wx.showToast({ icon: 'none', title: '提交失败' })
          console.error(error)
        }
      }
    })
  }
})
