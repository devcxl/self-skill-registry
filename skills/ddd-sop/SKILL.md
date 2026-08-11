---
name: ddd-sop
description: 当在真实项目中按 DDD 落地开发时使用。涵盖从业务目标、事件风暴、限界上下文、统一语言、聚合设计、用例建模、一致性设计、分层实现到质量门禁的完整 SOP。当用户想要落地 DDD、设计领域模型、划分限界上下文、编写业务用例，或提到"DDD"、"领域驱动设计"、"SOP"时使用。
version: 1.0.0
compatibility:
  - opencode
  - claude-code
  - codex
---

# DDD 落地 SOP

不从一开始就设计聚合、仓储和 Maven 模块。按以下顺序逐步落地。

## 完整流程

```text
业务目标
→ 事件风暴
→ 限界上下文
→ 统一语言
→ 用例建模
→ 聚合设计
→ 一致性设计
→ 分层实现
→ 领域测试
→ 持续重构
```

各阶段产物写入规则见 [document-structure.md](references/document-structure.md)，与 `domain-modeling` skill 的 `CONTEXT.md` / `docs/adr/` 约定对齐。

---

## 1. 明确业务目标

先回答：

- 系统解决什么业务问题
- 核心业务指标是什么
- 哪些规则决定业务成败
- 哪些只是普通 CRUD

产物写入 `docs/business-goals.md`：

```text
业务目标
核心流程
关键业务规则
非核心功能
```

只有核心业务值得重点使用 DDD。具体示例见 [examples.md](references/examples.md)。

---

## 2. 画业务流程和事件风暴

参与者：产品 + 业务专家 + 架构师 + 核心开发

按时间顺序梳理事件流，重点标记：

| 类型   | 示例          |
| ---- | ----------- |
| 命令   | 创建订单、发起支付   |
| 领域事件 | 订单已创建、支付已成功 |
| 业务规则 | 已支付订单不能重复支付 |
| 外部系统 | 微信支付、库存服务   |
| 异常分支 | 支付超时、重复回调   |

产物写入 `docs/event-storming.md`。

不要在这一阶段讨论数据库表和接口。

---

## 3. 划分限界上下文

根据业务语言、规则和数据归属拆分上下文。

判断是否应该拆开的标准：

- 是否使用不同业务语言
- 是否拥有独立生命周期
- 是否由不同团队负责
- 是否需要独立演进
- 是否存在完全不同的业务规则

产物写入 `docs/context-map.md`：

```text
限界上下文地图 Context Map
上下文职责说明
上下文之间的依赖关系
```

---

## 4. 为每个上下文建立统一语言

定义业务术语，避免同一个词存在多种含义。

产物写入 `CONTEXT.md`（每上下文一个，多上下文时由 `CONTEXT-MAP.md` 索引）。

统一语言需要进入：

- PRD
- 接口名称
- 类名、方法名
- 数据库字段
- 日志
- 测试用例

禁止：`handleData()`、`processInfo()`、`updateStatus()`、`doBusiness()`

应表达业务：`confirmPayment()`、`cancelExpiredOrder()`、`approveRefund()`、`allocateInventory()`

---

## 5. 识别聚合和一致性边界

聚合不是按数据库表划分，而是按业务一致性划分。

核心问题：**哪些数据必须在一次业务操作中保持强一致？**

产物写入 `docs/aggregates.md`。

聚合设计约束：

- 一个事务原则上只修改一个聚合
- 聚合之间只通过 ID 引用
- 聚合根维护内部业务不变量
- 聚合尽可能小
- 跨聚合通过领域事件实现最终一致性

外部不能直接修改状态：

```java
order.setStatus(PAID); // 禁止
```

正确方式：

```java
order.confirmPayment(paymentId);
```

---

## 6. 编写用例，而不是直接写 Controller

每个业务操作先写成应用用例，写入 `docs/use-cases/<动词-名词>.md`。

用例模板参见 [requirement-template.md](references/requirement-template.md)。

职责边界：

```text
Controller：协议转换、参数校验、身份解析
Application：编排用例、事务控制
Domain：业务规则和状态变化
Infrastructure：数据库、MQ、第三方接口
```

---

## 7. 设计上下文之间的协作

优先级：

```text
同上下文：直接调用领域模型
跨上下文同步查询：应用服务或防腐层
跨上下文状态变化：领域事件 / 集成事件
强实时返回：同步接口
允许延迟：消息
```

产物写入 `docs/consistency.md`。

外部系统必须经过防腐层：

```java
public interface PaymentChannel {
    ChannelPaymentResult pay(PaymentRequest request);
}
```

---

## 8. 建立模块结构

推荐先做模块化单体，不要一开始拆微服务。

模块结构参见 [module-structure.md](references/module-structure.md)。

---

## 每个需求的开发流程

每个需求执行以下检查，详见 [dev-checklist.md](references/dev-checklist.md)：

```text
1. 这个需求属于哪个限界上下文？
2. 对应哪个业务用例？
3. 修改了哪些业务规则？
4. 哪个聚合负责维护规则？
5. 是否需要修改多个聚合？
6. 是否需要发布领域事件？
7. 是否涉及其他上下文？
8. 需要强一致还是最终一致？
9. 如何保证幂等？
10. 用什么测试证明规则正确？
```

编码顺序：

```text
用例说明
→ 领域测试
→ 领域模型
→ 应用服务
→ 仓储接口
→ 基础设施实现
→ Controller
→ 集成测试
```

---

## 落地质量门禁

满足以下条件才算真正使用了 DDD：

- 业务规则主要位于领域模型，而不是 Controller
- 状态不能被任意 `setStatus`
- 一个业务操作对应明确用例
- 上下文之间不能直接访问对方数据库
- 跨聚合事务有明确一致性方案
- 类名和方法名使用业务语言
- 领域模型可以脱离 Spring 单独测试
- 数据库实体不直接充当所有层的传输对象
- 微服务边界基本对应限界上下文