# Fastapi 常见问题和故障排查

## 数据库相关问题

### 1. 连接错误

**症状**: `OperationalError: (mysql.connector.errors.DatabaseError) 2003 (HY000): Can't connect to MySQL server`

**可能原因**:
- MySQL 服务未启动
- 连接字符串错误
- 网络连接问题

**排查步骤**:
1. 检查 MySQL 是否运行: `systemctl status mysql`
2. 检查连接字符串配置: 查看 `config.py` 中的 `database_url`
3. 测试连接: `mysql -h <host> -P <port> -u <user> -p`

**解决方案**:
- 启动 MySQL: `systemctl start mysql`
- 更新 `config.py` 中的数据库配置
- 检查防火墙设置

### 2. 表不存在

**症状**: `NoSuchTableError: user`

**可能原因**:
- 数据库未创建
- 表未创建
- 数据库迁移未运行

**排查步骤**:
1. 连接数据库检查表: `SHOW TABLES;`
2. 检查模型定义是否正确

**解决方案**:
- 创建数据库: `CREATE DATABASE hysteria;`
- 运行数据库迁移（如果有 Alembic）
- 手动创建表（开发环境）:
```python
from <project>.database.models import Base
from <project>.database.session import engine

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

### 3. 事务超时

**症状**: `TimeoutError: QueuePool limit of size 5 overflow 10 reached, connection timed out`

**可能原因**:
- 连接池配置过小
- 查询时间过长
- 连接未正确关闭

**排查步骤**:
1. 检查查询性能
2. 检查是否有连接泄漏

**解决方案**:
- 增加连接池大小:
```python
engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20
)
```
- 优化慢查询
- 确保所有数据库会话正确关闭

## API 相关问题

### 4. 400 Bad Request

**症状**: FastAPI 返回 422 Unprocessable Entity 或 400 Bad Request

**可能原因**:
- 请求体验证失败
- 缺少必填字段
- 字段类型不匹配

**排查步骤**:
1. 查看响应体中的详细错误信息
2. 检查请求体格式
3. 访问 `/api/docs` 查看API文档

**解决方案**:
- 检查 Pydantic 模型的验证规则
- 确保请求体符合模型定义
- 查看错误消息: `response.json()`

### 5. 404 Not Found

**症状**: API 端点返回 404

**可能原因**:
- 路由未正确注册
- URL 路径错误
- HTTP 方法不匹配

**排查步骤**:
1. 检查路由是否在 `routes.py` 中注册
2. 检查 URL 路径是否正确
3. 检查 HTTP 方法是否正确

**解决方案**:
```python
# 检查路由注册
from <project>.api.v1 import user

router = APIRouter()
router.include_router(user.router)  # 确保这行存在

# 检查 FastAPI 应用
app = FastAPI()
app.include_router(v1_router, prefix="/api")  # 确保前缀正确
```

### 6. 500 Internal Server Error

**症状**: 服务器返回 500 错误

**可能原因**:
- 代码逻辑错误
- 数据库操作异常
- 未处理的异常

**排查步骤**:
1. 查看服务器日志
2. 检查异常堆栈跟踪

**解决方案**:
- 在路由中添加 try-except
- 检查数据库查询是否正确
- 确保所有异步操作正确使用 `await`

## 异步相关问题

### 7. RuntimeWarning: coroutine was never awaited

**症状**: `RuntimeWarning: coroutine 'X' was never awaited`

**可能原因**:
- 忘记使用 `await`
- 同步调用异步函数

**排查步骤**:
1. 检查所有数据库操作
2. 检查所有异步函数调用

**解决方案**:
```python
# ❌ 错误
user = repository.get(user_id)

# ✅ 正确
user = await repository.get(user_id)
```

### 8. RuntimeError: Event loop is closed

**症状**: `RuntimeError: Event loop is closed`

**可能原因**:
- 在关闭的事件循环中运行异步代码
- 测试配置问题

**排查步骤**:
1. 检查 pytest 配置
2. 检查异步上下文管理器使用

**解决方案**:
- 确保 pytest 配置正确:
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```
- 使用 `@pytest.mark.asyncio` 装饰器

## 依赖注入问题

### 9. Repository 依赖注入失败

**症状**: `DependencyError: could not resolve dependency`

**可能原因**:
- 依赖注入定义错误
- 模型导入错误

**排查步骤**:
1. 检查 `get_repository` 函数
2. 检查模型导入

**解决方案**:
```python
# ✅ 正确的依赖注入定义
UserRepository = Annotated[
    DatabaseRepository[db_models.User],
    Depends(get_repository(db_models.User)),
]

# 确保导入正确
from <project>.database import models as db_models
from <project>.api.dependencies import get_repository
```

## 密码加密问题

### 10. 密码验证失败

**症状**: 密码验证始终返回 False

**可能原因**:
- 密码未正确加密
- 编码问题
- salt 不匹配

**排查步骤**:
1. 检查密码加密过程
2. 检查密码存储格式

**解决方案**:
```python
# 加密密码（存储时）
hashed_password = bcrypt.hashpw(
    password.encode('utf-8'),
    bcrypt.gensalt()
).decode('utf-8')

# 验证密码（登录时）
is_valid = bcrypt.checkpw(
    password.encode('utf-8'),
    hashed_password.encode('utf-8')
)
```

## 性能问题

### 11. 查询响应慢

**症状**: API 响应时间过长

**可能原因**:
- N+1 查询问题
- 缺少索引
- 查询数据量过大

**排查步骤**:
1. 检查查询日志
2. 使用数据库分析工具

**解决方案**:
- 使用 `selectinload` 或 `joinedload` 预加载关系:
```python
from sqlalchemy.orm import selectinload

query = select(User).options(
    selectinload(User.servers)
).where(User.enabled == True)
```
- 添加数据库索引
- 使用分页查询

### 12. 内存占用高

**症状**: 进程内存持续增长

**可能原因**:
- 连接池配置过大
- 对象未释放
- 缓存未清理

**排查步骤**:
1. 检查连接池配置
2. 使用内存分析工具

**解决方案**:
- 调整连接池大小
- 使用生成器处理大数据集
- 定期清理缓存

## 测试问题

### 13. 测试数据库连接失败

**症状**: 测试时数据库连接错误

**可能原因**:
- 测试数据库配置错误
- 测试 fixture 配置问题

**排查步骤**:
1. 检查 `tests/conftest.py` 配置
2. 检查测试环境变量

**解决方案**:
- 配置独立的测试数据库
- 使用测试 fixture:
```python
@pytest.fixture
async def test_db():
    # 创建测试会话
    async with get_db_session() as session:
        yield session
        # 清理测试数据
        await session.rollback()
```

## 部署问题

### 14. Docker 容器无法启动

**症状**: Docker 容器启动失败

**可能原因**:
- 依赖缺失
- 环境变量未设置
- 端口冲突

**排查步骤**:
1. 查看容器日志: `docker logs <container>`
2. 检查 Dockerfile
3. 检查 docker-compose.yml

**解决方案**:
- 确保所有依赖在 `requirements.txt` 中
- 设置正确的环境变量
- 修改端口映射

### 15. 环境变量未生效

**症状**: 环境变量配置不生效

**可能原因**:
- .env 文件未加载
- 环境变量名称拼写错误

**排查步骤**:
1. 检查 .env 文件路径
2. 打印环境变量验证

**解决方案**:
```python
# 确保使用正确的环境变量加载方式
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str  # 自动从 DATABASE_URL 加载

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
```

## 调试技巧

### 启用详细日志

```python
import logging

logging.basicConfig(level=logging.DEBUG)

# 数据库查询日志
import sqlalchemy.engine
sqlalchemy.engine.logger.setLevel(logging.INFO)
```

### 使用 FastAPI 自动文档

访问 `http://localhost:8000/api/docs` 查看 API 文档和测试端点

### 数据库查询日志

```python
# 在配置中启用 SQL 日志
engine = create_async_engine(
    settings.database_url,
    echo=True  # 打印所有 SQL 查询
)
```

### 异常信息

```python
import traceback

try:
    # 可能出错的代码
    pass
except Exception as e:
    print(f"Error: {e}")
    print(traceback.format_exc())
```

## 常用调试命令

```bash
# 运行应用
uvicorn <project>.app:app --reload

# 运行测试
pytest -v

# 检查代码风格
ruff check .

# 格式化代码
ruff format .

# 类型检查
pyright

# 查看日志
tail -f /var/log/app.log
```
