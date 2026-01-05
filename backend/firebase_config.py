import firebase_admin
from firebase_admin import credentials, firestore
import os

def initialize_firebase():
    # Check if already initialized to avoid errors during reloads
    if not firebase_admin._apps:
        # Expecting the path to the service account JSON in an environment variable
        # OR you can hardcode the path for testing (not recommended for production)
        cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "service-account.json")
        
        if not os.path.exists(cred_path):
             print(f"Warning: Firebase credentials not found at {cred_path}")
             return None

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized successfully.")
    
    return firestore.client()

db = initialize_firebase()
