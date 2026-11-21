#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from typing import Annotated

from fastapi import Depends
from fastapi.routing import APIRouter

from src.module.infrastructure.container import Container
from src.routers.dependencies import get_container


class Health:
    """
    Class proxy Health.
    """

    def __init__(self):
        self.router = APIRouter()
        self.set_customized_router()

    @staticmethod
    def get_router():
        health = Health()
        return health.router

    def set_customized_router(self):

        @self.router.get("/live")
        async def liveness():
            """
            The process is up. Used by container orchestrators to restart it.
            """
            return {"status": "ok"}

        @self.router.get("/ready")
        async def readiness(container: Annotated[Container, Depends(get_container)]):
            """
            The process can serve requests: the embedding model is loaded.
            """
            return {"status": "ok", "model": container.embedding_model.name}
