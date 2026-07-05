from fastapi import APIRouter

from models import EmailNotificationRequest
from services.email_service import EmailService

router = APIRouter(prefix="", tags=["Email"])
email_service = EmailService()


@router.post("/send-email")
def send_email_notification(email_req: EmailNotificationRequest):
    return email_service.send(email_req)
