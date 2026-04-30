"""
FastAPI 路由模板

使用说明：
1. 将此文件复制到 <project>/api/v1/<module>.py
2. 替换所有 <MODULE>、<Model> 等占位符
3. 在 <project>/api/v1/routes.py 中注册路由
4. 在 <project>/api/models.py 中添加对应的 Pydantic 模型
"""
from typing import Annotated
from fastapi import APIRouter, Depends, status, HTTPException
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
    try:
        # 业务逻辑
        result = await repository.create(data.model_dump())
        return models.CommonResponse(data=models.<Model>.model_validate(result))
    except Exception as e:
        # 处理异常
        return models.CommonResponse(code=-1, message=str(e))


@router.get("/{item_id}", status_code=status.HTTP_200_OK)
async def get_<item>(
    item_id: str,
    repository: <Module>Repository,
) -> models.CommonResponse:
    """获取单个资源"""
    try:
        item = await repository.get(item_id)
        if not item:
            return models.CommonResponse(code=-1, message="<Model> not found")
        return models.CommonResponse(data=models.<Model>.model_validate(item))
    except Exception as e:
        return models.CommonResponse(code=-1, message=str(e))


@router.get("/", status_code=status.HTTP_200_OK)
async def list_<items>(
    page: int = 1,
    page_size: int = 10,
    repository: <Module>Repository,
) -> models.CommonResponse:
    """获取资源列表"""
    try:
        items = await repository.filter(
            order_by=db_models.<Model>.created_at.desc(),
            limit=page_size,
            offset=(page - 1) * page_size
        )
        return models.CommonResponse(
            data=[models.<Model>.model_validate(item) for item in items]
        )
    except Exception as e:
        return models.CommonResponse(code=-1, message=str(e))


@router.put("/{item_id}", status_code=status.HTTP_200_OK)
async def update_<item>(
    item_id: str,
    data: models.Update<Model>Payload,
    repository: <Module>Repository,
) -> models.CommonResponse:
    """更新资源"""
    try:
        item = await repository.get(item_id)
        if not item:
            return models.CommonResponse(code=-1, message="<Model> not found")

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(item, key, value)

        await repository.session.commit()
        await repository.session.refresh(item)

        return models.CommonResponse(data=models.<Model>.model_validate(item))
    except Exception as e:
        await repository.session.rollback()
        return models.CommonResponse(code=-1, message=str(e))


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
async def delete_<item>(
    item_id: str,
    repository: <Module>Repository,
) -> models.CommonResponse:
    """删除资源"""
    try:
        item = await repository.get(item_id)
        if not item:
            return models.CommonResponse(code=-1, message="<Model> not found")

        await repository.session.delete(item)
        await repository.session.commit()

        return models.CommonResponse(code=0, message="Deleted successfully")
    except Exception as e:
        await repository.session.rollback()
        return models.CommonResponse(code=-1, message=str(e))
