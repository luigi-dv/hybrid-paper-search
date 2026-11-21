#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from sentence_transformers import SentenceTransformer

from src.module.domain.ports.embedding_model import EmbeddingModel

# bge v1.5 was trained with this text in front of search queries (not in front
# of the passages being searched). It belongs here because it is a detail of
# this model family, not of the application.
BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


class SentenceTransformerModel(EmbeddingModel):
    """
    Adapter: implements the EmbeddingModel port with sentence-transformers.
    """

    def __init__(self, model_name: str) -> None:
        self._name = model_name
        # Slow and heavy (seconds, hundreds of MB): done once, at startup.
        self._model = SentenceTransformer(model_name)

    @property
    def name(self) -> str:
        return self._name

    @property
    def query_prefix(self) -> str:
        return BGE_QUERY_PREFIX

    def encode(self, texts: list[str]) -> list[list[float]]:
        vectors = self._model.encode(texts, normalize_embeddings=True)
        return vectors.tolist()
