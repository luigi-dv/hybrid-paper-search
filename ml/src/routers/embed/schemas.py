#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from pydantic import BaseModel, Field

MAX_TEXTS_PER_REQUEST = 128


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=MAX_TEXTS_PER_REQUEST)
    is_query: bool = False


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
