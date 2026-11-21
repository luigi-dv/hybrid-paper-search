#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from src.module.domain.ports.embedding_model import EmbeddingModel


class EmbeddingService:
    """
    Use case: embed a list of texts.

    Depends only on the EmbeddingModel port, so it can be tested with a fake
    model and never imports PyTorch.
    """

    def __init__(self, model: EmbeddingModel) -> None:
        self._model = model

    def embed(self, texts: list[str], is_query: bool = False) -> list[list[float]]:
        """
        The query prefix is added here, in the service, so every client gets
        the same behavior and none of them needs to know the model's rule.
        """
        if is_query:
            texts = [self._model.query_prefix + text for text in texts]
        return self._model.encode(texts)