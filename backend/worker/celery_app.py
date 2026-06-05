import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from celery import Celery
from app.config import get_settings

settings = get_settings()

app = Celery(
    "omarket_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "worker.tasks.scan_product",
        "worker.tasks.scan_batch",
        "worker.tasks.update_price",
        "worker.tasks.health_check",
    ],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Almaty",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
    result_expires=3600,
)
