import cv2
import face_recognition
import pickle
import os
import getpass
import time

COUNTDOWN_SECONDS = 3  # Hold pose for this many seconds to auto-capture

def main():
    print("=== User Registration ===")
    username = input("Enter username: ").strip()
    if not username:
        print("Username cannot be empty.")
        return

    pin = getpass.getpass("Enter a 4-digit PIN: ").strip()
    if len(pin) != 4 or not pin.isdigit():
        print("PIN must be exactly 4 digits.")
        return

    print("\nInitializing camera for facial capture...")
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    # Pre-create the window and force it to the foreground on Windows
    win_name = 'Face Registration'
    cv2.namedWindow(win_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(win_name, 800, 600)
    cv2.setWindowProperty(win_name, cv2.WND_PROP_TOPMOST, 1)

    # Warm up the camera
    for _ in range(10):
        cap.read()

    prompts = [
        "Look Straight",
        "Turn slightly Left",
        "Turn slightly Right",
        "Look slightly Up",
        "Look slightly Down"
    ]

    encodings = []
    current_prompt_idx = 0

    print("\nCamera window is open.")
    print("Look at the camera and follow the instructions on screen.")
    print("Each pose will be captured AUTOMATICALLY after a 3-second countdown.")
    print("Press 'q' in the camera window to cancel.\n")

    face_detected_since = None  # timestamp when face was first detected for this step

    while current_prompt_idx < len(prompts):
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break

        display_frame = frame.copy()
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Detect faces every frame (use small model for speed)
        face_locations = face_recognition.face_locations(rgb_frame, model="hog")
        face_found = len(face_locations) == 1

        prompt_text = prompts[current_prompt_idx]
        progress_text = f"Step {current_prompt_idx + 1} of {len(prompts)}"

        # Draw face box
        for (top, right, bottom, left) in face_locations:
            color = (0, 255, 0) if face_found else (0, 0, 255)
            cv2.rectangle(display_frame, (left, top), (right, bottom), color, 2)

        # Countdown logic
        if face_found:
            if face_detected_since is None:
                face_detected_since = time.time()
            elapsed = time.time() - face_detected_since
            remaining = max(0, COUNTDOWN_SECONDS - elapsed)

            if remaining == 0:
                # AUTO-CAPTURE
                encoding = face_recognition.face_encodings(rgb_frame, face_locations)[0]
                encodings.append(encoding)
                print(f"✓ Captured: {prompt_text}")

                # Flash green confirmation
                green_frame = display_frame.copy()
                cv2.rectangle(green_frame, (0, 0), (green_frame.shape[1], green_frame.shape[0]), (0, 255, 0), 20)
                cv2.putText(green_frame, "CAPTURED!", (200, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 0), 4)
                cv2.imshow(win_name, green_frame)
                cv2.waitKey(700)

                current_prompt_idx += 1
                face_detected_since = None
                continue

            countdown_text = f"Hold still... {remaining:.1f}s"
            cv2.putText(display_frame, countdown_text, (10, display_frame.shape[0] - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            # Progress bar
            bar_width = int((elapsed / COUNTDOWN_SECONDS) * display_frame.shape[1])
            cv2.rectangle(display_frame, (0, display_frame.shape[0] - 10),
                          (bar_width, display_frame.shape[0]), (0, 255, 0), -1)
        else:
            face_detected_since = None  # Reset if face disappears
            status_text = "No face detected - show your face"
            cv2.putText(display_frame, status_text, (10, display_frame.shape[0] - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # Overlay instructions
        cv2.rectangle(display_frame, (0, 0), (display_frame.shape[1], 100), (0, 0, 0), -1)
        cv2.putText(display_frame, progress_text, (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
        cv2.putText(display_frame, prompt_text, (10, 75),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 3)

        cv2.imshow(win_name, display_frame)

        # 'q' to quit — must click camera window first, then press q
        if cv2.waitKey(30) & 0xFF == ord('q'):
            print("Registration cancelled.")
            cap.release()
            cv2.destroyAllWindows()
            return

    cap.release()
    cv2.destroyAllWindows()

    if len(encodings) == len(prompts):
        db_path = "user_database.pkl"
        db = {}
        if os.path.exists(db_path):
            with open(db_path, "rb") as f:
                try:
                    db = pickle.load(f)
                except Exception:
                    pass

        db[username] = {
            "pin": pin,
            "encodings": encodings
        }

        with open(db_path, "wb") as f:
            pickle.dump(db, f)

        print(f"\n✅ Successfully registered user: {username}")
        print("You can now run live_camera.py to log in.")
    else:
        print("\nRegistration incomplete. Please try again.")

if __name__ == "__main__":
    main()
