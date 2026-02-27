function getAppUser() {
  const app = getApp()
  return app?.globalData?.user || null
}

function getEffectiveRole(user) {
  return user?.activeRole || user?.role || 'student'
}

function isTeacher(user) {
  const role = getEffectiveRole(user)
  return role === 'teacher' || role === 'admin'
}

function isAdmin(user) {
  const role = getEffectiveRole(user)
  return role === 'admin'
}

module.exports = {
  getAppUser,
  getEffectiveRole,
  isTeacher,
  isAdmin
}
