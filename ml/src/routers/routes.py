#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from fastapi import APIRouter

from src.routers.embed.embed import Embed
from src.routers.health.health import Health

router = APIRouter()


@router.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "detail": "The API is alive"}


router.include_router(Health.get_router(), prefix="/health", tags=["Health"])
router.include_router(Embed.get_router(), prefix="/embed", tags=["Embed"])
