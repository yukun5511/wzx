const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const COLLECTION = {
  USERS: 'users',
  TEACHER_APPLICATIONS: 'teacher_applications',
  AUDIT_LOGS: 'audit_logs',
  TRIPS: 'trips',
  MATERIALS: 'materials',
  CREDITS: 'credits',
  ASSIGNMENTS: 'assignments',
  SUBMISSIONS: 'submissions',
  ATTENDANCE: 'attendance',
  COURSE_CONTENT: 'course_content'
}

function ok(data = null, message = 'ok') {
  return { success: true, message, data }
}

function fail(message = 'fail') {
  return { success: false, message }
}

function nowText() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

async function writeAuditLog(operatorOpenid, action, detail = {}) {
  try {
    await db.collection(COLLECTION.AUDIT_LOGS).add({
      data: {
        operatorOpenid,
        action,
        detail,
        createdAt: nowText()
      }
    })
  } catch (error) {
    console.warn('writeAuditLog failed:', error.message)
  }
}

async function getOrCreateUser(openid) {
  const userRes = await db.collection(COLLECTION.USERS).where({ openid }).limit(1).get()
  if (userRes.data.length) return userRes.data[0]

  const user = {
    openid,
    role: 'student',
    phone: '',
    phoneBound: false,
    nickName: '',
    createdAt: nowText()
  }
  await db.collection(COLLECTION.USERS).add({ data: user })
  return user
}

function assertTeacher(user) {
  return user && (user.role === 'teacher' || user.role === 'admin')
}

function assertAdmin(user) {
  return user && user.role === 'admin'
}

async function login(openid) {
  const user = await getOrCreateUser(openid)
  return ok(user)
}

async function bindPhoneRole(openid, code, adminPhones = []) {
  if (!code) return fail('缺少手机号授权 code')

  const phoneRes = await cloud.openapi.phonenumber.getPhoneNumber({ code })
  const phone = phoneRes?.phoneInfo?.purePhoneNumber || ''
  if (!phone) return fail('获取手机号失败')

  return bindPhoneRoleByValue(openid, phone, adminPhones)
}

async function bindPhoneRoleByValue(openid, phone, adminPhones = []) {
  if (!phone) return fail('手机号不能为空')
  if (!/^1\d{10}$/.test(phone)) return fail('手机号格式不正确')

  const user = await getOrCreateUser(openid)
  let nextRole = user.role || 'student'
  if (adminPhones.includes(phone)) {
    nextRole = 'admin'
  } else if (nextRole !== 'teacher' && nextRole !== 'admin') {
    nextRole = 'student'
  }

  const userRes = await db.collection(COLLECTION.USERS).where({ openid }).limit(1).get()
  if (userRes.data.length) {
    await db.collection(COLLECTION.USERS).doc(userRes.data[0]._id).update({
      data: {
        phone,
        phoneBound: true,
        role: nextRole,
        updatedAt: nowText()
      }
    })
  }

  const latest = await getOrCreateUser(openid)
  await writeAuditLog(openid, 'bind_phone_role', {
    role: latest.role,
    phoneBound: latest.phoneBound
  })
  return ok(latest, '手机号绑定成功')
}

async function bindPhoneRoleManual(openid, phone, adminPhones = []) {
  return bindPhoneRoleByValue(openid, phone, adminPhones)
}

async function submitTeacherApplication(openid, reason) {
  const user = await getOrCreateUser(openid)
  if (!user.phoneBound) return fail('请先完成手机号绑定')
  if (user.role !== 'student') return fail('当前角色无需申请')

  const existing = await db.collection(COLLECTION.TEACHER_APPLICATIONS)
    .where({ applicantOpenid: openid, status: 'pending' })
    .limit(1)
    .get()

  if (existing.data.length) return fail('你已有待审批申请')

  await db.collection(COLLECTION.TEACHER_APPLICATIONS).add({
    data: {
      applicantOpenid: openid,
      applicantPhone: user.phone || '',
      reason: reason || '',
      status: 'pending',
      createdAt: nowText(),
      updatedAt: nowText()
    }
  })
  await writeAuditLog(openid, 'submit_teacher_application', { reason: reason || '' })
  return ok(true, '申请已提交')
}

async function getMyTeacherApplication(openid) {
  const res = await db.collection(COLLECTION.TEACHER_APPLICATIONS)
    .where({ applicantOpenid: openid })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return ok(res.data[0] || null)
}

async function listTeacherApplications(user) {
  if (!assertAdmin(user)) return fail('无权限')
  const res = await db.collection(COLLECTION.TEACHER_APPLICATIONS)
    .where({ status: 'pending' })
    .orderBy('createdAt', 'desc')
    .get()
  return ok(res.data || [])
}

async function reviewTeacherApplication(user, applicationId, pass, remark) {
  if (!assertAdmin(user)) return fail('无权限')
  if (!applicationId) return fail('缺少申请ID')

  const appRes = await db.collection(COLLECTION.TEACHER_APPLICATIONS).doc(applicationId).get()
  const appData = appRes.data
  if (!appData) return fail('申请不存在')
  if (appData.status !== 'pending') return fail('该申请已处理')

  const status = pass ? 'approved' : 'rejected'
  await db.collection(COLLECTION.TEACHER_APPLICATIONS).doc(applicationId).update({
    data: {
      status,
      reviewRemark: remark || '',
      reviewedBy: user.openid,
      reviewedAt: nowText(),
      updatedAt: nowText()
    }
  })

  if (pass) {
    const targetUserRes = await db.collection(COLLECTION.USERS)
      .where({ openid: appData.applicantOpenid })
      .limit(1)
      .get()
    if (targetUserRes.data.length) {
      await db.collection(COLLECTION.USERS).doc(targetUserRes.data[0]._id).update({
        data: {
          role: 'teacher',
          updatedAt: nowText()
        }
      })
    }
  }
  await writeAuditLog(user.openid, 'review_teacher_application', {
    applicationId,
    applicantOpenid: appData.applicantOpenid,
    pass: !!pass,
    remark: remark || ''
  })
  return ok(true, pass ? '已通过' : '已拒绝')
}

async function saveTrip(openid, payload) {
  const data = {
    ...payload,
    openid,
    updatedAt: nowText()
  }

  const existing = await db.collection(COLLECTION.TRIPS).where({ openid }).limit(1).get()
  if (existing.data.length) {
    await db.collection(COLLECTION.TRIPS).doc(existing.data[0]._id).update({ data })
  } else {
    await db.collection(COLLECTION.TRIPS).add({ data: { ...data, createdAt: nowText() } })
  }
  return ok(true, '保存成功')
}

async function getMyTrip(openid) {
  const res = await db.collection(COLLECTION.TRIPS).where({ openid }).limit(1).get()
  return ok(res.data[0] || null)
}

async function saveMaterial(openid, fileName, fileID) {
  await db.collection(COLLECTION.MATERIALS).add({
    data: {
      openid,
      fileName,
      fileID,
      createdAt: nowText()
    }
  })
  return ok(true, '上传记录已保存')
}

async function listMaterials(openid, user) {
  const query = assertAdmin(user) ? {} : { openid }
  const res = await db.collection(COLLECTION.MATERIALS).where(query).orderBy('createdAt', 'desc').get()
  return ok(res.data)
}

async function getMyCredits(openid) {
  const res = await db.collection(COLLECTION.CREDITS).where({ openid }).limit(1).get()
  if (res.data.length) return ok(res.data[0])

  const initData = { openid, points: 0, credits: 0, updatedAt: nowText() }
  await db.collection(COLLECTION.CREDITS).add({ data: initData })
  return ok(initData)
}

async function getCourseInfo() {
  const res = await db.collection(COLLECTION.COURSE_CONTENT).limit(1).get()
  if (res.data.length) return ok(res.data[0])

  return ok({
    schedule: '第1天：报到签到；第2天：课程学习；第3天：成果汇报',
    rules: '请按时签到、按要求提交作业、遵守课堂纪律。',
    tips: '请提前规划出行，准备好个人证件与学习资料。'
  })
}

async function updateCourseInfo(user, payload) {
  if (!assertTeacher(user)) return fail('无权限')

  const res = await db.collection(COLLECTION.COURSE_CONTENT).limit(1).get()
  const data = {
    schedule: payload.schedule || '',
    rules: payload.rules || '',
    tips: payload.tips || '',
    updatedAt: nowText()
  }

  if (res.data.length) {
    await db.collection(COLLECTION.COURSE_CONTENT).doc(res.data[0]._id).update({ data })
  } else {
    await db.collection(COLLECTION.COURSE_CONTENT).add({ data: { ...data, createdAt: nowText() } })
  }
  return ok(true, '更新成功')
}

async function listAssignments(openid) {
  const assignmentRes = await db.collection(COLLECTION.ASSIGNMENTS).orderBy('createdAt', 'desc').get()
  const list = assignmentRes.data || []
  if (!list.length) return ok([])

  const ids = list.map(item => item._id)
  const mySubsRes = await db.collection(COLLECTION.SUBMISSIONS)
    .where({ openid, assignmentId: _.in(ids) })
    .get()

  const subMap = {}
  mySubsRes.data.forEach(sub => { subMap[sub.assignmentId] = sub })

  return ok(list.map(item => ({
    ...item,
    mySubmission: subMap[item._id] || {}
  })))
}

async function publishAssignment(user, payload) {
  if (!assertTeacher(user)) return fail('无权限')
  await db.collection(COLLECTION.ASSIGNMENTS).add({
    data: {
      title: payload.title,
      content: payload.content,
      deadline: payload.deadline,
      creatorOpenid: user.openid,
      courseId: payload.courseId || `course-${user.openid}`,
      createdAt: nowText()
    }
  })
  await writeAuditLog(user.openid, 'publish_assignment', {
    title: payload.title || '',
    courseId: payload.courseId || `course-${user.openid}`
  })
  return ok(true, '发布成功')
}

async function submitAssignment(openid, assignmentId, fileName, fileID) {
  const assignmentRes = await db.collection(COLLECTION.ASSIGNMENTS).doc(assignmentId).get()
  if (!assignmentRes.data) return fail('作业不存在')

  const data = {
    openid,
    assignmentId,
    fileName,
    fileID,
    status: '已提交',
    updatedAt: nowText()
  }

  const exists = await db.collection(COLLECTION.SUBMISSIONS)
    .where({ openid, assignmentId })
    .limit(1)
    .get()

  if (exists.data.length) {
    await db.collection(COLLECTION.SUBMISSIONS).doc(exists.data[0]._id).update({ data })
  } else {
    await db.collection(COLLECTION.SUBMISSIONS).add({ data: { ...data, createdAt: nowText() } })
  }

  return ok(true, '提交成功')
}

async function listAllSubmissions(user) {
  if (!assertTeacher(user)) return fail('无权限')

  let assignments = []
  if (assertAdmin(user)) {
    const assignmentRes = await db.collection(COLLECTION.ASSIGNMENTS).get()
    assignments = assignmentRes.data || []
  } else {
    const assignmentRes = await db.collection(COLLECTION.ASSIGNMENTS)
      .where({ creatorOpenid: user.openid })
      .get()
    assignments = assignmentRes.data || []
  }

  if (!assignments.length) return ok([])

  const assignmentIds = assignments.map(item => item._id)
  const subRes = await db.collection(COLLECTION.SUBMISSIONS)
    .where({ assignmentId: _.in(assignmentIds) })
    .orderBy('createdAt', 'desc')
    .get()

  const map = {}
  assignments.forEach(item => { map[item._id] = item.title })

  return ok((subRes.data || []).map(item => ({
    ...item,
    studentOpenid: item.openid,
    assignmentTitle: map[item.assignmentId] || '未知作业'
  })))
}

async function gradeAssignment(user, submissionId, score, comment) {
  if (!assertTeacher(user)) return fail('无权限')

  const submissionRes = await db.collection(COLLECTION.SUBMISSIONS).doc(submissionId).get()
  const submission = submissionRes.data
  if (!submission) return fail('提交记录不存在')

  if (!assertAdmin(user)) {
    const assignmentRes = await db.collection(COLLECTION.ASSIGNMENTS).doc(submission.assignmentId).get()
    const assignment = assignmentRes.data
    if (!assignment || assignment.creatorOpenid !== user.openid) {
      return fail('无权限批改该作业')
    }
  }

  await db.collection(COLLECTION.SUBMISSIONS).doc(submissionId).update({
    data: {
      score,
      comment,
      status: '已批改',
      gradedBy: user.openid,
      gradedAt: nowText()
    }
  })
  await writeAuditLog(user.openid, 'grade_assignment', {
    submissionId,
    score
  })
  return ok(true, '批改成功')
}

async function getMyAttendance(openid) {
  const res = await db.collection(COLLECTION.ATTENDANCE)
    .where({ openid })
    .orderBy('createdAt', 'desc')
    .get()
  return ok(res.data || [])
}

async function listAllAttendance(user) {
  if (!assertAdmin(user)) return fail('仅管理员可查看全量签到记录')
  const res = await db.collection(COLLECTION.ATTENDANCE)
    .orderBy('createdAt', 'desc')
    .get()
  return ok(res.data || [])
}

async function signIn(openid, method, latitude, longitude, code) {
  if (method === 'qrcode' && !code) return fail('签到码不能为空')

  await db.collection(COLLECTION.ATTENDANCE).add({
    data: {
      openid,
      method,
      latitude: latitude || null,
      longitude: longitude || null,
      code: code || '',
      address: method === 'location' ? `lat:${latitude},lng:${longitude}` : '',
      courseName: '课程活动',
      createdAt: nowText()
    }
  })

  return ok(true, '签到成功')
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const user = await getOrCreateUser(OPENID)
  const { action } = event

  try {
    switch (action) {
      case 'login':
        return login(OPENID)
      case 'bindPhoneRole':
        return bindPhoneRole(OPENID, event.code, event.adminPhones || [])
      case 'bindPhoneRoleManual':
        return bindPhoneRoleManual(OPENID, event.phone, event.adminPhones || [])
      case 'submitTeacherApplication':
        return submitTeacherApplication(OPENID, event.reason)
      case 'getMyTeacherApplication':
        return getMyTeacherApplication(OPENID)
      case 'listTeacherApplications':
        return listTeacherApplications(user)
      case 'reviewTeacherApplication':
        return reviewTeacherApplication(user, event.applicationId, event.pass, event.remark)
      case 'saveTrip':
        return saveTrip(OPENID, event.payload || {})
      case 'getMyTrip':
        return getMyTrip(OPENID)
      case 'saveMaterial':
        return saveMaterial(OPENID, event.fileName, event.fileID)
      case 'listMaterials':
        return listMaterials(OPENID, user)
      case 'getMyCredits':
        return getMyCredits(OPENID)
      case 'getCourseInfo':
        return getCourseInfo()
      case 'updateCourseInfo':
        return updateCourseInfo(user, event.payload || {})
      case 'listAssignments':
        return listAssignments(OPENID)
      case 'publishAssignment':
        return publishAssignment(user, event.payload || {})
      case 'submitAssignment':
        return submitAssignment(OPENID, event.assignmentId, event.fileName, event.fileID)
      case 'listAllSubmissions':
        return listAllSubmissions(user)
      case 'gradeAssignment':
        return gradeAssignment(user, event.submissionId, event.score, event.comment)
      case 'getMyAttendance':
        return getMyAttendance(OPENID)
      case 'listAllAttendance':
        return listAllAttendance(user)
      case 'signIn':
        return signIn(OPENID, event.method, event.latitude, event.longitude, event.code)
      default:
        return fail('未知 action')
    }
  } catch (error) {
    console.error(error)
    return fail(error.message || '服务异常')
  }
}
