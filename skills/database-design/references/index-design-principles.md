# 索引设计原则参考

## EXPLAIN 核心指标解读

| 指标 | 良好 | 需优化 |
|------|------|--------|
| `type` | const/ref/range | ALL (全表扫描) |
| `rows` | 扫描行数接近最终结果数 | 扫描行数远大于结果数 |
| `Extra` | Using index (覆盖索引) | Using filesort / Using temporary |
| `key` | 使用了预期索引 | NULL (无可用索引) |

### 索引类型优先级

`const > eq_ref > ref > range > index > ALL`

## 联合索引设计细则

### 等值条件优先

```sql
-- WHERE a = ? AND b = ? AND c = ?
-- 索引: (a, b, c) — 任意顺序均可，选择性高的列靠前更优
```

### 范围条件后置

```sql
-- WHERE a = ? AND b > ? AND c = ?
-- 索引: (a, b) — b 是范围条件，c 无法走索引
-- 若 c 也需索引，可尝试 (a, c, b) 或拆分为两个查询
```

### 排序字段利用

```sql
-- WHERE a = ? ORDER BY b
-- 索引: (a, b) — 排序可利用索引有序性，避免 filesort
-- WHERE a = ? ORDER BY b, c
-- 索引: (a, b, c) — 排序方向需一致
```

### 覆盖索引

```sql
-- SELECT a, b FROM t WHERE a = ?
-- 索引: (a, b) — 仅扫描索引即可返回，无需回表
-- Extra 显示 "Using index" 即为覆盖索引
```

## 常见索引误区

### 误区 1：deleted 必须放联合索引首列

`deleted` 通常只有 0/1 两个值，选择性极低。只有当 `deleted=0` 的数据占比很小时才值得前置。大部分场景下 `deleted` 放在靠后位置或依赖应用层过滤 + 短路径索引即可。

### 误区 2：索引越多越好

每个索引都会增加写入成本（INSERT/UPDATE 需维护所有索引）。保留 2~5 个高命中索引通常已足够。通过 `sys.schema_unused_indexes` 清理无用索引。

### 误区 3：唯一索引和普通索引性能差异大

唯一索引在写入时多一次冲突检测，但对读性能无差异。选择依据是业务是否需要唯一约束，而非性能。

## 索引维护

```sql
-- 查看索引使用情况
SELECT * FROM sys.schema_index_statistics WHERE table_schema = 'db_name';

-- 查看未使用索引
SELECT * FROM sys.schema_unused_indexes;

-- 重建索引（Online DDL）
ALTER TABLE t_table DROP INDEX idx_old, ADD INDEX idx_new (col1, col2), ALGORITHM=INPLACE, LOCK=NONE;
```
