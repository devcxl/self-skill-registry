# Fastapi 常用代码模式

## 1. 创建新的 API 端点

### 路由文件 (`api/v1/<module>.py`)

```python
from typing import Annotated
from fastapi import APIRouter, Depends, status
from <project>.api import models
from <project>.api.dependencies import get_repository
from <project>.database import models as db_models
from <project>.database.repository import DatabaseRepository

router = APIRouter(prefix="/<module>")

# 定义 Repository 依赖
<Module>Repository = Annotated[
    DatabaseRepository[db_models.<Model>],
    Depends(get_repository(db_models.<Model>)),
]

@router.post("/<action>", status_code=status.HTTP_200_OK)
async def <action>(
    data: models.<Action>Payload,
    repository: <Module>Repository,
) -> models.CommonResponse:
    """功能描述"""
    # 业务逻辑
    return models.CommonResponse(data=models.<Model>.model_validate(result))
```

### 注册路由 (`api/v1/routes.py`)

```python
from fastapi import APIRouter
from <project>.api.v1 import user, <module>

router = APIRouter()
router.include_router(user.router)
router.include_router(<module>.router)
```

## 2. 创建新的数据库模型

### ORM 模型 (`database/models.py`)

```python
class <Model>(Base):
    """模型描述"""
    __tablename__ = "<table_name>"

    # 字段定义
    name: orm.Mapped[str] = orm.mapped_column(
        nullable=False,
        unique=True,
        comment="字段说明"
    )

    # 可选：关系
    related_items: orm.Mapped[list["RelatedModel"]] = relationship(
        back_populates="<model>"
    )
```

### Pydantic 模型 (`api/models.py`)

```python
class <Model>(BaseModel):
    """模型描述"""
    model_config = ConfigDict(from_attributes=True)
    name: str
    # 其他字段

class Create<Model>Payload(BaseModel):
    """创建请求体"""
    name: str = Field(min_length=1, max_length=100)
    # 其他字段

class Update<Model>Payload(BaseModel):
    """更新请求体"""
    name: str | None = Field(default=None, min_length=1, max_length=100)
    # 其他字段
```

## 3. Repository 使用模式

### 基本查询

```python
# 通过主键获取
user = await repository.get(user_id)

# 通过条件获取单个
user = await repository.get_by(
    db_models.User.username == username,
    db_models.User.enabled == True
)

# 过滤多个结果
users = await repository.filter(
    db_models.User.enabled == True,
    order_by=db_models.User.created_at.desc(),
    limit=10,
    offset=0
)

# 查询特定列
usernames = await repository.select_column(
    db_models.User.username,
    db_models.User.enabled == True
)
```

### 创建记录

```python
data = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "hashed_password"
}
user = await repository.create(data)
```

### 更新记录（手动）

```python
user = await repository.get_by(db_models.User.username == "testuser")
if user:
    user.email = "newemail@example.com"
    await session.commit()
    await session.refresh(user)
```

### 删除记录（手动）

```python
user = await repository.get_by(db_models.User.username == "testuser")
if user:
    await session.delete(user)
    await session.commit()
```

## 4. 依赖注入模式

### 在路由中使用 Repository

```python
UserRepository = Annotated[
    DatabaseRepository[db_models.User],
    Depends(get_repository(db_models.User)),
]

async def get_user(
    user_id: uuid.UUID,
    repository: UserRepository,
) -> models.CommonResponse:
    user = await repository.get(user_id)
    return models.CommonResponse(data=models.User.model_validate(user))
```

### 使用数据库会话

```python
from <project>.database.session import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession

async def custom_query(
    session: AsyncSession = Depends(get_db_session),
) -> models.CommonResponse:
    result = await session.execute(select(db_models.User))
    users = result.scalars().all()
    return models.CommonResponse(data=[models.User.model_validate(u) for u in users])
```

## 5. 密码加密

```python
import bcrypt

# 加密密码
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# 验证密码
is_valid = bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
```

## 6. 响应模式

### 成功响应

```python
# 返回数据
return models.CommonResponse(data=models.User.model_validate(user))

# 仅成功消息
return models.CommonResponse(code=0, message="Success")
```

### 错误响应

```python
# 业务错误
return models.CommonResponse(code=-1, message="User not found")

# HTTP 错误（会触发 FastAPI 异常处理）
raise HTTPException(status_code=404, detail="User not found")
```

## 7. 多对多关系操作

```python
# 创建并关联
user = User(username="test", ...)
server = Server(name="server1", ...)
user.servers.append(server)
await repository.create(user.model_dump())

# 添加关联（现有记录）
user = await repository.get(user_id)
server = await server_repository.get(server_id)
user.servers.append(server)
await session.commit()
await session.refresh(user)

# 移除关联
user = await repository.get(user_id)
server = await server_repository.get(server_id)
user.servers.remove(server)
await session.commit()
await session.refresh(user)
```

## 8. 分页查询

```python
@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    repository: UserRepository,
) -> models.CommonResponse:
    users = await repository.filter(
        order_by=db_models.User.created_at.desc(),
        limit=page_size,
        offset=(page - 1) * page_size
    )
    return models.CommonResponse(data=[models.User.model_validate(u) for u in users])
```

## 9. 验证模式

### Pydantic 字段验证

```python
from pydantic import BaseModel, Field, EmailStr, validator

class RegisterUserPayload(BaseModel):
    username: str = Field(min_length=5, max_length=18)
    password: str = Field(min_length=12, max_length=32)
    email: EmailStr

    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v
```

## 10. 中间件

```python
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

## 11. 静态文件挂载

### 挂载前端构建产物

```python
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# 指定静态文件目录（通常是前端构建产物）
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"

# 挂载到根路径，html=True 支持 SPA 路由
app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
```

### 配置说明

- `directory`: 静态文件目录路径
- `html=True`: 对 SPA（单页应用）重要，确保前端路由正常工作
- `name="frontend"`: 挂载点的名称

### 路由优先级

**重要**：静态文件挂载应该在其他路由之后，以避免覆盖 API 端点：

```python
# ✅ 正确顺序
app = FastAPI(...)
app.include_router(v1_router, prefix="/api")  # API 路由
app.mount("/", StaticFiles(...), name="frontend")  # 静态文件挂载

# ❌ 错误顺序
app.mount("/", StaticFiles(...), name="frontend")  # 会覆盖 /api/* 路径
app.include_router(v1_router, prefix="/api")  # 永远不会被访问到
```

### 前端 API 请求配置

前端需要正确配置 API 基础 URL：

```javascript
// 开发环境
const API_BASE_URL = 'http://localhost:8000/api';

// 生产环境
const API_BASE_URL = '/api';

// 使用示例
fetch(`${API_BASE_URL}/v1/user/login`, {
    method: 'POST',
    body: JSON.stringify(data)
});
```

### 开发和部署

#### 开发环境

前端和后端可以分开运行：

```bash
# 后端
uvicorn <project>.app:app --reload --port 8000

# 前端（如使用 Vue/React）
cd frontend && npm run dev --port 3000
```

使用代理配置跨域：

```javascript
// vite.config.js (Vite)
export default {
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true
            }
        }
    }
}
```

#### 生产环境

前端构建后，将 dist 目录部署到后端服务器：

```bash
# 前端构建
cd frontend && npm run build

# 将 dist 目录复制到后端项目
cp -r frontend/dist ../<project>/
```
