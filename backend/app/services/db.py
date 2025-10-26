from firebase_admin import firestore


def get_db() -> firestore.Client:
    return firestore.client()


