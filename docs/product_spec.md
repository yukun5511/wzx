# 课程管理助手 Product Spec（V1）

## 1. 文档目的

本规范用于统一产品、研发、测试和后续维护的口径。后续功能迭代、缺陷修复、权限调整均应以本规范为基线。

---

## 2. 产品定位

- 产品名称：课程管理助手小程序
- 目标平台：微信小程序（原生）
- 目标用户：学生（主）、老师、管理员
- 核心目标：围绕课程活动完成“身份识别、信息采集、签到考勤、作业管理、角色审批”闭环。

---

## 3. 角色模型

### 3.1 真实角色（server-side role）

- `student`：学生
- `teacher`：老师
- `admin`：管理员

真实角色保存在 `users.role`，由云函数控制。

### 3.2 生效身份（client activeRole）

- 管理员支持在客户端切换生效身份：`student / teacher / admin`
- 非管理员生效身份固定等于真实角色
- 生效身份仅影响前端视图与入口展示，后端权限判断始终以真实角色为准

### 3.3 关键规则

- 仅真实角色为 `admin` 的账号允许切换身份
- 管理员切到老师/学生后，仍必须保留“可切回”入口
- 所有管理动作（审批、发布、批改、全量查询）必须在云函数再次鉴权

---

## 4. 登录与绑定流程

1. 用户进入小程序
2. 前端调用 `core/login`
3. 若 `phoneBound=false`，强制显示手机号绑定弹层，未绑定不得进入业务页面
4. 用户手动输入手机号并调用 `bindPhoneRoleManual`
5. 云函数按手机号匹配管理员名单（来自前端传入 `adminPhones`）
6. 绑定成功后写入 `users.phone`、`users.phoneBound`、`users.role`

> 说明：当前版本采用手动手机号输入，不依赖 `getPhoneNumber`。

---

## 5. 功能范围（V1）

### 5.0 菜单信息架构（底部 Tab）

- 首页：业务总览与快捷入口
- 课程：课程安排/规则/提示展示
- 作业：作业查看与提交
- 管理：按生效身份展示老师申请、审批、老师工作台入口
- 我的：账户信息、身份切换、个人功能快捷入口

### 5.1 学生端

- 行程收集：是否参课、房间数量/房型、到达时间、交通信息
- 资料存档：上传 Word 文档并入库
- 积分/学分查询
- 作业提交与结果查看
- 现场签到（定位/口令）
- 个人考勤查看

### 5.2 老师端

- 课程内容维护（安排、规则、提示）
- 发布作业
- 批改作业（仅自己可管理范围）

### 5.3 管理员端

- 老师申请审批（通过/拒绝）
- 身份切换（student/teacher/admin）
- 全量签到记录查看

> 交互约束：老师申请与管理员审批必须在“管理”菜单中呈现，不放在“我的”页业务区。

---

## 6. 权限矩阵（后端口径）

- 学生：仅可读写自己的数据
- 老师：可管理教师动作；作业批改范围受限于自己发布的作业
- 管理员：具备老师能力 + 审批能力 + 全量签到查询

---

## 7. 数据模型（云数据库集合）

- `users`
- `teacher_applications`
- `audit_logs`
- `trips`
- `materials`
- `credits`
- `assignments`
- `submissions`
- `attendance`
- `course_content`

索引方案参考：`docs/index_checklist.md`

---

## 8. 云函数 API（core/action）

### 8.1 账户与角色

- `login`
- `bindPhoneRoleManual`
- `submitTeacherApplication`
- `getMyTeacherApplication`
- `listTeacherApplications`
- `reviewTeacherApplication`

### 8.2 业务能力

- `saveTrip` / `getMyTrip`
- `saveMaterial` / `listMaterials`
- `getMyCredits`
- `getCourseInfo` / `updateCourseInfo`
- `listAssignments` / `publishAssignment` / `submitAssignment`
- `listAllSubmissions` / `gradeAssignment`
- `getMyAttendance` / `listAllAttendance`
- `signIn`

---

## 9. UI/交互规范（当前约束）

- 主视觉采用飞书风格轻量蓝系
- 首次绑定弹层主按钮必须可见且固定在操作区
- 管理员身份切换使用“我的”页顶部工具条，不使用遮挡式悬浮按钮
- 关键错误必须给出可诊断信息（例如集合不存在、云函数调用失败）

---

## 10. 运维与发布规范

- 所有环境变更需确认 `envId` 与当前云环境一致
- 每次后端改动必须重新部署 `cloudfunctions/core`
- 新增集合后需同步更新 `docs/database_init.md`
- 提交上线前至少验证：绑定手机号、角色切换、老师审批、作业提交流程

---

## 11. 变更管理（后续维护要求）

后续迭代必须遵循：

1. 先更新本规范（本文件）再改代码
2. 若改动角色或权限，必须更新“权限矩阵”和“云函数 API”章节
3. 若新增集合或索引，必须更新 `docs/database_init.md` 与 `docs/index_checklist.md`
4. 所有权限相关改动必须同时包含前端显示控制与后端鉴权

---

## 12. 当前版本标记

- Spec Version: `v1.0`
- Last Updated: `2026-02-27`
