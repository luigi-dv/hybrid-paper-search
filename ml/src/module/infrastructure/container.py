#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from dataclasses import dataclass

from src.module.application.services.embedding_service import EmbeddingService
from src.module.domain.ports.embedding_model import EmbeddingModel
from src.module.infrastructure.sentence_transformer_model import SentenceTransformerModel
from src.service_config import ServiceConfig


@dataclass(frozen=True)
class Container:
    """
    Composition root: the one place where concrete classes are chosen and
    wired together. Built once at startup and shared by every request.
    """

    embedding_model: EmbeddingModel
    embedding_service: EmbeddingService

    @staticmethod
    def build(settings: ServiceConfig) -> "Container":
        model = SentenceTransformerModel(settings.EMBEDDING_MODEL_NAME)
        return Container(
            embedding_model=model,
            embedding_service=EmbeddingService(model),
        )
