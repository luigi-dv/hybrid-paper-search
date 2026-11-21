#!/usr/bin/env python3
# -*- coding: utf-8 -*-

__author__ = "luigelo@ldvloper.com"

from fastapi import Request

from src.module.infrastructure.container import Container


def get_container(request: Request) -> Container:
    """
    The container built in the lifespan function of main.py.
    """
    return request.app.state.container
