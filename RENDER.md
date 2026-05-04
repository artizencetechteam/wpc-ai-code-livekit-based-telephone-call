# 🚀 Render Deployment Guide (Standard Operating Procedure)

Follow this guide exactly to ensure a successful deployment of the **WPC Voice Agent** on Render.

## 📋 Prerequisites

1.  **GitHub Repository**: Ensure your code is pushed to a private or public GitHub repo.
2.  **API Keys**: Have the following ready:
    *   **LiveKit**: URL, API Key, and API Secret (from [LiveKit Cloud](https://cloud.livekit.io/)).
    *   **Deepgram**: API Key (from [Deepgram Console](https://console.deepgram.com/)).
    *   **Groq**: API Key (from [Groq Console](https://console.groq.com/)).

---

## 🛠️ Option 1: Deployment via Blueprint (Recommended)

This is the fastest method as it uses the `render.yaml` file to configure everything automatically.

1.  Log in to [Render](https://dashboard.render.com/).
2.  Click **New +** > **Blueprint**.
3.  Connect your GitHub repository.
4.  **Service Group Name**: Enter `wpc-voice-app`.
5.  Render will list two services: `vocal-backend` and `vocal-frontend`.
6.  **Environment Variables**: You will be prompted to enter the keys. **Do not skip this step.**
7.  Click **Apply**.

---

## 🛠️ Option 2: Manual Deployment (If Blueprint Fails)

If you prefer manual setup, create two separate services:

### 1. The Backend (Web Service)
*   **Name**: `wpc-backend`
*   **Runtime**: `Python`
*   **Root Directory**: `backend`
*   **Build Command**: `pip install -r requirements.txt`
*   **Start Command**: `bash start.sh`
*   **Environment Variables**: (Add all keys listed in the "Environment Variables" section below).

### 2. The Frontend (Static Site)
*   **Name**: `wpc-frontend`
*   **Build Command**: `yarn install && yarn build`
*   **Publish Directory**: `dist`
*   **Environment Variables**:
    *   `VITE_API_URL`: The URL of your `wpc-backend` (e.g., `https://wpc-backend.onrender.com`).

---

## 🔑 Environment Variables Reference

Add these to the **Environment** tab of your **Backend** service:

| Key | Value Source |
| :--- | :--- |
| `LIVEKIT_URL` | Your LiveKit Project URL (starts with `wss://`) |
| `LIVEKIT_API_KEY` | Your LiveKit API Key |
| `LIVEKIT_API_SECRET` | Your LiveKit API Secret |
| `DEEPGRAM_API_KEY` | Your Deepgram API Key |
| `GROQ_API_KEY` | Your Groq API Key |
| `ELEVEN_API_KEY` | (Optional) If using ElevenLabs TTS |

---

## ⚠️ Common Troubleshooting

### 1. "Blueprint file not found"
*   **Fix**: Ensure `render.yaml` is in the **root** folder of your repository (not inside `backend`). 
*   **Fix**: Ensure you have pushed the file to the `main` branch.

### 2. Backend fails to start
*   **Check logs**: Look for `ModuleNotFoundError`. This means a dependency is missing from `requirements.txt`.
*   **Port Error**: Render automatically assigns a port. The `start.sh` script is already configured to use `$PORT`.

### 3. Frontend shows a blank screen or "Connection Error"
*   **Fix**: Ensure the `VITE_API_URL` environment variable is set correctly to your backend's URL.
*   **Fix**: After changing environment variables, you must **re-deploy** the frontend.

### 4. Agent doesn't speak
*   **Fix**: Check if your LiveKit keys are correct.
*   **Fix**: Ensure the `agent_worker.py` is running (the `start.sh` script handles this automatically).
