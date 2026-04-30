"""
FastAPI 应用入口模板

使用说明：
1. 将此文件内容复制到 <project>/app.py
2. 替换所有占位符
3. 根据项目需求添加中间件和异常处理器
"""
import time
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from <project>.api.v1.routes import router as v1_router
from <project>.config import settings

# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.project_name,
    description="项目描述",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# 配置 CORS（跨域资源共享）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if hasattr(settings, "cors_origins") else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(v1_router, prefix="/api")


# 中间件：添加处理时间头
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """记录每个请求的处理时间"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# 挂载静态文件（前端构建产物）
# 注意：这应该在所有路由之后挂载，以避免覆盖 API 端点
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"

# 检查静态文件目录是否存在
if frontend_dist.exists() and frontend_dist.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=str(frontend_dist), html=True),
        name="frontend"
    )
else:
    # 开发环境：可以打印警告或跳过
    import logging
    logging.warning(f"Frontend static directory not found: {frontend_dist}")


# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok", "service": settings.project_name}


# 启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时执行的操作"""
    import logging
    logging.info(f"{settings.project_name} is starting...")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行的操作"""
    import logging
    logging.info(f"{settings.project_name} is shutting down...")


# 全局异常处理器（可选）
# @app.exception_handler(Exception)
# async def global_exception_handler(request: Request, exc: Exception):
#     import logging
#     logging.error(f"Unhandled exception: {exc}", exc_info=True)
#     return JSONResponse(
#         status_code=500,
#         content={"code": -1, "message": "Internal server error"}
#     )


# 以下为配置示例

# 1. 自定义 CORS 配置（在 config.py 中添加）
"""
class Settings(BaseSettings):
    # 其他配置...

    # CORS 配置
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://yourdomain.com",
    ]
"""

# 2. 前端目录配置（在 config.py 中添加）
"""
from pathlib import Path

class Settings(BaseSettings):
    # 其他配置...

    # 前端静态文件目录
    frontend_dist_path: str = "frontend/dist"

    @property
    def frontend_dist(self) -> Path:
        \"\"\"获取前端静态文件目录绝对路径\"\"\"
        base_path = Path(__file__).parent.parent
        return base_path / self.frontend_dist_path
"""

# 3. 使用配置的静态文件挂载
"""
from <project>.config import settings

app.mount(
    "/",
    StaticFiles(directory=str(settings.frontend_dist), html=True),
    name="frontend"
)
"""


# 常用配置选项：

# 禁用 API 文档（生产环境）
# app = FastAPI(
#     docs_url=None,
#     redoc_url=None,
# )

# 自定义静态文件路径
# static_dir = Path(__file__).parent / "static"
# app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# 多个静态文件目录
# app.mount("/images", StaticFiles(directory="static/images"), name="images")
# app.mount("/css", StaticFiles(directory="static/css"), name="css")


# 开发 vs 生产环境配置：

# 开发环境：
# - 启用详细的错误信息
# - 启用 API 文档
# - 使用宽松的 CORS 策略

# 生产环境：
# - 禁用详细错误信息
# - 限制或禁用 API 文档
# - 严格的 CORS 策略
# - 使用 HTTPS
