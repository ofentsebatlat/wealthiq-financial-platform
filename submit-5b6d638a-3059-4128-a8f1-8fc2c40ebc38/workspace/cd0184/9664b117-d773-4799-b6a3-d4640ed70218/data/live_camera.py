import cv2
import face_recognition
import pickle
import os
import getpass

def load_database(db_path="user_database.pkl"):
    if not os.path.exists(db_path):
        return {}
    with open(db_path, "rb") as f:
        try:
            return pickle.load(f)
        except:
            return {}

def main():
    db = load_database()
    if not db:
        print("No users registered. Please run register_user.py first.")
        return

    print("Initializing camera for authentication...")
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    print("Camera feed started. Press 'q' to quit.")

    authenticated_user = None

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        # Resize for faster processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        face_names = []
        for face_encoding in face_encodings:
            name = "Unknown User"
            best_distance = 1.0  # Lower is better; 0.45 is our threshold

            # Check ALL registered users and pick the one with the best (lowest) distance
            for db_username, db_data in db.items():
                # Get distances to every stored angle for this user
                face_distances = face_recognition.face_distance(db_data["encodings"], face_encoding)

                # Use the best (minimum) distance for this user
                min_distance = face_distances.min() if len(face_distances) > 0 else 1.0

                if min_distance < best_distance:
                    best_distance = min_distance
                    name = db_username

            # Only accept if the best match is within the strict tolerance
            if best_distance >= 0.45:
                name = "Unknown User"

            face_names.append(name)

        # Draw results
        for (top, right, bottom, left), name in zip(face_locations, face_names):
            # Scale back up
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            if name == "Unknown User":
                color = (0, 0, 255) # Red
            else:
                color = (0, 255, 0) # Green
                authenticated_user = name

            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 1)

        cv2.imshow('Facial Authentication', frame)
        
        # If we recognized a face, pause video and ask for PIN
        if authenticated_user:
            cv2.waitKey(100) # Give UI a moment to update
            print(f"\nFace recognized: {authenticated_user}")
            pin_attempt = getpass.getpass(f"Enter PIN for {authenticated_user}: ").strip()
            
            if pin_attempt == db[authenticated_user]["pin"]:
                print("\n" + "="*50)
                print("🎉 AUTHENTICATION SUCCESSFUL! 🎉")
                print("="*50 + "\n")
                cap.release()
                cv2.destroyAllWindows()
                return
            else:
                print("❌ Incorrect PIN. Resuming scan...")
                authenticated_user = None

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
