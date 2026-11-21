#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class ServiceConfig(BaseSettings):
    """
    Service configuration, read from environment variables and an optional `.env` file.
    Every value has a default, so the service starts with an empty `.env`.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # SERVICE
    SERVICE_NAME: str = "ML Service - HPS"
    SERVICE_DESCRIPTION: str = "Machine Learning Service for Hybrid Paper Search"
    SERVICE_VERSION: str = "0.1.0"
    LOG_LEVEL: str = "INFO"

    # MODEL
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-small-en-v1.5"


@lru_cache
def get_settings() -> ServiceConfig:
    """
    Load the service configuration once per process.
    """
    return ServiceConfig()
