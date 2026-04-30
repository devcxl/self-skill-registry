# Fastapi 项目架构

## 技术栈

- **Web 框架**: FastAPI
- **ORM**: SQLAlchemy 2.0 (异步模式)
- **数据库**: MySQL (aiomysql 驱动)
- **配置管理**: Pydantic Settings (pydantic-settings)
- **密码加密**: bcrypt
- **测试框架**: pytest
- **代码质量**: ruff (linting), pyright (type checking)

## 项目结构

```
<project>/
├── <project>/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── routes.py          # 路由聚合
│   │   │   └── user.py            # 用户相关端点
│   │   ├── dependencies.py        # 依赖注入 (get_repository)
│   │   └── models.py              # Pydantic 请求/响应模型
│   ├── database/
│   │   ├── models.py              # SQLAlchemy ORM 模型
│   │   ├── repository.py          # 通用数据库仓储
│   │   ├── session.py             # 数据库会话管理
│   │   └── __init__.py
│   ├── app.py                     # FastAPI 应用入口
│   ├── config.py                  # 配置管理
│   └── utils.py                   # 工具函数
├── tests/
│   ├── conftest.py                # pytest 配置和 fixtures
│   ├── test_api.py                # API 测试
│   └── secret.py                  # 测试用密钥
├── pyproject.toml                 # 项目配置
└── Dockerfile                     # Docker 配置
```

## 核心组件

### 1. FastAPI 应用入口 (`app.py`)

```python
app = FastAPI(
    title=settings.project_name,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.include_router(v1_router, prefix="/api")

# 挂载静态文件（前端构建产物）
from fastapi.staticfiles import StaticFiles
from pathlib import Path

frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
```

### 2. 数据库会话管理 (`database/session.py`)

使用异步 SQLAlchemy 引擎和会话工厂：

```python
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(settings.database_url)
    factory = async_sessionmaker(engine)
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except exc.SQLAlchemyError:
            await session.rollback()
            raise
```

### 3. 通用 Repository (`database/repository.py`)

泛型 Repository 提供通用的数据库操作：

- `create(data)` - 创建新记录
- `get(pk)` - 通过主键获取
- `get_by(*conditions)` - 通过条件查询
- `filter(*conditions, order_by, limit, offset)` - 复杂查询
- `select_column(column, *conditions)` - 查询特定列

### 4. 依赖注入 (`api/dependencies.py`)

```python
def get_repository(model: Type[Model]) -> Callable[[], DatabaseRepository[Model]]:
    async def _get_repository(
        session: AsyncSession = Depends(get_db_session)
    ) -> DatabaseRepository[Model]:
        return DatabaseRepository(model, session)
    return _get_repository
```

在路由中使用：

```python
UserRepository = Annotated[
    DatabaseRepository[User],
    Depends(get_repository(User)),
]
```

### 5. ORM 模型 (`database/models.py`)

继承自 `Base` 类，包含通用字段：

```python
class Base(orm.DeclarativeBase):
    id: orm.Mapped[uuid.UUID] = orm.mapped_column(primary_key=True, default=uuid.uuid4)
    created_at: orm.Mapped[datetime.datetime] = orm.mapped_column(default=datetime.datetime.now)
    updated_at: orm.Mapped[datetime.datetime] = orm.mapped_column(
        default=datetime.datetime.now,
        onupdate=datetime.datetime.now
    )
```

多对多关系示例（用户-服务器）：

```python
user_server_association = Table(
    "user_server_association",
    Base.metadata,
    Column("user_id", ForeignKey("user.id"), primary_key=True),
    Column("server_id", ForeignKey("server.id"), primary_key=True),
)

class User(Base):
    servers: orm.Mapped[list["Server"]] = relationship(
        secondary=user_server_association,
        back_populates="users"
    )

class Server(Base):
    users: orm.Mapped[list["User"]] = relationship(
        secondary=user_server_association,
        back_populates="servers"
    )
```

## 数据流转

### 请求流程

1. 客户端发送 HTTP 请求
2. FastAPI 路由接收请求
3. 依赖注入创建数据库会话和 Repository
4. 路由处理器调用 Repository 方法
5. Repository 执行 SQLAlchemy 查询
6. 数据返回给路由处理器
7. 路由处理器返回 Pydantic 响应模型
8. FastAPI 序列化并返回 JSON 响应

### 数据库事务

- 每个请求自动创建新的事务
- 成功时自动提交
- 异常时自动回滚
- 使用 `async with` 确保会话正确关闭

## 异步特性

所有数据库操作都是异步的：

```python
# 路由处理器
async def get_user(user_id: uuid.UUID, repository: UserRepository) -> CommonResponse:
    user = await repository.get(user_id)
    return CommonResponse(data=User.model_validate(user))

# Repository 方法
async def get(self, pk: uuid.UUID) -> Model | None:
    return await self.session.get(self.model, pk)
```

## 配置管理

使用 Pydantic Settings：

```python
class Settings(BaseSettings):
    project_name: str = "Fastapi"
    debug: bool = False
    environment: str = "local"
    database_url: str = "mysql+aiomysql://..."
    domain_address: str = "http://127.0.0.1:8000"

settings = Settings()
```

## 测试配置

pytest 配置在 `pyproject.toml`：

```toml
[tool.pytest.ini_options]
pythonpath = "<project>"
testpaths = "tests"
asyncio_mode = "auto"
```

测试 fixture 在 `tests/conftest.py` 中定义。
