---
title: Python
description: 摘要
categories:
  - 大杂烩
tags:
  - 大杂烩
column:
cover:
draft: true
unlisted: true
pinned: false
aiSummary: true
outdate: true
date: 2026-03-09 15:16
updated: 2026-03-22 13:13
slug: 'python'
---

## 创建路由

独立路由模块+main 挂载

1. 首先创建 news 路由

```python
from fastapi import APIRouter

## 创建 APIRouter 实例
router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("/categories")
async def get_categories():
    return {"msg":"success"}
```

2. 挂载

```python
from fastapi import FastAPI
from routers import news
app = FastAPI()


app.include_router(news.router)
```
