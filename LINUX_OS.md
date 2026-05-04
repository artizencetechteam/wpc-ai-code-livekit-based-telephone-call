# 🐧 Linux (Ubuntu) Deployment Guide

This guide explains how to host the WPC Voice Agent on a standard Linux VPS (like Ubuntu) using only the command line.

---

## 🏗️ 1. Backend Setup (Python)

### Prerequisites
Ensure your system has Python 3.10+ and pip installed:
```bash
sudo apt update
sudo apt install python3-pip python3-venv -y
```

### Setup Steps
1. **Navigate to the backend folder**:
   ```bash
   cd backend
   ```
2. **Create and activate virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Setup Environment Variables**:
   Create a `.env` file and add your keys:
   ```bash
   nano .env
   # Add LIVEKIT_URL, LIVEKIT_API_KEY, GROQ_API_KEY, etc.
   ```
5. **Run the Backend**:
   Use the provided startup script:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

---

## 🌐 2. Frontend Setup (NPM)

### Prerequisites
Install Node.js and NPM:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Setup Steps
1. **Navigate to the root directory**:
   ```bash
   cd ..
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Build the production bundle**:
   ```bash
   npm run build
   ```
4. **Serve the app**:
   You can use `serve` to host the built files:
   ```bash
   sudo npm install -g serve
   serve -s dist -l 3000
   ```

---

## 🚀 3. Production Tip: Use PM2
To keep your backend and frontend running in the background after you close the terminal:

1. **Install PM2**:
   ```bash
   sudo npm install -g pm2
   ```
2. **Start Backend**:
   ```bash
   cd backend
   pm2 start "./start.sh" --name wpc-backend
   ```
3. **Start Frontend**:
   ```bash
   cd ..
   pm2 serve dist 3000 --name wpc-frontend --spa
   ```
4. **Save the processes**:
   ```bash
   pm2 save
   ```
