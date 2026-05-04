# Vocal Voice 🎙️

Vocal Voice is a fully open-source, ultra-low latency conversational voice agent platform built using **LiveKit**, **Groq**, and **Deepgram**. 

It features a premium, interactive web interface and a scalable Python backend capable of deploying AI agents tailored with specific system prompts and reference materials.

---

## 🌐 Deployment

For a quick guide on how to host this project on **Render**, see [**RENDER.md**](./RENDER.md).

---

## 🚀 Key Features

*   **Ultra-Low Latency:** Tuned for ~600ms–1s end-to-end latency to feel like a real human conversation.
*   **Preemptive LLM Generation:** Starts generating responses *before* you've completely finished speaking.
*   **Seamless Interruptions:** You can interrupt the agent naturally at any point.
*   **Glassmorphic UI:** A beautiful React/Tailwind interface featuring live transcriptions, agent avatars, and active voice visualizations.
*   **Agent Sandbox:** Configure, test, and save multiple AI personas with unique system prompts and uploaded reference knowledge.

---

## 🧠 AI Models Architecture

To achieve the best balance of speed, cost, and intelligence, Vocal Voice uses a hybrid AI stack:

*   **Speech-to-Text (STT):** Deepgram `nova-3` - ~50-100ms latency with extremely accurate streaming transcription.
*   **Intelligence (LLM) - Primary:** Groq `llama-3.1-8b-instant` - Lightning-fast inference capable of starting a response in ~150ms.
*   **Intelligence (LLM) - Fallback:** Groq `llama-3.3-70b-versatile` - Kicks in automatically if the primary model hits rate limits.
*   **Text-to-Speech (TTS):** Deepgram `aura-2-andromeda-en` - High-quality, emotive streaming text-to-speech.

---

## 🛠️ Project Setup & Installation

### Prerequisites

*   Node.js (v18+)
*   Python (v3.10+)
*   A LiveKit Cloud Project (or self-hosted LiveKit server)
*   API Keys for **Groq** and **Deepgram**

### 1. Clone the repository

```bash
git clone https://github.com/Harshalzarikar/vocal-voice.git
cd vocal-voice
```

### 2. Set up the Frontend (React + Vite)

```bash
# Install Node.js dependencies
yarn install  # or npm install

# The frontend runs on port 5173 by default
```

### 3. Set up the Backend (FastAPI + LiveKit Agents)

Open a new terminal window:

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

*(If `requirements.txt` does not exist, simply run `pip install fastapi uvicorn livekit-server-sdk livekit-agents livekit-plugins-deepgram livekit-plugins-openai python-dotenv python-multipart`)*

---

## 🔑 Environment Variables & API Keys

In the `backend/` directory, create a `.env` file with the following keys. 

```env
# 1. LiveKit Credentials (Get from cloud.livekit.io)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# 2. STT & TTS Engine (Get from console.deepgram.com)
DEEPGRAM_API_KEY=your_deepgram_api_key

# 3. LLM Engine (Get from console.groq.com)
GROQ_API_KEY=your_groq_api_key
```

*Note: Make sure your API keys are kept secure. The `.gitignore` is already configured to prevent `.env` from being committed.*

---

## 🏃 Running the Application

You will need **three terminal windows** running simultaneously to operate the platform locally.

### Terminal 1: The React Frontend

```bash
# In the project root directory
yarn dev
```

*Opens the web UI at `http://localhost:5173`*

### Terminal 2: The FastAPI Server

```bash
# In the backend/ directory (ensure venv is activated)
python main.py
```

*Handles API requests (agent creation, token generation) on `http://localhost:5000`*

### Terminal 3: The LiveKit Agent Worker

```bash
# In the backend/ directory (ensure venv is activated)
python agent_worker.py start
```

*Connects to LiveKit Cloud and waits for WebRTC audio streams to process.*

---

## 🎙️ How to Use

1.  Navigate to `http://localhost:5173` in your browser.
2.  Click **"Create Agent"** to define a new AI personality. Give it a name, objective, and detailed system prompt.
3.  Click **"Start Voice Session"** on your new agent's card.
4.  Allow browser microphone permissions.
5.  The LiveKit session will connect. You'll hear the agent say, *"Hello! I'm ready. What can I help you with?"*
6.  Start speaking! Watch the real-time transcript panel on the right and the visualizer on the left.

---

## 📝 License

This project is open source and free to use.