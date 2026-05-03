"""
agent_worker.py — Optimised for low-latency real-time voice conversation.

LATENCY PIPELINE:
  User speaks → Deepgram STT (nova-3, 25ms endpointing, interim results)
              → Groq LLM  (llama-3.1-8b-instant ← fastest free tier model)
              → Deepgram TTS (aura-2-andromeda-en ← streaming)

KEY TRADEOFFS:
  ┌─────────────────────────┬──────────────────────────────┬───────────────────────────────┐
  │ Parameter               │ Chosen value                 │ Tradeoff                      │
  ├─────────────────────────┼──────────────────────────────┼───────────────────────────────┤
  │ min_endpointing_delay   │ 0.3 s                        │ Faster replies; may clip user │
  │ max_endpointing_delay   │ 5.0 s                        │ Cap on how long we wait       │
  │ allow_interruptions     │ True                         │ Natural feel; agent stops mid │
  │ min_interruption_words  │ 2                            │ Ignore single accidental words │
  │ false_interruption_timeout│ 1.0 s                      │ Resume if user pauses briefly │
  │ preemptive_generation   │ True                         │ Start LLM before STT finalises│
  │ LLM primary model       │ llama-3.1-8b-instant (Groq) │ ~200ms TTFT; less reasoning   │
  │ LLM fallback model      │ llama-3.3-70b-versatile      │ Better answers; ~400ms TTFT   │
  │ STT endpointing_ms      │ 25                           │ Already minimum; leave as-is  │
  │ STT interim_results     │ True                         │ Allows preemptive generation  │
  │ TTS model               │ aura-2-andromeda-en          │ Deepgram's fastest streaming  │
  └─────────────────────────┴──────────────────────────────┴───────────────────────────────┘
"""

import asyncio
import os
import json
import logging
from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli, AutoSubscribe
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.llm import FallbackAdapter
from livekit.plugins import google, deepgram, openai

load_dotenv()

logger = logging.getLogger("agent_worker")


def load_agent_config(agent_id: str):
    if os.path.exists("agents.json"):
        with open("agents.json", "r") as f:
            db = json.load(f)
            return db.get(agent_id)
    return None


async def entrypoint(ctx: JobContext):
    # Parse room name: agent_<id>_<random>
    parts = ctx.room.name.split("_")
    agent_id = parts[1] if len(parts) > 1 else None
    config = load_agent_config(agent_id) if agent_id else None

    system_prompt = (
        "You are a helpful, friendly AI voice assistant. "
        "Keep your responses SHORT and conversational — ideally 1-3 sentences. "
        "Never use bullet points or markdown in speech. "
        "Speak naturally as if talking to a person."
    )
    if config:
        system_prompt = (
            f"Your name is {config['name']}.\n"
            f"Your objective: {config['objective']}\n\n"
            f"Instructions:\n{config['system_prompt']}\n\n"
            f"Reference Information:\n{config.get('reference_text', 'No reference provided.')}\n\n"
            "Keep responses SHORT (1-3 sentences). Speak naturally — no bullet points or markdown."
        )

    logger.info(f"Connecting to room: {ctx.room.name}")

    try:
        await asyncio.wait_for(
            ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY),
            timeout=15.0,
        )
    except asyncio.TimeoutError:
        logger.error(f"Room connection timed out: {ctx.room.name}")
        return
    except Exception as e:
        logger.error(f"Failed to connect to {ctx.room.name}: {e}")
        return

    logger.info(f"Connected to room: {ctx.room.name}")

    # ── STT: Deepgram nova-3 with tight endpointing for minimal silence gap ──
    stt = deepgram.STT(
        model="nova-3",
        language="en-US",
        interim_results=True,    # Enables preemptive LLM generation
        smart_format=False,      # Slightly faster (no post-processing)
        no_delay=True,           # Send partial results immediately
        endpointing_ms=25,       # Minimum silence to detect end-of-speech
        filler_words=True,       # Include "um", "uh" in transcript
    )

    # ── LLM: Groq llama-3.1-8b-instant (primary) → llama-3.3-70b (fallback) ──
    # 8b-instant: ~150-250ms TTFT — fastest available free model
    # 70b-versatile: ~350-600ms TTFT — higher quality but slower
    groq_key = os.environ.get("GROQ_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")

    llm_options = []
    if groq_key:
        # Primary: ultra-fast 8B model
        llm_options.append(openai.LLM(
            model="llama-3.1-8b-instant",
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_key,
        ))
        # Fallback within Groq: smarter 70B
        llm_options.append(openai.LLM(
            model="llama-3.3-70b-versatile",
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_key,
        ))
    if google_key:
        llm_options.append(google.LLM(model="gemini-2.0-flash"))

    if not llm_options:
        logger.error("No LLM keys found. Set GROQ_API_KEY or GOOGLE_API_KEY.")
        return

    llm = FallbackAdapter(llm_options) if len(llm_options) > 1 else llm_options[0]

    # ── TTS: Deepgram aura-2 — streaming synthesis, ~80-150ms to first audio ──
    tts = deepgram.TTS(
        model="aura-2-andromeda-en",   # Fastest Deepgram voice
        sample_rate=24000,
    )

    agent = Agent(
        stt=stt,
        llm=llm,
        tts=tts,
        instructions=system_prompt,
    )

    # ── Session: tuned for low-latency real-time conversation ──
    session = AgentSession(
        # Endpointing — how long after silence to commit a user turn
        min_endpointing_delay=0.3,     # 300ms: respond quickly (default 500ms)
        max_endpointing_delay=5.0,     # Give up waiting after 5s of silence

        # Interruptions — let users cut the agent off naturally
        allow_interruptions=True,
        min_interruption_words=2,      # Ignore single accidental words
        min_interruption_duration=0.4, # Must speak for 400ms to count
        false_interruption_timeout=1.0,# If user goes quiet in 1s, resume agent

        # Preemptive generation — start LLM as STT is still finalising
        preemptive_generation=True,
    )

    await session.start(agent, room=ctx.room)

    # Greet immediately — sets tone and confirms connection
    await session.say(
        "Hello! I'm ready. What can I help you with?",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="vocal-agent",
        num_idle_processes=1,   # Keep 1 warm process — eliminates cold-start delay
    ))
