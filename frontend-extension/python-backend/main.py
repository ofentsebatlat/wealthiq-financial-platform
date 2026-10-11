import os
import io
import base64
import pickle
import numpy as np
from PIL import Image
import face_recognition
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="WealthIQ Face Recognition Service")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Search locations for user_database.pkl (self-contained within wealthiq-capitec-extension)
DB_CANDIDATE_PATHS = [
    os.path.join(os.path.dirname(__file__), "user_database.pkl"),
    os.path.join(os.path.dirname(__file__), "..", "workspace", "cd0184", "9664b117-d773-4799-b6a3-d4640ed70218", "data", "user_database.pkl"),
    os.path.join(os.path.dirname(__file__), "..", "..", "submit-5b6d638a-3059-4128-a8f1-8fc2c40ebc38", "workspace", "cd0184", "9664b117-d773-4799-b6a3-d4640ed70218", "data", "user_database.pkl")
]

def get_db_path() -> str:
    for p in DB_CANDIDATE_PATHS:
        if os.path.exists(p):
            return os.path.abspath(p)
    return os.path.abspath(DB_CANDIDATE_PATHS[0])

def load_database() -> dict:
    path = get_db_path()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception as e:
        print(f"[FaceBackend] Error loading user database from {path}: {e}")
        return {}

def save_database(db: dict) -> None:
    # Save to primary path and synchronize all available candidate locations
    saved_any = False
    for p in DB_CANDIDATE_PATHS:
        try:
            os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
            with open(p, "wb") as f:
                pickle.dump(db, f)
            saved_any = True
        except Exception as e:
            pass
    if not saved_any:
        print(f"[FaceBackend] Warning: Failed to save database to candidate paths.")

def base64_to_rgb_array(base64_str: str) -> np.ndarray:
    if not base64_str:
        raise ValueError("Empty image data")
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    image_bytes = base64.b64decode(base64_str)
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(pil_img)

def calculate_similarity_and_match(distance: float, threshold: float = 0.6):
    is_match = distance <= threshold
    if distance <= threshold:
        # Maps 0.0 -> 100%, threshold -> 75%
        similarity = 75.0 + ((threshold - distance) / threshold) * 25.0
    else:
        # Maps threshold -> 75%, (threshold * 2) -> 0%
        similarity = max(0.0, 75.0 - ((distance - threshold) / threshold) * 75.0)
    return round(float(similarity), 2), bool(is_match)

# Models
class VerifyRequest(BaseModel):
    photo1_b64: str
    photo2_b64: str

class VerifyUserRequest(BaseModel):
    username: str
    photo_b64: str
    pin: Optional[str] = None

class EnrollUserRequest(BaseModel):
    username: str
    pin: str
    photo_b64: str

@app.get("/")
def health():
    db = load_database()
    return {
        "status": "Face Recognition API is running (Submit Module / face_recognition)",
        "users_count": len(db),
        "users": list(db.keys()),
        "db_path": get_db_path()
    }

@app.get("/users")
def get_users():
    db = load_database()
    user_list = []
    for uname, udata in db.items():
        encs = udata.get("encodings", [])
        user_list.append({
            "username": uname,
            "has_pin": bool(udata.get("pin")),
            "encodings_count": len(encs)
        })
    return {"users": user_list}

@app.post("/verify")
async def verify_two_faces(request: VerifyRequest):
    try:
        arr1 = base64_to_rgb_array(request.photo1_b64)
        arr2 = base64_to_rgb_array(request.photo2_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Base64 photo format: {e}")

    # Extract encodings
    encs1 = face_recognition.face_encodings(arr1)
    encs2 = face_recognition.face_encodings(arr2)

    if not encs1:
        raise HTTPException(status_code=400, detail="No face detected in reference photo. Please provide a clear, centered face image.")
    if not encs2:
        raise HTTPException(status_code=400, detail="No face detected in current camera frame. Please center your face in the camera.")

    # Compute Euclidean distance
    dist = float(np.linalg.norm(encs1[0] - encs2[0]))
    similarity, is_match = calculate_similarity_and_match(dist, threshold=0.6)

    advice = (
        "Facial vectors matched successfully."
        if is_match
        else "Faces do not match closely enough. Please make sure your face is well-lit, centered, and unobstructed."
    )

    return {
        "distance": round(dist, 4),
        "similarity": similarity,
        "is_match": is_match,
        "advice": advice,
        "engine": "submit_module_face_recognition"
    }

@app.post("/verify-user")
async def verify_against_registered_user(request: VerifyUserRequest):
    db = load_database()
    matched_key = None

    # Case-insensitive user lookup
    for key in db.keys():
        if key.strip().lower() == request.username.strip().lower() or request.username.strip().lower() in key.strip().lower() or key.strip().lower() in request.username.strip().lower():
            matched_key = key
            break

    if not matched_key:
        raise HTTPException(status_code=404, detail=f"User '{request.username}' not found in biometric database.")

    user_data = db[matched_key]
    stored_encs = user_data.get("encodings", [])

    if not stored_encs:
        raise HTTPException(status_code=400, detail=f"User '{matched_key}' has no registered facial encodings.")

    # Optional PIN check
    pin_matched = True
    if request.pin is not None:
        pin_matched = (str(request.pin).strip() == str(user_data.get("pin", "")).strip())
        if not pin_matched:
            return {
                "username": matched_key,
                "is_match": False,
                "pin_matched": False,
                "distance": 1.0,
                "similarity": 0.0,
                "advice": "Incorrect security PIN."
            }

    try:
        frame_arr = base64_to_rgb_array(request.photo_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid camera image format: {e}")

    live_encs = face_recognition.face_encodings(frame_arr)
    if not live_encs:
        raise HTTPException(status_code=400, detail="No face detected in camera capture. Please face the camera directly.")

    live_enc = live_encs[0]

    # Calculate distance to all registered angles/encodings for this user
    distances = face_recognition.face_distance(stored_encs, live_enc)
    min_dist = float(distances.min()) if len(distances) > 0 else 1.0

    # Submit module uses 0.45 threshold for live recognition
    similarity, is_match = calculate_similarity_and_match(min_dist, threshold=0.55)

    return {
        "username": matched_key,
        "distance": round(min_dist, 4),
        "similarity": similarity,
        "is_match": is_match,
        "pin_matched": pin_matched,
        "advice": "Identity verified successfully!" if is_match else "Face did not match registered security profile."
    }

class IdentifyRequest(BaseModel):
    photo_b64: str
    pin: Optional[str] = None

@app.post("/identify")
@app.post("/auto-detect")
async def identify_user_from_stream(request: IdentifyRequest):
    try:
        frame_arr = base64_to_rgb_array(request.photo_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid camera image: {e}")

    live_encs = face_recognition.face_encodings(frame_arr)
    if not live_encs:
        return {
            "detected": False,
            "identified": False,
            "username": None,
            "similarity": 0.0,
            "advice": "No face detected in camera frame. Please look directly into the camera."
        }

    live_enc = live_encs[0]
    db = load_database()
    if not db:
        return {
            "detected": True,
            "identified": False,
            "username": None,
            "similarity": 0.0,
            "advice": "No users registered in biometric database."
        }

    best_user = None
    best_distance = 1.0

    for db_username, db_data in db.items():
        stored_encs = db_data.get("encodings", [])
        if not stored_encs:
            continue
        face_distances = face_recognition.face_distance(stored_encs, live_enc)
        min_distance = float(face_distances.min()) if len(face_distances) > 0 else 1.0

        if min_distance < best_distance:
            best_distance = min_distance
            best_user = db_username

    threshold = 0.55
    similarity, is_match = calculate_similarity_and_match(best_distance, threshold=threshold)

    if is_match and best_user:
        user_info = db[best_user]
        pin_correct = None
        if request.pin is not None:
            pin_correct = (str(request.pin).strip() == str(user_info.get("pin", "")).strip())

        return {
            "detected": True,
            "identified": True,
            "username": best_user,
            "distance": round(best_distance, 4),
            "similarity": similarity,
            "is_match": True,
            "pin_required": bool(user_info.get("pin")),
            "pin_matched": pin_correct,
            "advice": f"Face recognized: {best_user} ({similarity}% confidence)"
        }
    else:
        return {
            "detected": True,
            "identified": False,
            "username": "Unknown User",
            "distance": round(best_distance, 4),
            "similarity": similarity,
            "is_match": False,
            "advice": f"Face not recognized in registered profiles (Closest match: {round(similarity, 1)}%)."
        }


@app.post("/enroll")
async def enroll_user(request: EnrollUserRequest):
    if not request.username or not request.pin or not request.photo_b64:
        raise HTTPException(status_code=400, detail="Username, PIN, and photo are required.")

    try:
        img_arr = base64_to_rgb_array(request.photo_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid photo format: {e}")

    encs = face_recognition.face_encodings(img_arr)
    if not encs:
        raise HTTPException(status_code=400, detail="No face detected in provided photo. Please provide a clear face image.")

    db = load_database()
    if request.username in db and "encodings" in db[request.username]:
        # Append encoding
        db[request.username]["encodings"].append(encs[0])
        db[request.username]["pin"] = request.pin
    else:
        db[request.username] = {
            "pin": request.pin,
            "encodings": [encs[0]]
        }

    save_database(db)
    return {
        "success": True,
        "username": request.username,
        "encodings_count": len(db[request.username]["encodings"]),
        "message": f"Successfully enrolled biometric profile for {request.username}"
    }


class ValidateEnrollmentRequest(BaseModel):
    photo_b64: str
    username: Optional[str] = None


@app.post("/validate-enrollment")
async def validate_enrollment_face(request: ValidateEnrollmentRequest):
    if not request.photo_b64:
        raise HTTPException(status_code=400, detail="Photo is required.")

    try:
        img_arr = base64_to_rgb_array(request.photo_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid photo format: {e}")

    # Use face_recognition face_locations to verify presence and uniqueness
    locations = face_recognition.face_locations(img_arr)
    if not locations:
        return {
            "valid": False,
            "face_detected": False,
            "faces_count": 0,
            "advice": "No face detected by Deep Metric model. Please center your face directly in the frame with good lighting."
        }

    if len(locations) > 1:
        return {
            "valid": False,
            "face_detected": True,
            "faces_count": len(locations),
            "advice": f"Multiple faces detected ({len(locations)}). Please ensure only you are visible in the frame."
        }

    encs = face_recognition.face_encodings(img_arr, locations)
    if not encs:
        return {
            "valid": False,
            "face_detected": False,
            "faces_count": 0,
            "advice": "Could not extract clear facial landmarks. Please avoid glare or shadows."
        }

    live_enc = encs[0]
    db = load_database()
    best_user = None
    best_dist = 1.0

    for db_user, db_data in db.items():
        stored = db_data.get("encodings", [])
        if stored:
            distances = face_recognition.face_distance(stored, live_enc)
            min_d = float(distances.min()) if len(distances) > 0 else 1.0
            if min_d < best_dist:
                best_dist = min_d
                best_user = db_user

    similarity, is_match = calculate_similarity_and_match(best_dist, threshold=0.55)

    advice_msg = "Clear facial structure detected! 128-dimensional deep metric embeddings extracted successfully."
    if is_match and best_user:
        advice_msg += f" Note: High similarity ({similarity}%) to existing profile '{best_user}'."

    return {
        "valid": True,
        "face_detected": True,
        "faces_count": 1,
        "embedding_dim": 128,
        "similarity": similarity,
        "distance": round(best_dist, 4),
        "existing_match": best_user if is_match else None,
        "advice": advice_msg,
        "engine": "dlib_deep_metric_resnet34"
    }

# ==========================================================
# Models Status & Unified AI Diagnostic Endpoints
# ==========================================================

@app.get("/models/status")
@app.get("/api/models/status")
def get_models_status():
    db = load_database()
    return {
        "status": "online",
        "timestamp": os.path.basename(get_db_path()),
        "biometric_face_model": {
            "name": "dlib Face Recognition ResNet-34",
            "type": "128-dimensional Deep Metric Facial Embeddings",
            "status": "active",
            "registered_users": list(db.keys()),
            "users_count": len(db),
            "threshold": 0.55
        },
        "cnn_image_classifiers": {
            "name": "Pretrained PyTorch CNN Models",
            "architectures": ["resnet", "alexnet", "vgg"],
            "dataset": "ImageNet 1000 Classes",
            "status": "ready"
        },
        "financial_ai": {
            "name": "WealthIQ Coach (Gemini & Local Rule Engine)",
            "status": "active"
        }
    }

classifier_instance = None

def get_lazy_classifier():
    global classifier_instance
    if classifier_instance is None:
        workspace_data_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "workspace", "cd0184", "9664b117-d773-4799-b6a3-d4640ed70218", "data")
        )
        if os.path.exists(workspace_data_path):
            import sys
            if workspace_data_path not in sys.path:
                sys.path.insert(0, workspace_data_path)
            cwd = os.getcwd()
            try:
                os.chdir(workspace_data_path)
                import classifier as clf
                classifier_instance = clf
            finally:
                os.chdir(cwd)
    return classifier_instance

class ClassifyRequest(BaseModel):
    photo_b64: str
    model_name: Optional[str] = "resnet"

@app.post("/classify")
async def classify_image(request: ClassifyRequest):
    clf = get_lazy_classifier()
    if not clf:
        raise HTTPException(status_code=500, detail="Classifier module not found.")

    model = (request.model_name or "resnet").lower()
    if model not in clf.models:
        raise HTTPException(status_code=400, detail=f"Invalid model '{model}'. Choose from: {list(clf.models.keys())}")

    import tempfile
    clean_b64 = request.photo_b64
    if "," in clean_b64:
        clean_b64 = clean_b64.split(",")[1]
    
    try:
        img_bytes = base64.b64decode(clean_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 format: {e}")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(img_bytes)
            tmp_path = tmp.name
        
        prediction = clf.classifier(tmp_path, model)
        return {
            "model": model,
            "prediction": prediction,
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification error: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
