from celery import shared_task


@shared_task
def refresh_public_aggregates() -> str:
    # Placeholder background job hook for scheduled aggregate refresh.
    return "queued"


@shared_task
def generate_report_async(report_id: int) -> str:
    return f"report:{report_id}:queued"


@shared_task
def send_transactional_email(email_id: int) -> str:
    return f"email:{email_id}:queued"
