"""
测试模板

使用说明：
1. 将此文件复制到 tests/test_<module>.py
2. 替换所有 <MODULE>、<Model> 等占位符
3. 根据实际需求调整测试用例
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_create_<model>(client: AsyncClient):
    """测试创建资源"""
    response = await client.post(
        "/api/v1/<module>/create",
        json={
            "name": "test",
            "description": "test description",
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["name"] == "test"


@pytest.mark.asyncio
async def test_get_<model>(client: AsyncClient, test_db: AsyncSession):
    """测试获取单个资源"""
    # 先创建一个测试数据
    from <project>.database import models as db_models
    from <project>.database.repository import DatabaseRepository

    repository = DatabaseRepository(db_models.<Model>, test_db)
    test_item = await repository.create({
        "name": "test",
        "description": "test description",
    })

    # 获取资源
    response = await client.get(f"/api/v1/<module>/{test_item.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["id"] == str(test_item.id)


@pytest.mark.asyncio
async def test_list_<models>(client: AsyncClient):
    """测试获取资源列表"""
    response = await client.get("/api/v1/<module>/")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_update_<model>(client: AsyncClient, test_db: AsyncSession):
    """测试更新资源"""
    from <project>.database import models as db_models
    from <project>.database.repository import DatabaseRepository

    repository = DatabaseRepository(db_models.<Model>, test_db)
    test_item = await repository.create({
        "name": "test",
        "description": "test description",
    })

    # 更新资源
    response = await client.put(
        f"/api/v1/<module>/{test_item.id}",
        json={
            "name": "updated",
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["data"]["name"] == "updated"


@pytest.mark.asyncio
async def test_delete_<model>(client: AsyncClient, test_db: AsyncSession):
    """测试删除资源"""
    from <project>.database import models as db_models
    from <project>.database.repository import DatabaseRepository

    repository = DatabaseRepository(db_models.<Model>, test_db)
    test_item = await repository.create({
        "name": "test",
        "description": "test description",
    })

    # 删除资源
    response = await client.delete(f"/api/v1/<module>/{test_item.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0

    # 验证已删除
    deleted_item = await repository.get(test_item.id)
    assert deleted_item is None


@pytest.mark.asyncio
async def test_create_<model>_validation_error(client: AsyncClient):
    """测试创建资源时的验证错误"""
    response = await client.post(
        "/api/v1/<module>/create",
        json={
            "name": "",  # 空字符串应该触发验证错误
        }
    )
    # 根据实际情况调整期望的状态码
    assert response.status_code in [400, 422]


# 常用测试 fixture（在 tests/conftest.py 中定义）：

# @pytest.fixture
# async def client():
#     """创建测试客户端"""
#     from <project>.app import app
#     from <project>.database.session import get_db_session
#     from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
#
#     # 使用内存数据库进行测试
#     TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
#
#     engine = create_async_engine(TEST_DATABASE_URL)
#     async_session_maker = async_sessionmaker(engine, expire_on_commit=False)
#
#     async def override_get_db():
#         async with async_session_maker() as session:
#             yield session
#
#     app.dependency_overrides[get_db_session] = override_get_db
#
#     from <project>.database.models import Base
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)
#
#     async with AsyncClient(app=app, base_url="http://test") as ac:
#         yield ac
#
#     app.dependency_overrides.clear()


# @pytest.fixture
# async def test_db(client: AsyncClient):
#     """创建测试数据库会话"""
#     from <project>.database.session import get_db_session
#
#     async for session in get_db_session():
#         yield session
#         await session.rollback()
