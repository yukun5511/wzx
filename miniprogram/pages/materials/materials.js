const { callApi } = require('../../utils/request')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    list: []
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return
    this.loadList()
  },

  async loadList() {
    const res = await callApi('listMaterials')
    if (res.success) {
      this.setData({ list: res.data || [] })
    }
  },

  uploadWord() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['doc', 'docx'],
      success: async (res) => {
        const file = res.tempFiles[0]
        const cloudPath = `materials/${Date.now()}-${file.name}`
        wx.showLoading({ title: '上传中' })
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: file.path
          })
          await callApi('saveMaterial', {
            fileName: file.name,
            fileID: uploadRes.fileID
          })
          wx.hideLoading()
          wx.showToast({ title: '上传成功' })
          this.loadList()
        } catch (error) {
          wx.hideLoading()
          wx.showToast({ icon: 'none', title: '上传失败' })
          console.error(error)
        }
      }
    })
  }
})
