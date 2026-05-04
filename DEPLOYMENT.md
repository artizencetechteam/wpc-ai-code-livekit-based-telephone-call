# 🚀 Deployment Guide: WPC Voice Agent

This document contains all instructions for hosting the platform on **Render (Cloud)** or **Linux (Ubuntu/VPS)**.

---

## 📋 1. Prerequisites (For all methods)

1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/artizencetechteam/ai-voice-call-demo-system-salespyer.git
    cd ai-voice-call-demo-system-salespyer
    ```
2.  **Gather API Keys**:
    *   **LiveKit**: URL, API Key, API Secret.
    *   **Deepgram**: API Key.
    *   **Groq**: API Key.

---

## ☁️ Option A: Hosting on Render (Automated)

This uses the `render.yaml` blueprint to set up both Frontend and Backend automatically.

1.  Log in to [Render](https://dashboard.render.com/).
2.  Click **New +** > **Blueprint**.
3.  Connect this GitHub repository.
4.  Enter a **Service Group Name** (e.g., `wpc-voice`).
5.  When prompted, enter your **Environment Variables** (see the list below).
6.  Click **Apply**.

---

## 🐧 Option B: Hosting on Linux Ubuntu (Manual/CMD)

Use these commands to set up the project on a raw Linux VPS.

### Step 1: Install System Dependencies
```bash
sudo apt update
sudo apt install python3-pip python3-venv nodejs npm -y
```

### Step 2: Configure the Backend (Python)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Or create a new .env
nano .env             # Enter your API keys
chmod +x start.sh
./start.sh            # Starts both FastAPI and Agent Worker
```

### Step 3: Configure the Frontend (NPM)
```bash
# Open a new terminal
cd ..
npm install
npm run build
sudo npm install -g serve
serve -s dist -l 3000
```

---

## 🔑 Required Environment Variables

| Variable | Description |
| :--- | :--- |
| `LIVEKIT_URL` | Your LiveKit Project URL (wss://...) |
| `LIVEKIT_API_KEY` | Your LiveKit API Key |
| `LIVEKIT_API_SECRET` | Your LiveKit API Secret |
| `DEEPGRAM_API_KEY` | Your Deepgram API Key |
| `GROQ_API_KEY` | Your Groq API Key |

---

## 🛠️ Keeping it Running (Production Tip)
For Linux VPS, use **PM2** to keep the services running in the background:
```bash
sudo npm install -g pm2
pm2 start "cd backend && ./start.sh" --name wpc-backend
pm2 serve dist 3000 --name wpc-frontend --spa
pm2 save
```

---

## ⚠️ Common Issues
*   **Database**: Currently uses `agents.json`. On Render, this data will reset on every deploy.
*   **Port 5000**: Ensure your firewall allows traffic on port 5000 (Backend) and 3000 (Frontend).
*   **VITE_API_URL**: On the frontend, ensure it points to your deployed Backend URL.
