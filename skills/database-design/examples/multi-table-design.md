# 跨表关系设计示例

## 订单-订单项-支付 关系模型

```sql
-- ============================================================
-- 订单主表
-- ============================================================
CREATE TABLE `t_order` (
  `id` bigint NOT NULL COMMENT '主键 ID',
  `order_id` varchar(64) NOT NULL COMMENT '业务订单 ID',
  `user_id` bigint NOT NULL COMMENT '用户 ID',
  `status` tinyint NOT NULL COMMENT '状态: 0-初始化, 1-处理中, 2-成功, 3-失败, 4-已取消',
  `total_amount` decimal(18,2) NOT NULL COMMENT '订单总金额',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',

  `deleted` tinyint NOT NULL DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除',
  `create_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',

  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_order_id` (`order_id`) USING BTREE,
  KEY `idx_user_deleted_ct` (`user_id`, `deleted`, `create_time`) USING BTREE,
  KEY `idx_status_deleted_ut` (`status`, `deleted`, `update_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';


-- ============================================================
-- 订单项表（与订单主表 1:N 关系）
-- ============================================================
CREATE TABLE `t_order_item` (
  `id` bigint NOT NULL COMMENT '主键 ID',
  `item_id` varchar(64) NOT NULL COMMENT '订单项业务 ID',
  `order_id` varchar(64) NOT NULL COMMENT '所属订单业务 ID',
  `product_id` bigint NOT NULL COMMENT '商品 ID',
  `product_name` varchar(200) NOT NULL COMMENT '商品名称（快照）',
  `quantity` int NOT NULL COMMENT '数量',
  `unit_price` decimal(18,2) NOT NULL COMMENT '单价',
  `status` tinyint NOT NULL COMMENT '状态: 0-初始化, 1-已发货, 2-已签收, 3-已退款',

  `deleted` tinyint NOT NULL DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除',
  `create_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',

  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_item_id` (`item_id`) USING BTREE,
  KEY `idx_order_id` (`order_id`) USING BTREE,
  KEY `idx_order_status` (`order_id`, `status`, `deleted`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单项表';


-- ============================================================
-- 支付记录表（与订单 1:N 关系，支持部分退款/多次支付）
-- ============================================================
CREATE TABLE `t_payment` (
  `id` bigint NOT NULL COMMENT '主键 ID',
  `payment_id` varchar(64) NOT NULL COMMENT '支付业务 ID',
  `order_id` varchar(64) NOT NULL COMMENT '关联订单业务 ID',
  `channel` varchar(32) NOT NULL COMMENT '支付渠道: wechat / alipay / unionpay',
  `channel_payment_id` varchar(128) DEFAULT NULL COMMENT '渠道侧支付单号',
  `amount` decimal(18,2) NOT NULL COMMENT '支付金额',
  `status` tinyint NOT NULL COMMENT '状态: 0-待支付, 1-支付中, 2-支付成功, 3-支付失败, 4-已退款',

  `deleted` tinyint NOT NULL DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除',
  `create_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',

  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_payment_id` (`payment_id`) USING BTREE,
  UNIQUE KEY `uk_channel_transaction` (`channel`, `channel_payment_id`) COMMENT '幂等：防止渠道侧重复回调',
  KEY `idx_order_id` (`order_id`) USING BTREE,
  KEY `idx_order_deleted_ct` (`order_id`, `deleted`, `create_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';
```

## 设计要点说明

### 1. 业务 ID 关联优于物理外键

三张表之间通过业务 ID (`order_id`, `item_id`, `payment_id`) 关联，而非物理外键约束。原因：
- 避免外键对写入性能的影响
- 支持后续分库分表（跨库无法使用物理外键）
- 应用层保证数据一致性

### 2. 幂等设计

- `t_payment.uk_channel_transaction`：防止渠道侧重复回调，同一个渠道的同一个渠道单号只能有一条记录
- 各表均有业务唯一标识 + 唯一索引兜底

### 3. 索引设计说明

- `t_order_item` 的 `idx_order_id`：按订单查询所有商品项
- `t_payment` 的 `idx_order_deleted_ct`：按订单查询支付记录，按时间排序
- 各表均保留 `status + deleted` 组合索引，支持状态扫描类任务

### 4. 数据一致性注意事项

- 订单总金额 = SUM(订单项金额) 需要在应用层保证
- 支付金额累计不应超过订单总金额（除非允许多付）
- 订单状态变更应与关联的订单项/支付记录状态联动
