#!/bin/bash

uv sync &&

# Start the LiveKit agent worker in the background
uv run agent_worker.py start &

# Start the FastAPI server on the port provided by Render (or 5000)
PORT=${PORT:-5000}
uv run uvicorn main:app --host 0.0.0.0 --port $PORT
