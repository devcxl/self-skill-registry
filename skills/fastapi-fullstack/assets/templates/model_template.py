"""
SQLAlchemy ORM 模型模板

使用说明：
1. 将此文件内容添加到 <project>/database/models.py
2. 替换所有 <Model>、<table_name> 等占位符
3. 根据实际需求调整字段定义
4. 如果需要多对多关系，参考下方的示例
"""
import datetime
import uuid
from sqlalchemy import orm, Column, ForeignKey
from sqlalchemy.orm import relationship


# 继承 Base 类（已在 models.py 中定义）
# from <project>.database.models import Base


class <Model>(Base):
    """模型描述"""
    __tablename__ = "<table_name>"

    # 基本字段
    name: orm.Mapped[str] = orm.mapped_column(
        nullable=False,
        unique=True,
        comment="名称"
    )

    description: orm.Mapped[str | None] = orm.mapped_column(
        nullable=True,
        comment="描述"
    )

    # 状态字段
    enabled: orm.Mapped[bool] = orm.mapped_column(
        nullable=False,
        default=True,
        comment="是否启用"
    )

    # 外键字段
    user_id: orm.Mapped[uuid.UUID] = orm.mapped_column(
        ForeignKey("user.id"),
        nullable=True,
        comment="关联用户ID"
    )

    # 关系字段（可选）
    # 一对多关系
    # related_items: orm.Mapped[list["<RelatedModel>"]] = relationship(
    #     back_populates="<model>"
    # )

    # 多对多关系示例：
    # 首先定义中间表（放在文件顶部）
    # user_server_association = Table(
    #     "user_server_association",
    #     Base.metadata,
    #     Column("user_id", ForeignKey("user.id"), primary_key=True),
    #     Column("server_id", ForeignKey("server.id"), primary_key=True),
    # )

    # 然后在模型中定义关系
    # servers: orm.Mapped[list["Server"]] = relationship(
    #     secondary=user_server_association,
    #     back_populates="users"
    # )


# 常用字段类型示例：

# 字符串
# title: orm.Mapped[str] = orm.mapped_column(nullable=False, comment="标题")

# 可选字符串
# description: orm.Mapped[str | None] = orm.mapped_column(nullable=True, comment="描述")

# 整数
# count: orm.Mapped[int] = orm.mapped_column(default=0, comment="数量")

# 布尔值
# is_active: orm.Mapped[bool] = orm.mapped_column(default=True, comment="是否激活")

# 日期时间
# expire_at: orm.Mapped[datetime.datetime] = orm.mapped_column(nullable=True, comment="过期时间")

# 外键
# user_id: orm.Mapped[uuid.UUID] = orm.mapped_column(
#     ForeignKey("user.id"),
#     nullable=False,
#     comment="用户ID"
# )

# 唯一索引
# email: orm.Mapped[str] = orm.mapped_column(
#     nullable=False,
#     unique=True,
#     comment="邮箱"
# )
