#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from typing import Annotated

from fastapi import Depends
from fastapi.routing import APIRouter

from src.module.infrastructure.container import Container
from src.routers.dependencies import get_container
from src.routers.embed.schemas import EmbedRequest, EmbedResponse


class Embed:
    """
    Class proxy Embed.
    """

    def __init__(self):
        self.router = APIRouter()
        self.set_customized_router()

    @staticmethod
    def get_router():
        embed = Embed()
        return embed.router

    def set_customized_router(self):

        # A plain `def` (not `async def`): FastAPI runs it in a worker thread,
        # so the CPU-heavy encode() call does not block the event loop.
        @self.router.post("", response_model=EmbedResponse)
        def embed(
            req: EmbedRequest,
            container: Annotated[Container, Depends(get_container)],
        ) -> EmbedResponse:
            """
            Turn each text into a normalised 384-dimensional vector.
            """
            vectors = container.embedding_service.embed(req.texts, req.is_query)
            return EmbedResponse(embeddings=vectors)
