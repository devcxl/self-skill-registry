---
name: mysql-database-design
description: 当在项目中设计、评审或优化 MySQL 表结构，需要统一固定字段、状态字段、时间字段、唯一约束与索引设计规范时使用。
version: 1.0.0
compatibility:
  - opencode
  - claude-code
  - codex
---

# MySQL 数据库设计

本 Skill 提供项目可复用的 MySQL 表结构模板与设计规范，重点覆盖固定字段、状态字段、唯一约束、时间字段与索引设计。

---

## 1) 通用规范

### 固定字段（所有业务表必须包含）

#### 平台固定字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | bigint | 主键 ID，建议使用雪花或其他分布式 ID 方案 |
| `deleted` | tinyint | 软删标记，`0` 表示未删除，`1` 表示已删除 |
| `create_time` | timestamp(6) | 创建时间 |
| `update_time` | timestamp(6) | 更新时间 |

#### 业务唯一标识字段

- 业务唯一标识字段必须按实体语义命名，例如 `order_id`、`payment_id`、`wallet_id`
- 不要把 `xx_id` 当成正式字段名；`xx_id` 只适合在模板中表示占位
- 业务唯一标识字段通常需要唯一约束，用于幂等、防重和外部系统对接
- 字段类型按场景选择：
  - 对外暴露、跨系统交互、需要前缀语义的标识，通常使用 `varchar(32)` ~ `varchar(64)`
  - 内部高频关联字段，优先考虑 `bigint` 等数值型以降低存储与索引成本

### 状态字段规范（重要）

- 状态字段默认使用数值型状态码，优先选择 `tinyint`，状态较多时可使用 `smallint`
- 应用层通过枚举维护状态语义，不要把展示文案直接作为数据库核心状态值
- 如需保留外部系统原始状态，可增加 `raw_status`、`channel_status` 等字符串字段单独存储
- 状态字段命名建议使用 `status` 或 `biz_status`
- 状态含义必须在字段注释、表注释或设计文档中明确说明

推荐示例：

```sql
status tinyint NOT NULL COMMENT '状态: 0-初始化, 1-处理中, 2-成功, 3-失败, 4-已取消'
```

Java 枚举示例：

```java
public enum OrderStatus {
    INIT(0, "初始化"),
    PROCESSING(1, "处理中"),
    SUCCESS(2, "成功"),
    FAILED(3, "失败"),
    CANCELLED(4, "已取消");

    private final int code;
    private final String desc;

    OrderStatus(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public int getCode() {
        return code;
    }

    public String getDesc() {
        return desc;
    }
}
```

### 软删字段规范

- `deleted` 必须使用 `NOT NULL DEFAULT 0`
- 字段注释必须明确语义，例如 `0-未删除, 1-已删除`
- 如业务对审计要求较高，可增加 `delete_time` 字段记录删除时间

推荐示例：

```sql
deleted tinyint NOT NULL DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除'
```

### 时间字段规范

- 业务表中的时间字段默认统一使用 `timestamp(6)`，包括 `create_time`、`update_time`、`biz_time` 等业务事件时间
- “设置类时间信息”不强制使用 `timestamp(6)`，应按语义选择更合适的类型，例如仅表达时分秒、周期配置或日期配置的字段
- 微秒精度有助于记录更细粒度事件时间，但不能替代并发控制机制
- 并发控制应通过唯一约束、乐观锁、事务隔离、幂等设计或状态机约束解决

### 唯一约束规范

- 幂等、防重、去重，优先依赖数据库唯一约束兜底，不要只依赖应用层判断
- 唯一索引字段应尽量稳定，避免把高频变更字段纳入唯一键
- 若业务唯一键由多列共同组成，应显式设计联合唯一索引

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
- `status` 存状态码，`channel_status` 存渠道原始状态，避免混用
- `biz_time` 使用 `timestamp(6)` 示例，符合业务时间字段统一规范
- 索引仅作通用参考，最终仍需结合真实 SQL 与执行计划确认

---

## 3) 索引设计原则

### 基本原则

- 联合索引顺序应结合 `where` 等值条件、范围条件、排序字段和选择性综合设计
- 不要机械套用模板，必须结合核心 SQL 与 `EXPLAIN` 结果确认
- 索引不是越多越好；通常保留 2~5 个高命中索引即可，避免写入成本过高
- 大部分查询会过滤 `deleted=0`，但 `deleted` 是否放在联合索引前缀，需要结合数据分布判断

### 常见查询模式

#### A. 业务幂等 / 外部对接

- SQL：`where order_id = ?`
- 索引：`UNIQUE KEY uk_order_id(order_id)`
- 目标：支持按业务单号查单、防止重复写入

#### B. 列表查询

- SQL：`where user_id = ? and deleted = 0 order by create_time desc`
- 推荐起点：`(user_id, deleted, create_time)`
- 如 `deleted=0` 选择性极低，可评估是否简化为 `(user_id, create_time)`

#### C. 状态流转 / 扫描任务

- SQL：`where status in (...) and deleted = 0 order by update_time`
- 推荐起点：`(status, deleted, update_time)`
- 若删除数据极少，`deleted` 不一定必须前置；以执行计划为准

#### D. 时间范围查询

- SQL：`where biz_time between ? and ? and deleted = 0`
- 常见候选索引：`(biz_time, deleted)` 或 `(deleted, biz_time)`
- 若 `deleted=0` 几乎覆盖全表，通常不应机械把 `deleted` 放首列

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

## 5) 快速开始

### 使用步骤

1. 复制第 4 节空白模板作为起点
2. 替换表名与业务唯一标识字段名，例如替换为 `t_payment_order`、`payment_id`
3. 添加业务字段，并为状态码、金额、时间等核心字段补充明确注释
4. 根据核心查询 SQL 设计唯一约束与普通索引，不要先拍脑袋定索引
5. 使用 `EXPLAIN` 校验关键 SQL，必要时调整联合索引顺序

### 命名建议

- 表名：`t_` + 业务模块 + 实体名，例如 `t_payment_order`
- 业务唯一标识：按实体语义命名，例如 `order_id`、`payment_id`
- 状态字段：`status` 或 `biz_status`
- 原始外部状态字段：`raw_status` 或 `channel_status`
- 索引名：`uk_` 表示唯一索引，`idx_` 表示普通索引，后接核心字段缩写

---

## 6) 注意事项

1. 状态字段默认使用数值型状态码，应用层用枚举维护语义；字符串状态只适合保存外部原始状态或少量低频场景
2. 业务唯一标识必须结合唯一约束设计，优先让数据库承担幂等兜底职责
3. `deleted` 必须为 `NOT NULL DEFAULT 0`，不要遗漏软删语义注释
4. 除设置类时间信息外，业务时间字段统一使用 `timestamp(6)`；同时不能把微秒精度误当成并发控制方案
5. 索引设计必须基于真实 SQL 与执行计划，不要把某个模板顺序当成通用标准答案
