---
name: fastapi-fullstack
description: Fastapi 项目的全栈开发指南，涵盖 API 路由、SQLAlchemy 异步数据库模型、Repository 模式、依赖注入和测试的完整开发流程。使用场景：添加新的 API 端点和功能模块、创建或修改数据库模型和关系、编写 Repository 查询逻辑、实现完整的 CRUD 操作、编写和维护测试用例、排查数据库和 API 相关问题。适用于需要了解 Fastapi 项目架构和开发规范的所有开发任务。
version: 1.0.0
compatibility:
  - opencode
  - claude-code
  - codex
tags:
  - fastapi
  - fullstack
category: utilities
metadata:
  language: cn
  license: MIT
  author: devcxl
---

# Fastapi 全栈开发指南

## 概述

本技能为 Fastapi 项目（基于 FastAPI + SQLAlchemy 异步模式）提供完整的全栈开发指导，包括从 API 设计到数据库实现的完整工作流程、代码模式参考和故障排查。

## 核心能力

### 1. API 端点开发

创建新的 RESTful API 端点，包括：
- 路由定义和注册
- 请求体验证（Pydantic 模型）
- 响应模型设计
- Repository 依赖注入
- 错误处理

**触发场景**："添加用户管理的 API"、"创建订单查询接口"、"实现统计数据的 API"

### 2. 数据库模型设计

使用 SQLAlchemy 2.0 异步 ORM 创建和修改数据模型：
- 表结构定义
- 字段类型和约束
- 一对多和多对多关系
- 数据库迁移

**触发场景**："添加一个新的数据库模型"、"为用户表添加字段"、"实现用户和角色的多对多关系"

### 3. Repository 模式

使用泛型 Repository 进行数据库操作：
- CRUD 基础操作
- 复杂查询和过滤
- 事务管理
- 关系查询优化

**触发场景**："实现用户查询功能"、"优化数据库查询性能"、"处理复杂的业务逻辑查询"

### 4. 测试编写

编写和维护异步测试：
- API 测试
- Repository 测试
- 数据库测试 fixture
- 集成测试

**触发场景**："为新功能编写测试"、"修复测试失败的问题"

### 5. 前端集成

配置前端与后端的集成，包括：
- 静态文件挂载
- CORS 配置
- API 代理设置
- 前后端分离部署

**触发场景**："配置前端静态文件"、"解决跨域问题"、"部署前端构建产物"

### 6. 故障排查

诊断和解决常见问题：
- 数据库连接和查询错误
- API 端点问题
- 异步编程错误
- 性能问题

**触发场景**："API 返回 500 错误"、"数据库查询很慢"、"测试无法连接数据库"

## 开发工作流程

### 场景 1：添加新功能模块

#### 步骤 1：理解需求
1. 明确功能需求和数据结构
2. 识别需要的 API 端点
3. 确定数据库表和关系

#### 步骤 2：创建数据库模型

参考：[architecture.md](references/architecture.md#orm-模型-databasemodels)

1. 在 `<project>/database/models.py` 中定义新的 ORM 模型
2. 使用 `orm.Mapped` 定义字段
3. 添加必要的注释（中文）
4. 如有关系，定义关联关系

模板：`assets/templates/model_template.py`

#### 步骤 3：创建 Pydantic 模型

在 `<project>/api/models.py` 中添加：
- 响应模型（`<Model>`）
- 创建请求体（`Create<Model>Payload`）
- 更新请求体（`Update<Model>Payload`）

模板：`assets/templates/pydantic_template.py`

参考：[conventions.md](references/conventions.md#pydantic-模型约定)

#### 步骤 4：创建 API 路由

1. 创建新文件 `<project>/api/v1/<module>.py`
2. 定义路由和端点
3. 使用 Repository 依赖注入
4. 实现业务逻辑

模板：`assets/templates/endpoint_template.py`

参考：[patterns.md](references/patterns.md#1-创建新的-api-端点)

#### 步骤 5：注册路由

在 `<project>/api/v1/routes.py` 中导入并注册新路由：

```python
from <project>.api.v1 import <module>
router.include_router(<module>.router)
```

#### 步骤 6：编写测试

创建 `tests/test_<module>.py`，编写测试用例。

模板：`assets/templates/test_template.py`

参考：[conventions.md](references/conventions.md#测试约定)

#### 步骤 7：验证

运行测试和代码检查：
```bash
pytest tests/test_<module>.py -v
ruff check .
ruff format .
```

### 场景 2：添加单个 API 端点

#### 快速步骤

1. **检查现有模型** - 确认数据库模型已存在
2. **添加 Pydantic 模型** - 在 `api/models.py` 添加请求/响应模型
3. **添加端点** - 在对应的路由文件中添加新的端点函数
4. **测试** - 使用 `/api/docs` 手动测试或编写单元测试

### 场景 3：修改现有功能

#### 修改数据库模型

1. 添加/修改 `<project>/database/models.py` 中的字段
2. 如果是生产环境，需要考虑数据迁移
3. 更新相关的 Pydantic 模型
4. 更新 API 端点（如果需要）
5. 更新测试

#### 修改 API 端点

1. 修改路由文件中的端点逻辑
2. 更新 Pydantic 模型（如果接口变更）
3. 更新相关测试
4. 验证功能

## 快速参考

### 常用代码模式

详见：[patterns.md](references/patterns.md)

- **创建 API 端点** - 路由定义、依赖注入、响应格式
- **Repository 查询** - CRUD 操作、复杂查询、关系查询
- **密码加密** - 使用 bcrypt 加密和验证
- **分页查询** - 实现分页列表
- **前端集成** - 静态文件挂载、CORS 配置、API 代理

### 代码规范

详见：[conventions.md](references/conventions.md)

- **命名约定** - 类、函数、变量、数据库表的命名
- **类型注解** - 使用现代类型注解语法
- **异步编程** - 正确使用 async/await
- **错误处理** - 业务错误 vs 系统异常
- **测试约定** - 测试文件命名、异步测试

### 项目架构

详见：[architecture.md](references/architecture.md)

- **技术栈** - FastAPI, SQLAlchemy, MySQL 等
- **项目结构** - 目录组织和文件职责
- **核心组件** - 应用入口、数据库会话、Repository、依赖注入
- **数据流转** - 请求到响应的完整流程

## 故障排查

### 常见问题

详见：[troubleshooting.md](references/troubleshooting.md)

按类别索引：
- **数据库问题** - 连接错误、表不存在、事务超时
- **API 问题** - 400 错误、404 错误、500 错误
- **异步问题** - RuntimeWarning、事件循环错误
- **依赖注入** - Repository 注入失败
- **性能问题** - 查询慢、内存占用高
- **测试问题** - 测试数据库连接失败
- **部署问题** - Docker 容器、环境变量

### 调试技巧

- **启用详细日志** - 查看详细的错误信息
- **使用 API 文档** - 访问 `/api/docs` 测试端点
- **数据库查询日志** - 打印所有 SQL 查询
- **异常追踪** - 使用 traceback 查看完整堆栈

## 使用资源

### 模板文件（assets/templates/）

以下模板文件可以直接复制使用，记得替换占位符：

- **`app_template.py`** - FastAPI 应用入口模板，包含静态文件挂载和 CORS 配置
- **`endpoint_template.py`** - API 路由模板，包含完整的 CRUD 操作
- **`model_template.py`** - SQLAlchemy ORM 模型模板
- **pydantic_template.py** - Pydantic 请求/响应模型模板
- **`test_template.py`** - pytest 测试模板，包含常见测试用例

### 参考文档（references/）

根据需要加载到上下文中：

- **`architecture.md`** - 项目架构说明，包括技术栈、项目结构、核心组件
- **`patterns.md`** - 常用代码模式，包含实际代码示例
- **`conventions.md`** - 代码规范和约定，确保代码一致性
- **`troubleshooting.md`** - 故障排查指南，解决常见问题

### 何时加载参考文档

- 开始新功能开发前：加载 `architecture.md` 和 `conventions.md`
- 实现具体功能时：加载 `patterns.md` 查看代码模式
- 遇到问题时：加载 `troubleshooting.md` 查找解决方案

## 最佳实践

### 1. 渐进式开发

- 先实现基本功能，再优化和完善
- 每完成一个步骤就运行测试验证
- 保持代码可运行，避免长时间的"半成品"状态

### 2. 使用模板

- 新功能开发时参考模板文件
- 模板已经包含了项目的最佳实践
- 替换占位符时要保持一致的风格

### 3. 遵循规范

- 严格按照代码规范编写代码
- 使用项目约定的命名和结构
- 添加必要的中文注释

### 4. 测试优先

- 编写功能时同步编写测试
- 使用测试验证功能正确性
- 测试失败时优先修复

### 5. 安全第一

- 密码必须使用 bcrypt 加密
- 敏感信息从环境变量读取
- 输入验证使用 Pydantic 模型
- 避免直接拼接 SQL

## 检查清单

完成功能后，确保：

- [ ] 数据库模型已正确定义并继承 `Base`
- [ ] 所有字段都有中文注释
- [ ] Pydantic 模型启用了 `from_attributes=True`
- [ ] API 端点正确使用 `async/await`
- [ ] Repository 依赖注入正确配置
- [ ] 错误处理符合规范（业务错误用 `CommonResponse`，系统错误用 HTTP 异常）
- [ ] 测试用例覆盖核心功能
- [ ] 代码通过 `ruff check` 检查
- [ ] 代码已使用 `ruff format` 格式化
- [ ] 路由已在 `routes.py` 中注册
- [ ] 静态文件挂载配置正确（如果涉及前端）
- [ ] CORS 配置符合开发和生产环境需求
- [ ] 前端 API 请求路径正确使用 `/api` 前缀

## 常用命令

```bash
# 启动开发服务器
uvicorn <project>.app:app --reload

# 运行所有测试
pytest -v

# 运行特定测试
pytest tests/test_<module>.py -v

# 代码风格检查
ruff check .

# 代码格式化
ruff format .

# 类型检查
pyright

# 查看 API 文档
# 访问 http://localhost:8000/api/docs
```

---

**注意**：所有代码和注释应使用中文，除非项目有明确的英文约定。
