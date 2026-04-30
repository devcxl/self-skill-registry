"""
Pydantic 模型模板

使用说明：
1. 将此文件内容添加到 <project>/api/models.py
2. 替换所有 <Model> 等占位符
3. 根据实际需求调整字段定义和验证规则
"""
from pydantic import BaseModel, ConfigDict, Field, EmailStr, validator


class <Model>(BaseModel):
    """模型响应数据"""
    model_config = ConfigDict(from_attributes=True)
    name: str
    description: str | None = None
    enabled: bool = True
    # 其他字段...


class Create<Model>Payload(BaseModel):
    """创建请求体"""
    name: str = Field(min_length=1, max_length=100, description="名称")
    description: str | None = Field(default=None, max_length=500, description="描述")
    enabled: bool = Field(default=True, description="是否启用")
    # 其他字段...


class Update<Model>Payload(BaseModel):
    """更新请求体"""
    name: str | None = Field(default=None, min_length=1, max_length=100, description="名称")
    description: str | None = Field(default=None, max_length=500, description="描述")
    enabled: bool | None = Field(default=None, description="是否启用")
    # 其他字段...


# 常用字段验证示例：

# 字符串长度验证
# username: str = Field(min_length=5, max_length=18, description="用户名")

# 邮箱验证
# email: EmailStr = Field(description="邮箱地址")

# 整数范围验证
# age: int = Field(gt=0, le=150, description="年龄")

# 正则表达式验证
# phone: str = Field(pattern=r'^\d{11}$', description="手机号")

# 自定义验证器
# @validator('username')
# def username_alphanumeric(cls, v):
#     if not v.isalnum():
#         raise ValueError('Username must be alphanumeric')
#     return v

# 可选字段
# nickname: str | None = Field(default=None, max_length=50, description="昵称")

# 枚举类型
# from enum import Enum
# class Status(str, Enum):
#     ACTIVE = "active"
#     INACTIVE = "inactive"
# status: Status = Field(default=Status.ACTIVE, description="状态")
