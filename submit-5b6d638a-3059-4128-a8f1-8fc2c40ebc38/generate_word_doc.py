import subprocess
import sys
import os

# Ensure python-docx is installed
try:
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
except ImportError:
    print("Installing python-docx...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-docx", "--user"])
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

# Create document
doc = docx.Document()

# Styles & Formatting
def add_title(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.font.size = Pt(24)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0, 42, 84) # Capitec Navy

def add_subtitle(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.font.size = Pt(13)
    run.font.italic = True
    run.font.color.rgb = RGBColor(217, 35, 42) # Capitec Red

def add_meta(label, val):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    r1 = p.add_run(f"{label}: ")
    r1.bold = True
    r1.font.color.rgb = RGBColor(0, 42, 84)
    r2 = p.add_run(val)
    r2.font.color.rgb = RGBColor(51, 65, 85)

# Cover Header
add_title("WealthIQ Capitec Extension")
add_subtitle("Unified Multi-Model Artificial Intelligence & Intelligent Personal Finance Platform")

doc.add_paragraph()
add_meta("Institution", "Sol Plaatje University (SPU)")
add_meta("Department", "School of Natural and Applied Sciences")
add_meta("Qualification", "Advanced Diploma in Information and Communication Technology (ICT)")
add_meta("Project Type", "Final Year Project (Capstone Integration)")
add_meta("Student & Lead Developer", "Ofentse Batlang")
add_meta("Default Test Account", "Ofentse Batlang (Remote PIN: 1234)")
add_meta("Date", "2026 Academic Year")

doc.add_heading("1. Executive Summary", level=1)
doc.add_paragraph(
    "WealthIQ is an intelligent personal finance platform and Capitec banking extension engineered to empower "
    "South African banking consumers with automated cashflow tracking, inflation-protected savings simulations, "
    "context-aware financial advice, and biometric security. "
    "The project unites client-side banking simulation with a multi-model Machine Learning and Artificial Intelligence "
    "architecture comprising deep metric facial recognition, computer vision classification, and generative financial coaching."
)

doc.add_heading("2. Unified Multi-Model AI Architecture", level=1)
doc.add_paragraph(
    "To deliver uncompromising security and intelligent user experiences, WealthIQ incorporates three primary AI subsystems "
    "operating seamlessly through a Node.js Express server and Python FastAPI backend:"
)

doc.add_heading("2.1 Subsystem 1: Biometric Facial Recognition AI", level=2)
doc.add_paragraph(
    "The biometric authentication system is powered by dlib and the submit module's face_recognition engine. "
    "It implements ResNet-34 deep convolutional embeddings to map human faces into a 128-dimensional Euclidean space. "
    "Key capabilities include:"
)
doc.add_paragraph(
    "• Multi-Pose Enrollment: Automatically captures 5 distinct angles (look straight, turn left, turn right, look up, look down) "
    "to ensure robust recognition under varied real-world lighting and orientation.\n"
    "• Live Auto-Detection & Identification (/api/face/identify): Processes webcam video stream frames or uploaded photos in real time, "
    "evaluates Euclidean distance against enrolled profiles (including Ofentse Batlang, Refilwe Keketsi, and Kamogelo Bantsheng), "
    "and identifies the authorized user at a strict distance tolerance threshold (<= 0.55).\n"
    "• Two-Factor Transaction Authorization: Critical operations (fund transfers, virtual card unfreezing, new goal commitments) "
    "require both 4-digit Remote PIN validation and real-time biometric vector verification."
)

doc.add_heading("2.2 Subsystem 2: Contextual Financial Guidance AI (Gemini & Local Rules)", level=2)
doc.add_paragraph(
    "WealthIQ provides automated financial advisory tailored to the South African socio-economic landscape:\n"
    "• Cloud Generative AI: Leverages Google GenAI Gemini 2.5 Flash models to inspect real-time transaction history, "
    "available balance, and savings rates to produce actionable, bulleted financial tips.\n"
    "• Local Rule-Based Engine: When offline or during network constraints, the system activates an intelligent local fallback "
    "grounded in SARS Tax-Free Savings Account (TFSA) caps (R36,000/yr), South African inflation metrics (CPI ~5.2%), "
    "and Capitec multi-loan / savings pocket interest rates."
)

doc.add_heading("2.3 Subsystem 3: Pretrained PyTorch CNN Image Classifier", level=2)
doc.add_paragraph(
    "Integrated directly from the submit module, WealthIQ provides an interactive Computer Vision inference testbed "
    "running PyTorch models (ResNet-18, AlexNet, and VGG-16) across ImageNet-1K categories. Users and examiners can select an architecture, "
    "upload any visual input, and observe real-time tensor preprocessing, normalization, and class prediction."
)

doc.add_heading("3. Full-Stack Implementation Details", level=1)
doc.add_paragraph(
    "• Frontend: React 19, TypeScript, Vite 6, Tailwind CSS, Lucide Icons, and Canvas biometric scanner overlays.\n"
    "• Middle-Tier Server: Express.js with TypeScript (server.ts), featuring automatic child-process supervision that auto-detects "
    "and launches the Python AI backend on port 8000 when starting the application.\n"
    "• Python AI Backend: FastAPI, Uvicorn, face_recognition, dlib, OpenCV, Pillow, PyTorch, and Torchvision.\n"
    "• Persistent Databases: Dual synchronization between local JSON security profile (security_profile.json), "
    "Python pickle database (user_database.pkl), and Google Cloud Firestore."
)

doc.add_heading("4. System Startup & Verification Instructions", level=1)
doc.add_paragraph(
    "To launch the entire unified system with a single command:\n"
    "1. Navigate to the project directory: cd \"wealthiq-capitec-extension (2)\"\n"
    "2. Start the unified development server: npm run dev\n"
    "3. The server will automatically start the Node server on port 3000 and spawn the Python AI backend on port 8000.\n"
    "4. Open your web browser at http://localhost:3000\n"
    "5. Log in with Remote PIN: 1234, or click 'Biometrics' to test real-time face detection.\n"
    "6. Open the 'AI Models & Security' tab to inspect and test all AI models live."
)

doc.add_heading("5. Conclusion", level=1)
doc.add_paragraph(
    "The successful merger of the submit module and WealthIQ Capitec Extension demonstrates end-to-end full-stack software engineering, "
    "advanced biometrics integration, and practical machine learning deployment aligned with modern FinTech standards."
)

# Save document
output_filename = "Project_Explanation.docx"
doc.save(output_filename)
print(f"[SUCCESS] Document created successfully as {output_filename}")
