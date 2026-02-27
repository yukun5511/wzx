# CourseManage 交接文档（Handoff）

更新时间：2026-02-27

## 1. 当前状态总览

项目已完成微信小程序 + 云开发核心闭环，具备可运行能力。

已实现：
- 底部菜单：`首页 / 课程 / 作业 / 管理 / 我的`
- 手机号强制绑定（手动输入）
- 角色体系：`student / teacher / admin`
- 管理员支持生效身份切换（前端视图切换）
- 学生申请老师、管理员审批
- 作业发布/提交/批改
- 现场签到与考勤查询
- 管理端后台化 UI（审批列表表头化）

---

## 2. 关键约束（后续必须遵守）

- 产品基线：`docs/product_spec.md`
- Copilot 维护规则：`.github/copilot-instructions.md`
- 权限原则：
  - 真实角色以 `users.role` 为准（后端）
  - `activeRole` 仅用于前端视图
  - 管理动作必须云函数二次鉴权

---

## 3. 关键目录

- 小程序前端：`miniprogram/`
- 云函数：`cloudfunctions/core/index.js`
- 数据库初始化：`docs/database_init.md`
- 索引清单：`docs/index_checklist.md`
- 产品规范：`docs/product_spec.md`

---

## 4. 本地运行步骤（新电脑）

1. 克隆仓库并安装微信开发者工具
2. 导入项目根目录（不是 `miniprogram` 子目录）
3. 在微信开发者工具创建并选择云环境
4. 右键 `cloudfunctions/core` → 上传并部署（云端安装依赖）
5. 创建数据库集合（见 `docs/database_init.md`）
6. 编译运行

---

## 5. 数据库最小可跑集合

至少先建这 3 个可跑登录与绑定：
- `users`
- `teacher_applications`
- `audit_logs`（已做不阻断，但建议创建）

完整集合见：`docs/database_init.md`

---

## 6. 已知问题与排查

### 6.1 绑定手机号报错 `Db or Table not exist: users`
- 原因：当前云环境未创建 `users` 集合
- 处理：创建集合后重试

### 6.2 明明部署了 core 仍报云函数错误
- 原因常见为环境不一致
- 检查：
  - 当前开发工具所选环境
  - `wx.cloud.init` 的环境配置（当前用动态环境）

### 6.3 管理员切到老师后切不回
- 已修复：区分 `canSwitchRole(真实admin)` 与 `activeRole(生效身份)`

---

## 7. 当前管理员配置

在 `miniprogram/app.js` 的 `globalData.adminProfiles`：
- `17611681866`（系统管理员）
- `13900000000`（备用管理员，示例）

---

## 8. 下一步建议（优先级）

P1（建议先做）
- 管理页审批支持“批量通过/拒绝”
- 管理列表增加分页与筛选
- 绑定手机号输入增加实名校验策略

P2
- 课程维度（courseId）细化到多课程管理
- 审计日志页面化（管理员可查看）

P3
- 上线前隐私合规模块（隐私协议、数据使用声明）

---

## 9. 最近一次 Git 状态说明

- 已存在远程仓库：`https://github.com/yukun5511/wzx.git`
- 分支：`main`
- 本地如有未推送改动，请先 `git status` 后再决定是否提交推送。

---

## 10. 交接建议

新会话开始时直接告诉 Copilot：
1. 先读取 `docs/product_spec.md`
2. 再读取 `.github/copilot-instructions.md`
3. 按 `docs/handoff.md` 的优先级继续开发
