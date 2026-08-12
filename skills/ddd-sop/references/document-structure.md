# 文档结构

DDD 各阶段产物应与现有 `domain-modeling` skill 的文件约定对齐。

## 基础约定（来自 domain-modeling）

- 统一语言：`CONTEXT.md`（每上下文一个）
- 多上下文索引：`CONTEXT-MAP.md`（指向各上下文位置）
- 架构决策：`docs/adr/`（系统级或上下文级）

## DDD 额外产物

在 `domain-modeling` 的基础上扩展 `docs/` 目录：

### 单上下文项目

```
/
├── CONTEXT.md                          # 统一语言
├── docs/
│   ├── adr/                            # 架构决策
│   ├── business-goals.md               # 业务目标、核心流程、关键业务规则
│   ├── event-storming.md               # 事件风暴结果
│   ├── context-map.md                  # 限界上下文地图（仅多上下文时有）
│   ├── aggregates.md                   # 聚合设计
│   ├── consistency.md                  # 一致性方案（跨聚合/跨上下文）
│   └── use-cases/                      # 用例文档
│       ├── confirm-payment.md
│       └── approve-refund.md
└── src/
```

### 多上下文项目

```
/
├── CONTEXT-MAP.md                      # 上下文索引
├── docs/
│   ├── business-goals.md               # 系统级业务目标
│   ├── context-map.md                  # 系统级上下文地图
│   ├── event-storming.md               # 系统级事件风暴
│   └── adr/                            # 系统级架构决策
└── src/
    ├── payment/
    │   ├── CONTEXT.md                  # 支付上下文统一语言
    │   └── docs/
    │       ├── event-storming.md       # 支付上下文事件风暴
    │       ├── aggregates.md           # 支付上下文聚合设计
    │       ├── consistency.md          # 支付上下文一致性方案
    │       ├── use-cases/
    │       │   ├── confirm-payment.md
    │       │   └── approve-refund.md
    │       └── adr/                    # 上下文级架构决策
    └── order/
        ├── CONTEXT.md
        └── docs/
            ├── aggregates.md
            ├── consistency.md
            ├── use-cases/
            └── adr/
```

## 各文件职责

| 文件 | 阶段 | 内容 |
|------|------|------|
| `business-goals.md` | 业务目标 | 业务问题、核心指标、关键规则、核心/非核心功能分层 |
| `event-storming.md` | 事件风暴 | 事件流、命令、领域事件、业务规则、外部系统、异常分支 |
| `context-map.md` | 限界上下文 | 上下文地图、职责说明、依赖关系（U:上游/D:下游） |
| `CONTEXT.md` | 统一语言 | 术语表，见 domain-modeling skill 格式 |
| `aggregates.md` | 聚合设计 | 聚合根、实体、值对象、不变量、状态流转 |
| `consistency.md` | 一致性设计 | 跨聚合事务方案、领域事件、最终一致性策略 |
| `use-cases/*.md` | 用例建模 | 单个用例的输入、规则、聚合、状态变化、事件、异常、验收测试 |

## 创建规则

- 懒加载创建——仅当有内容需要写入时才创建文件
- 用例文档命名：动词-名词，如 `confirm-payment.md`、`cancel-expired-order.md`
- 用例文档格式参见 [requirement-template.md](requirement-template.md)