#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from abc import ABC, abstractmethod


class EmbeddingModel(ABC):
    """
    Port: what the application needs from an embedding model.

    The domain only knows this interface. The real model (PyTorch,
    sentence-transformers) lives in the infrastructure layer and implements it.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Identifier of the model, e.g. 'BAAI/bge-small-en-v1.5'."""

    @property
    @abstractmethod
    def query_prefix(self) -> str:
        """Text this model expects in front of a search query ('' if none)."""

    @abstractmethod
    def encode(self, texts: list[str]) -> list[list[float]]:
        """Turn each text into one normalised vector, in the same order."""
