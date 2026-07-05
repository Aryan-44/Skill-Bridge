from services.chat_service import ChatService
from services.email_service import EmailService
from services.resume_service import ResumeService
from services.search_service import SearchService


def test_services_are_available():
    assert ResumeService.__name__ == "ResumeService"
    assert EmailService.__name__ == "EmailService"
    assert ChatService.__name__ == "ChatService"
    assert SearchService.__name__ == "SearchService"
