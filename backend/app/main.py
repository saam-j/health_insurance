from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.data.loader import get_dataset


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_dataset()  # load + clean once at startup so bad data fails early and the first request is fast
    yield


app = FastAPI(title="Healthcare Insurance Cost Analysis API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.frontend_origin.split(",") if o.strip()], allow_methods=["GET"], allow_headers=["*"])
app.include_router(router)
