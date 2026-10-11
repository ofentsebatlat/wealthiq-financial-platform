# ?? WealthIQ: AI-Powered Financial Intelligence Platform

> **Advanced Diploma in Information & Communication Technology - Final Year Project**  
> **Sol Plaatje University**, Kimberley, South Africa  
> **Author:** Ofentse Batlang

---

## ?? Project Overview
**WealthIQ** is an end-to-end intelligent personal finance and banking advisory platform designed to bridge everyday transaction tracking with automated budgeting, smart financial guidance, and banking web assistance.

### Architecture Highlights:
- **ackend/**: Robust Python & Django backend handling transactional processing, investment tracking, advisory logic, and financial analytics.
- **rontend-extension/**: Modern React, TypeScript, and Vite-powered smart browser extension and dashboard integrated with Google Gemini AI for automated categorization and intelligent budgeting insights.

---

## ??? Tech Stack

- **Backend:** Python, Django, SQLite / PostgreSQL
- **Frontend / Extension:** React 19, TypeScript, Vite, Tailwind CSS
- **AI & Integrations:** Google Gemini API, Firebase Firestore
- **Tools:** Git, Node.js, Bun

---

## ?? Getting Started

### 1. Backend Setup (Django)
`ash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
`

### 2. Frontend / Extension Setup (React + Vite)
`ash
cd frontend-extension
npm install
# Set your GEMINI_API_KEY in .env.local
npm run dev
`

---

## ?? License & Attribution
Developed by Ofentse Batlang for the Advanced Diploma in ICT capstone project at Sol Plaatje University.
