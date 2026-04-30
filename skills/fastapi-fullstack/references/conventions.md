# Fastapi 代码规范和约定

## 命名约定

### Python 命名

- **类名**: PascalCase（如 `User`, `DatabaseRepository`）
- **函数和方法**: snake_case（如 `get_user`, `create_user`）
- **变量**: snake_case（如 `user_id`, `total_count`）
- **常量**: UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- **模块和包**: lowercase（如 `models.py`, `database/`）

### 数据库命名

- **表名**: lowercase_with_underscores（如 `user`, `client_connect_logs`）
- **列名**: lowercase_with_underscores（如 `username`, `created_at`）
- **外键**: `<table>_id`（如 `user_id`, `server_id`）

### API 命名

- **路由**: `/api/v1/<resource>/<action>`（如 `/api/v1/user/login`）
- **URL 参数**: snake_case（如 `user_id`, `page_size`）
- **请求体**: PascalCase + Payload（如 `RegisterUserPayload`）
- **响应体**: PascalCase（如 `User`, `CommonResponse`）

## 导入顺序

```python
# 1. 标准库
import datetime
import uuid
from typing import Annotated

# 2. 第三方库
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import orm

# 3. 本地模块
from <project>.api import models
from <project>.api.dependencies import get_repository
from <project>.database import models as db_models
from <project>.database.repository import DatabaseRepository
```

## 类型注解

### 基本类型

```python
from typing import Optional, List, Dict, Any, Union

# 新式类型注解（Python 3.9+）
def get_user(user_id: uuid.UUID) -> db_models.User | None:
    pass

# 使用 Annotated 添加约束
from typing import Annotated
from pydantic import Field

class Payload(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=100)]
```

### 集合类型

```python
# 列表
users: list[db_models.User]

# 字典
data: dict[str, Any]

# 可选
email: str | None  # 或 Optional[str]
```

## 异步编程约定

### 所有数据库操作必须是异步的

```python
# ✅ 正确：异步
async def get_user(user_id: uuid.UUID, repository: UserRepository) -> User:
    user = await repository.get(user_id)
    return user

# ❌ 错误：同步
def get_user(user_id: uuid.UUID, repository: UserRepository) -> User:
    user = repository.get(user_id)  # 这会报错
    return user
```

### 使用 async/await

```python
@router.post("/register")
async def register(data: models.RegisterUserPayload, repository: UserRepository):
    # 所有数据库操作都需要 await
    user = await repository.create(data.model_dump())
    return models.CommonResponse(data=user)
```

## ORM 模型约定

### 必须继承 Base

```python
from <project>.database.models import Base

class MyModel(Base):  # ✅ 正确
    pass

class MyModel(orm.DeclarativeBase):  # ❌ 错误
    pass
```

### 使用 orm.Mapped

```python
# ✅ 正确：使用 orm.Mapped
class User(Base):
    __tablename__ = "user"
    username: orm.Mapped[str] = orm.mapped_column(
        nullable=False,
        unique=True,
        comment="用户名"
    )

# ❌ 错误：使用 Column
class User(Base):
    __tablename__ = "user"
    username = Column(String, nullable=False)
```

### 字段注释

```python
# ✅ 正确：添加 comment
username: orm.Mapped[str] = orm.mapped_column(
    nullable=False,
    comment="用户名"  # 重要的字段都应该有注释
)

# ❌ 错误：缺少注释
username: orm.Mapped[str] = orm.mapped_column(nullable=False)
```

## Pydantic 模型约定

### 启用 from_attributes

```python
class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # ✅ 必须添加
    username: str
    email: str
```

### 请求体验证

```python
# ✅ 正确：使用 Field 添加约束
class RegisterUserPayload(BaseModel):
    username: str = Field(min_length=5, max_length=18)
    password: str = Field(min_length=12, max_length=32)

# ❌ 错误：没有验证
class RegisterUserPayload(BaseModel):
    username: str
    password: str
```

### 响应模型命名

```python
# ✅ 正确
class User(BaseModel):  # 响应模型直接用资源名
    username: str

class RegisterUserPayload(BaseModel):  # 请求模型加 Payload
    username: str
```

## API 端点约定

### 使用 HTTP 状态码

```python
# ✅ 正确：明确状态码
@router.post("/login", status_code=status.HTTP_200_OK)
async def login(...):
    return models.CommonResponse(data=...)

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create(...):
    return models.CommonResponse(data=...)

# ❌ 错误：不指定状态码
@router.post("/login")
async def login(...):
    return models.CommonResponse(data=...)
```

### 路由描述

```python
# ✅ 正确：添加文档字符串
@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    data: models.LoginPayload,
    repository: UserRepository,
) -> models.CommonResponse:
    """用户登录"""
    pass

# ❌ 错误：没有描述
@router.post("/login", status_code=status.HTTP_200_OK)
async def login(...):
    pass
```

### 使用 Repository 依赖注入

```python
# ✅ 正确：使用 Annotated 定义 Repository 依赖
UserRepository = Annotated[
    DatabaseRepository[db_models.User],
    Depends(get_repository(db_models.User)),
]

@router.post("/login")
async def login(
    data: models.LoginPayload,
    repository: UserRepository,  # 直接使用类型注解
) -> models.CommonResponse:
    pass

# ❌ 错误：不使用 Annotated
@router.post("/login")
async def login(
    data: models.LoginPayload,
    repository: DatabaseRepository[User] = Depends(get_repository(User)),
) -> models.CommonResponse:
    pass
```

## 错误处理约定

### 业务错误返回 CommonResponse

```python
# ✅ 正确：业务错误返回带 code 的响应
if not user:
    return models.CommonResponse(code=-1, message="User not found")

# ❌ 错误：使用 HTTP 异常处理业务错误
if not user:
    raise HTTPException(status_code=404, detail="User not found")
```

### 系统异常使用 FastAPI 异常处理

```python
# ✅ 正确：系统错误抛出 HTTP 异常
try:
    user = await repository.create(data)
except Exception as e:
    raise HTTPException(status_code=500, detail="Internal server error")
```

## 测试约定

### 测试文件命名

- 测试文件以 `test_` 开头（如 `test_api.py`, `test_user.py`）
- 测试函数以 `test_` 开头

### 使用异步测试

```python
# ✅ 正确：异步测试
@pytest.mark.asyncio
async def test_register_user():
    response = await client.post("/api/v1/user/register", json={...})
    assert response.status_code == 200

# ❌ 错误：同步测试
def test_register_user():
    response = client.post("/api/v1/user/register", json={...})  # 这会报错
    assert response.status_code == 200
```

## 配置约定

### 使用环境变量

```python
class Settings(BaseSettings):
    # ✅ 正确：敏感信息从环境变量读取
    database_url: str  # 从环境变量 DATABASE_URL 读取
    github_client_id: str  # 从 GITHUB_CLIENT_ID 读取

    # ❌ 错误：硬编码敏感信息
    database_url: str = "mysql+aiomysql://user:pass@localhost/db"
```

### 静态文件配置

#### 前端目录结构

```bash
project/
├── <project>/          # 后端项目
│   └── app.py
├── frontend/           # 前端项目
│   ├── src/
│   ├── package.json
│   └── dist/          # 构建产物（部署时使用）
└── dist/              # 或者将 dist 放在根目录
```

#### 配置管理

```python
# config.py
from pathlib import Path

class Settings(BaseSettings):
    # 其他配置...

    # 前端静态文件目录
    frontend_dist_path: str = "dist"  # 默认相对路径

    @property
    def frontend_dist(self) -> Path:
        """获取前端静态文件目录绝对路径"""
        base_path = Path(__file__).parent.parent
        return base_path / self.frontend_dist_path
```

#### 使用配置

```python
# app.py
from fastapi.staticfiles import StaticFiles
from <project>.config import settings

app.mount("/", StaticFiles(directory=str(settings.frontend_dist), html=True), name="frontend")
```

#### 路由挂载约定

- **静态文件路由**：挂载到根路径 `/`
- **API 路由**：使用 `/api` 前缀
- **路由顺序**：先注册 API 路由，后挂载静态文件

## 代码风格

### 使用 ruff 格式化

```bash
# 格式化代码
ruff format .

# 检查代码
ruff check .
```

### 行长度限制

- 最大行长度：88 字符
- 超长时可以换行

### 导入

- 删除未使用的导入
- 使用 `ruff check --select I` 检查和自动修复

## 注释约定

### 中文注释

```python
# ✅ 正确：使用中文注释
class User(Base):
    """用户信息"""
    username: orm.Mapped[str] = orm.mapped_column(
        nullable=False,
        comment="用户名"
    )

# ❌ 错误：使用英文注释
class User(Base):
    """User Information"""
    username: orm.Mapped[str] = orm.mapped_column(
        nullable=False,
        comment="Username"
    )
```

### 何时添加注释

- **必须添加**：
  - 所有数据库表和模型类
  - API 端点的功能
  - 复杂的业务逻辑
  - 重要的安全相关代码
- **可选添加**：
  - 简单的 CRUD 操作
  - 明显的代码逻辑

## 版本控制约定

### 提交信息格式

```
<type>: <subject>

<body>

<footer>
```

类型：
- `feat`: 新功能
- `fix`: 修复
- `refactor`: 重构
- `docs`: 文档
- `test`: 测试
- `chore`: 构建/工具

示例：

```
feat(user): 添加用户注册端点

实现用户注册功能，包括密码加密和邮箱验证。

- 添加 POST /api/v1/user/register 端点
- 使用 bcrypt 加密密码
- 添加邮箱验证检查
```
