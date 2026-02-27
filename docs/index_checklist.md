# 数据库索引清单（建议）

以下索引用于提高查询性能并支撑权限过滤。

## users

- `openid`（唯一）
- `phone`
- `role`

## teacher_applications

- `applicantOpenid`
- 复合索引：`status + createdAt`
- `reviewedBy`

## assignments

- `creatorOpenid`
- `createdAt`
- `courseId`

## submissions

- 复合索引：`assignmentId + openid`
- `createdAt`
- `status`

## attendance

- `openid`
- `createdAt`

## materials

- `openid`
- `createdAt`

## trips

- `openid`

## credits

- `openid`

## audit_logs

- `operatorOpenid`
- 复合索引：`action + createdAt`
- `createdAt`

## 说明

- 生产环境建议对 `openid`、`phone`、`assignmentId` 等高频过滤字段优先建索引。
- 复合索引顺序遵循“先等值过滤，再排序字段”的原则。
