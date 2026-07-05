import llm_utils


class ChatService:
    def chat(self, history, message) -> str:
        return llm_utils.chat_with_bot(history, message)
