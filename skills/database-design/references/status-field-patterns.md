# 状态字段设计模式参考

## 多语言枚举示例

### Java 完整枚举模式

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

    public int getCode() { return code; }
    public String getDesc() { return desc; }

    public static OrderStatus fromCode(int code) {
        for (OrderStatus s : values()) {
            if (s.code == code) return s;
        }
        throw new IllegalArgumentException("Unknown code: " + code);
    }
}
```

### Python 枚举模式

```python
from enum import IntEnum

class OrderStatus(IntEnum):
    INIT = 0
    PROCESSING = 1
    SUCCESS = 2
    FAILED = 3
    CANCELLED = 4
```

### TypeScript 枚举模式

```typescript
export enum OrderStatus {
  INIT = 0,
  PROCESSING = 1,
  SUCCESS = 2,
  FAILED = 3,
  CANCELLED = 4,
}
```

## 状态机流转约束

### 推荐的状态机模式

```sql
-- 通过 CHECK 约束限制合法流转（MySQL 8.0+）
ALTER TABLE t_order ADD CONSTRAINT ck_status_transition
CHECK (
  (status = 0) OR                    -- INIT
  (status = 1 AND old_status = 0) OR -- INIT -> PROCESSING
  (status = 2 AND old_status = 1) OR -- PROCESSING -> SUCCESS
  (status = 3 AND old_status = 1) OR -- PROCESSING -> FAILED
  (status = 4 AND old_status = 0)    -- INIT -> CANCELLED
);
```

> 注意：MySQL CHECK 约束在分区表上有一定限制，生产环境建议在应用层实现状态机校验。

### 应用层状态机模式

使用状态模式或有限状态机库（如 Java 的 Spring Statemachine、Python 的 transitions）约束合法流转路径。

## 多种状态字段方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| `status tinyint` | 存储小、查询快、枚举语义清晰 | 不直观，需文档说明 | 通用推荐方案 |
| `status varchar(32)` | 直观可读，调试方便 | 存储大、查询略慢 | 低频、少量状态 |
| `raw_status` 独立存储 | 保留三方原始值，不污染业务状态 | 多一个字段 | 对接外部系统 |
| 位图 `status_bitmap` | 可表达多状态共存 | 查询复杂、可维护性差 | 不适合通用业务 |

## 字段注释规范

```sql
-- 推荐：注释中明确状态码含义
status tinyint NOT NULL COMMENT '状态: 0-初始化, 1-处理中, 2-成功, 3-失败, 4-已取消'

-- 推荐：若状态较多，注释可简化指向设计文档
status smallint NOT NULL COMMENT '状态码，详见设计文档第 X 节'

-- 不推荐：无注释或语义不清
status tinyint NOT NULL COMMENT '状态'
```
