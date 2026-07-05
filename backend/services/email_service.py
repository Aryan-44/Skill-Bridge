from models import EmailNotificationRequest


class EmailService:
    def send(self, email_req: EmailNotificationRequest) -> dict[str, str]:
        print("\n[MOCK EMAIL SERVICE]")
        print(f"To: {email_req.to_email}")
        print(f"Subject: {email_req.subject}")
        print(f"Body: {email_req.body}")
        print("[END EMAIL]\n")

        return {"status": "sent", "message": "Email logged to console"}
