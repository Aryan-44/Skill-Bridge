import firebase_admin
from firebase_admin import credentials, firestore
import os
import uuid


# ---------------------------------------------------------------------------
# In-memory mock Firestore – used automatically when real credentials are
# absent or invalid. Supports: collection().add(), collection().stream(),
# collection().document(id).get()  – the only operations used by this app.
# ---------------------------------------------------------------------------

class _MockDocRef:
    def __init__(self, data: dict, doc_id: str):
        self._data = data
        self.id = doc_id

    def to_dict(self):
        return self._data


class _MockOrderedResult:
    """Wraps a list so it behaves like a Firestore stream (iterable)."""
    def __init__(self, docs):
        self._docs = docs

    def __iter__(self):
        return iter(self._docs)

    def stream(self):
        return iter(self._docs)


class _MockCollection:
    def __init__(self):
        self._docs: dict[str, _MockDocRef] = {}

    def add(self, data: dict):
        doc_id = str(uuid.uuid4())
        ref = _MockDocRef(data, doc_id)
        self._docs[doc_id] = ref
        # Firestore returns (update_time, DocumentReference) – mimic that
        return (None, ref)

    def order_by(self, field, direction="ASCENDING"):
        """Sort in-memory and return self so .stream() still works."""
        reverse = direction == "DESCENDING"
        sorted_docs = sorted(
            self._docs.values(),
            key=lambda d: d._data.get(field, ""),
            reverse=reverse,
        )
        return _MockOrderedResult(sorted_docs)

    def stream(self):
        return iter(self._docs.values())

    def document(self, doc_id: str):
        return self._docs.get(doc_id, _MockDocRef({}, doc_id))


class MockFirestore:
    """Minimal in-memory Firestore replacement for local development."""
    def __init__(self):
        self._collections: dict[str, _MockCollection] = {}

    def collection(self, name: str) -> _MockCollection:
        if name not in self._collections:
            self._collections[name] = _MockCollection()
        return self._collections[name]


# ---------------------------------------------------------------------------
# Initialisation
# ---------------------------------------------------------------------------

def initialize_firebase():
    """Try to connect to real Firestore; fall back to MockFirestore."""
    if firebase_admin._apps:
        # Already initialised in a previous hot-reload cycle
        try:
            return firestore.client()
        except Exception:
            pass

    cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "service-account.json")

    if os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("[Firebase] Initialized with service account:", cred_path)
            return firestore.client()
        except Exception as e:
            print(f"[Firebase] Could not initialize with {cred_path}: {e}")
    else:
        print(f"[Firebase] Credentials file not found: {cred_path}")

    print("[Firebase] Falling back to in-memory MockFirestore (dev mode).")
    return MockFirestore()


db = initialize_firebase()
