import os
import uuid
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from livekit import api
import pypdf
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistence storage for agents
DB_FILE = "agents.json"
def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            return json.load(f)
    return {}

def save_db(db):
    with open(DB_FILE, "w") as f:
        json.dump(db, f)

agents_db = load_db()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class AgentConfig(BaseModel):
    id: str
    name: str
    objective: str
    system_prompt: str
    reference_text: Optional[str] = ""

@app.post("/api/agents")
async def create_agent(
    name: str = Form(...),
    objective: str = Form(...),
    system_prompt: str = Form(...),
    agent_id: Optional[str] = Form(None),
    reference_file: Optional[UploadFile] = File(None)
):
    try:
        ref_text = ""
        if reference_file:
            file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{reference_file.filename}")
            with open(file_path, "wb") as f:
                f.write(await reference_file.read())
            
            # Extract text
            if reference_file.filename.endswith(".pdf"):
                reader = pypdf.PdfReader(file_path)
                for page in reader.pages:
                    ref_text += page.extract_text()
            else:
                with open(file_path, "r", encoding="utf-8") as f:
                    ref_text = f.read()

        new_id = agent_id or str(uuid.uuid4())
        agent = {
            "id": new_id,
            "name": name,
            "objective": objective,
            "system_prompt": system_prompt,
            "reference_text": ref_text or (agents_db.get(new_id, {}).get("reference_text", "")),
        }
        agents_db[new_id] = agent
        save_db(agents_db)
        return {"success": True, "agent": agent}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents")
async def list_agents():
    return list(agents_db.values())

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str

@app.post("/api/token")
async def get_token(req: TokenRequest):
    try:
        token = api.AccessToken(
            os.getenv("LIVEKIT_API_KEY"),
            os.getenv("LIVEKIT_API_SECRET")
        ) \
            .with_identity(req.participant_name) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=req.room_name,
            ))

        jwt_token = token.to_jwt()

        # Explicitly dispatch the agent worker into this room
        lkapi = api.LiveKitAPI(
            os.getenv("LIVEKIT_URL"),
            os.getenv("LIVEKIT_API_KEY"),
            os.getenv("LIVEKIT_API_SECRET"),
        )
        try:
            await lkapi.agent_dispatch.create_dispatch(
                api.CreateAgentDispatchRequest(
                    agent_name="vocal-agent",
                    room=req.room_name,
                )
            )
        finally:
            await lkapi.aclose()

        return {"token": jwt_token, "url": os.getenv("LIVEKIT_URL")}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
