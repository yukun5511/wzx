const { callApi } = require('../../utils/request')
const { isTeacher, isAdmin } = require('../../utils/auth')
const { ensurePhoneBound } = require('../../utils/guard')

Page({
  data: {
    isTeacher: false,
    isAdmin: false,
    courseForm: {
      schedule: '',
      rules: '',
      tips: ''
    },
    publish: {
      title: '',
      content: '',
      deadline: ''
    },
    submissions: [],
    attendanceList: []
  },

  async onShow() {
    const gate = await ensurePhoneBound()
    if (!gate.ok) return
    const user = getApp().globalData.user || {}
    const teacher = isTeacher(user)
    const admin = isAdmin(user)
    this.setData({ isTeacher: teacher, isAdmin: admin })
    if (teacher) {
      this.loadCourseInfo()
      this.loadSubmissions()
      if (admin) {
        this.loadAttendance()
      }
    }
  },

  onCourseInput(e) {
    this.setData({ [`courseForm.${e.currentTarget.dataset.key}`]: e.detail.value })
  },

  async loadCourseInfo() {
    const res = await callApi('getCourseInfo')
    if (res.success && res.data) {
      this.setData({
        courseForm: {
          schedule: res.data.schedule || '',
          rules: res.data.rules || '',
          tips: res.data.tips || ''
        }
      })
    }
  },

  async saveCourseInfo() {
    const res = await callApi('updateCourseInfo', { payload: this.data.courseForm })
    if (res.success) {
      wx.showToast({ title: '已保存' })
      return
    }
    wx.showToast({ icon: 'none', title: res.message || '保存失败' })
  },

  onPublishInput(e) {
    this.setData({ [`publish.${e.currentTarget.dataset.key}`]: e.detail.value })
  },

  async publishAssignment() {
    const res = await callApi('publishAssignment', { payload: this.data.publish })
    if (res.success) {
      wx.showToast({ title: '发布成功' })
      this.setData({ publish: { title: '', content: '', deadline: '' } })
      return
    }
    wx.showToast({ icon: 'none', title: res.message || '发布失败' })
  },

  async loadSubmissions() {
    const res = await callApi('listAllSubmissions')
    if (res.success) {
      this.setData({ submissions: (res.data || []).map(item => ({ ...item, tempScore: '', tempComment: '' })) })
    }
  },

  async loadAttendance() {
    const res = await callApi('listAllAttendance')
    if (res.success) {
      this.setData({ attendanceList: res.data || [] })
    }
  },

  onGradeInput(e) {
    const { index, key } = e.currentTarget.dataset
    this.setData({ [`submissions[${index}].${key}`]: e.detail.value })
  },

  async grade(e) {
    const { id, index } = e.currentTarget.dataset
    const current = this.data.submissions[index]
    const res = await callApi('gradeAssignment', {
      submissionId: id,
      score: Number(current.tempScore),
      comment: current.tempComment || ''
    })
    if (res.success) {
      wx.showToast({ title: '批改成功' })
      this.loadSubmissions()
      if (this.data.isAdmin) {
        this.loadAttendance()
      }
      return
    }
    wx.showToast({ icon: 'none', title: res.message || '批改失败' })
  }
})
