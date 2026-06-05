from celery.schedules import crontab
from worker.celery_app import app
from app.config import get_settings

settings = get_settings()

app.conf.beat_schedule = {
    "scan-all-active-products": {
        "task": "worker.tasks.scan_batch.scan_all_active_products",
        "schedule": crontab(minute=f"*/{settings.scan_batch_interval_minutes}"),
        "options": {"queue": "monitoring"},
    },
    "session-health-check": {
        "task": "worker.tasks.health_check.check_session_validity",
        "schedule": crontab(minute=0, hour="*/2"),
        "options": {"queue": "default"},
    },
}
