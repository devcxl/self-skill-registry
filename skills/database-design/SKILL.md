---
name: database-design
description: Use when designing, reviewing, or optimizing MySQL database schemas — covering table structure design, fixed audit fields, status field conventions, time field type selection, unique constraints for idempotency, and index design principles with EXPLAIN guidance. Triggers: 在项目中设计、评审或优化 MySQL 表结构，需要统一固定字段、状态字段、时间字段、唯一约束与索引设计规范时。Also relevant for database schema review, SQL table creation, index optimization, database migration design, and multi-table relationship modeling.
version: 2.0.0
compatibility:
  - opencode
  - claude-code
  - codex
tags:
  - database
  - mysql
  - schema-design
  - indexing
category: utilities
metadata:
  language: cn
  license: MIT
  author: devcxl
---

# MySQL 数据库设计 Skill

本 Skill 提供可复用的 MySQL 表结构模板与设计规范，覆盖固定字段、状态字段、唯一约束、时间字段、索引设计及跨表关系建模。

参考文件：
- [`references/index-design-principles.md`](references/index-design-principles.md) — 索引设计细则与 EXPLAIN 指南
- [`references/status-field-patterns.md`](references/status-field-patterns.md) — 多语言枚举示例与状态机模式
- [`examples/multi-table-design.md`](examples/multi-table-design.md) — 订单-订单项-支付跨表设计示例

---

## 1) 通用规范

### 固定字段（所有业务表必须包含）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | bigint | 主键 ID，建议使用雪花或其他分布式 ID 方案 |
| `deleted` | tinyint | 软删标记，`0` 表示未删除，`1` 表示已删除 |
| `create_time` | timestamp(6) | 创建时间 |
| `update_time` | timestamp(6) | 更新时间 |

#### 业务唯一标识字段

- 按实体语义命名，例如 `order_id`、`payment_id`、`wallet_id`；不要把 `xx_id` 当成正式字段名
- 通常需要唯一约束，用于幂等、防重和外部系统对接
- 对外暴露 / 跨系统交互使用 `varchar(32)` ~ `varchar(64)`，内部高频关联使用 `bigint`

### 状态字段规范

- 默认使用数值型状态码（`tinyint` 优先，状态较多时用 `smallint`）
- 应用层通过枚举维护语义，不要把展示文案作为数据库核心状态值
- 如需保留外部原始状态，增加 `raw_status` / `channel_status` 字符串字段
- 字段名建议 `status` 或 `biz_status`，含义必须在注释中明确

```sql
status tinyint NOT NULL COMMENT '状态: 0-初始化, 1-处理中, 2-成功, 3-失败, 4-已取消'
```

应用层枚举示例（完整版见 [`references/status-field-patterns.md`](references/status-field-patterns.md)）：

```java
public enum OrderStatus {
    INIT(0), PROCESSING(1), SUCCESS(2), FAILED(3), CANCELLED(4);
    private final int code;
    OrderStatus(int code) { this.code = code; }
    public int getCode() { return code; }
}
```

### 软删字段规范

- `deleted` 必须 `NOT NULL DEFAULT 0`，注释明确 `0-未删除, 1-已删除`
- 审计要求较高时可增加 `delete_time` 记录删除时间

```sql
deleted tinyint NOT NULL DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除'
```

### 时间字段规范

- 业务时间字段统一使用 `timestamp(6)`（create_time, update_time, biz_time 等）
- "设置类时间"（仅表达时分秒、周期配置等）不强制使用 `timestamp(6)`，按语义选择合适类型
- 微秒精度不能替代并发控制机制——并发控制应通过唯一约束、乐观锁、事务隔离或状态机约束解决

### 唯一约束规范

- 幂等、防重、去重优先依赖数据库唯一约束兜底，不要只依赖应用层判断
- 唯一索引字段应尽量稳定，避免把高频变更字段纳入唯一键
- 多列共同组成业务唯一键时，显式设计联合唯一索引

---

## 2) 通用业务表示例

```sql
CREATE TABLE `t_order` (
  `id` bigint NOT NULL COMMENT '主键 ID',
  `order_id` varchar(64) NOT NULL COMMENT '业务订单 ID',

  `user_id` bigint NOT NULL COMMENT '用户 ID',
  `status` tinyint NOT NULL COMMENT '状态: 0-初始化, 1-处理中, 2-成功, 3-失败, 4-已取消',
  `channel_status` varchar(32) DEFAULT NULL COMMENT '渠道原始状态',
  `amount` decimal(18,2) NOT NULL COMMENT '订单金额',
  `biz_time` timestamp(6) DEFAULT NULL COMMENT '业务发生时间',

  `deleted` tinyint NOT NULL DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除',
  `create_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',

  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_order_id` (`order_id`) USING BTREE,

  KEY `idx_user_deleted_ct` (`user_id`, `deleted`, `create_time`) USING BTREE,
  KEY `idx_status_deleted_ut` (`status`, `deleted`, `update_time`) USING BTREE,
  KEY `idx_biz_time` (`biz_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

说明：
- `order_id` 是业务唯一标识，承担幂等与外部对接职责
- `status` 存状态码，`channel_status` 存渠道原始状态
- 索引仅作通用参考，最终需结合真实 SQL 与执行计划确认

---

## 3) 索引设计原则

### 基本原则

- 联合索引顺序结合 `WHERE` 等值条件、范围条件、排序字段和选择性综合设计
- 不要机械套用模板，必须结合核心 SQL 与 `EXPLAIN` 确认
- 保留 2~5 个高命中索引即可，避免写入成本过高
- `deleted` 是否放在联合索引前缀，需结合数据分布判断（选择性极低时不一定要前置）

### 常见查询模式

| 查询类型 | SQL 模式 | 推荐索引 |
|----------|----------|----------|
| 幂等/外部对接 | `WHERE order_id = ?` | `UNIQUE (order_id)` |
| 列表查询 | `WHERE user_id = ? AND deleted = 0 ORDER BY create_time DESC` | `(user_id, deleted, create_time)` |
| 状态扫描 | `WHERE status IN (...) AND deleted = 0 ORDER BY update_time` | `(status, deleted, update_time)` |
| 时间范围 | `WHERE biz_time BETWEEN ? AND ? AND deleted = 0` | `(biz_time, deleted)` 或 `(deleted, biz_time)` |

> 详细索引设计说明（含 EXPLAIN 解读、联合索引细则、覆盖索引、常见误区）见 [`references/index-design-principles.md`](references/index-design-principles.md)。

---

## 4) 空白业务表模板

```sql
CREATE TABLE `t_xx_demo` (
  `id` bigint NOT NULL COMMENT '主键 ID',
  `demo_id` varchar(64) NOT NULL COMMENT '业务唯一标识',

  `status` tinyint NOT NULL COMMENT '状态码，含义需在注释或设计文档中说明',
  `raw_status` varchar(32) DEFAULT NULL COMMENT '外部原始状态，可选',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',

  `deleted` tinyint NOT NULL DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除',
  `create_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',

  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_demo_id` (`demo_id`) USING BTREE,
  KEY `idx_status_deleted_ut` (`status`, `deleted`, `update_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='XX 业务表示例';
```

---

## 5) 进阶话题：分区与分片

### 表分区（MySQL 分区表）

适用场景：单表数据量较大（通常 > 500GB）且有明显分区键。

```sql
CREATE TABLE `t_order_partitioned` (
  `id` bigint NOT NULL,
  `order_id` varchar(64) NOT NULL,
  `user_id` bigint NOT NULL,
  `create_time` timestamp(6) NOT NULL,
  PRIMARY KEY (`id`, `create_time`),
  UNIQUE KEY `uk_order_id` (`order_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
PARTITION BY RANGE (YEAR(create_time)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

注意事项：
- 分区键必须包含在主键和唯一索引中（MySQL 限制）
- 分区不能完全替代索引优化，不当的分区反而降低性能
- 建议先用索引优化，再评估是否引入分区

### 分片（Sharding）

当单表数据量达到亿级且索引优化、分区均无法满足时考虑分片：
- **垂直分片**：按业务模块拆分到不同库（如订单库、用户库）
- **水平分片**：按分片键（如 user_id）将数据分布到多个数据库实例

分片会引入分布式事务、跨分片查询、全局主键等复杂度，**应作为最后手段**，优先通过索引优化、缓存、归档解决。

> 跨表关系设计示例（订单-订单项-支付模型）见 [`examples/multi-table-design.md`](examples/multi-table-design.md)。

---

## 6) 快速开始

1. 复制第 4 节空白模板作为起点
2. 替换表名与业务唯一标识字段名（如 `t_payment_order`、`payment_id`）
3. 添加业务字段，为核心字段补充明确注释
4. 根据核心查询 SQL 设计唯一约束与普通索引
5. 使用 `EXPLAIN` 校验关键 SQL，必要时调整联合索引顺序
6. 如涉及跨表关系，参考 [`examples/multi-table-design.md`](examples/multi-table-design.md)

### 命名建议

- 表名：`t_` + 业务模块 + 实体名，如 `t_payment_order`
- 业务唯一标识：按实体语义命名，如 `order_id`、`payment_id`
- 状态字段：`status` 或 `biz_status`
- 原始外部状态：`raw_status` 或 `channel_status`
- 索引名：`uk_` 表示唯一索引，`idx_` 表示普通索引

---

## 7) 注意事项

1. 状态字段默认使用数值型状态码，应用层用枚举维护语义；字符串状态只适合保存外部原始状态或少量低频场景
2. 业务唯一标识必须结合唯一约束设计，优先让数据库承担幂等兜底职责
3. `deleted` 必须为 `NOT NULL DEFAULT 0`，不要遗漏软删语义注释
4. 除设置类时间信息外，业务时间字段统一使用 `timestamp(6)`；不要把微秒精度误当成并发控制方案
5. 索引设计必须基于真实 SQL 与执行计划，不要把某个模板顺序当成通用标准答案
6. 分区键必须包含在主键和唯一索引中（MySQL 分区表限制）
