#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Embedding service for hps (Hybrid Paper Search).

POST /embed turns a list of texts into 384-dimensional vectors with
BAAI/bge-small-en-v1.5. Run from this folder with: uvicorn main:app --port 8001
"""

__author__ = "luigelo@ldvloper.com"

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.module.infrastructure.container import Container
from src.routers.routes import router
from src.service_config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once before the server accepts requests: build the container,
    # which loads the model into memory.
    app.state.container = Container.build(get_settings())
    yield
    del app.state.container


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=settings.LOG_LEVEL)

    app = FastAPI(
        title=settings.SERVICE_NAME,
        description=settings.SERVICE_DESCRIPTION,
        version=settings.SERVICE_VERSION,
        lifespan=lifespan,
    )
    app.include_router(router)
    return app


app = create_app()
