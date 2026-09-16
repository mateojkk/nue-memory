import os
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Nue Memory & Motion Agent Backend",
    description="Python FastAPI serverless backend for Nue Agent Intelligence, Livepeer orchestration, and Memory extraction.",
    version="1.0.0",
    docs_url="/api/py/docs",
    openapi_url="/api/py/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PreferenceItem(BaseModel):
    category: str
    preference: str
    strength: Optional[str] = "high"
    project_title: Optional[str] = None

class ClassifyRequest(BaseModel):
    prompt: str
    active_preferences: Optional[List[Dict[str, Any]]] = []

class GenerateRequest(BaseModel):
    prompt: str
    model_override: Optional[str] = None
    applied_preferences: Optional[List[Dict[str, Any]]] = []

@app.get("/api/py")
@app.get("/api/py/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Nue Python Serverless Runtime",
        "livepeer_configured": bool(os.getenv("LIVEPEER_API_KEY")),
        "walrus_configured": bool(os.getenv("MEMWAL_ACCOUNT_ID") and os.getenv("MEMWAL_PRIVATE_KEY")),
    }

@app.post("/api/py/classify")
def classify_creative_feedback(req: ClassifyRequest):
    """
    Extracts structured creative preferences from user directing feedback.
    """
    feedback_lower = req.prompt.lower()
    detected = []

    if any(w in feedback_lower for w in ["fast", "quicker", "snappy", "intro is slow", "speed up"]):
        detected.append({
            "category": "pacing",
            "preference": "Fast Pacing (0-5s intro hook)",
            "strength": "high"
        })

    if any(w in feedback_lower for w in ["caption", "subtitle", "text", "words"]):
        if any(w in feedback_lower for w in ["large", "big", "bold", "huge"]):
            detected.append({
                "category": "captions",
                "preference": "Bold Large Captions with Kinetic Highlighting",
                "strength": "high"
            })

    if any(w in feedback_lower for w in ["music", "audio", "sound", "track"]):
        if any(w in feedback_lower for w in ["remove dramatic", "upbeat", "lofi", "ambient", "calm", "chill"]):
            detected.append({
                "category": "audio",
                "preference": "Upbeat Modern Electro / Lo-Fi Audio",
                "strength": "high"
            })

    if any(w in feedback_lower for w in ["minimal", "clean", "dark", "cinematic", "vibrant", "grading"]):
        detected.append({
            "category": "visual",
            "preference": "Minimalist High-Contrast Modern Aesthetic",
            "strength": "high"
        })

    return {
        "success": True,
        "feedback": req.prompt,
        "detected_preferences": detected,
        "count": len(detected)
    }

@app.post("/api/py/generate")
def generate_media_brief(req: GenerateRequest):
    """
    Augments creative prompts with active persistent preferences for Livepeer agent rendering.
    """
    directives = []
    for pref in req.applied_preferences:
        p_val = pref.get("preference", "")
        if p_val:
            directives.append(f"• {p_val}")

    enriched = req.prompt
    if directives:
        enriched += "\n\n[Persistent Learned Creative Directives]:\n" + "\n".join(directives)

    return {
        "success": True,
        "raw_prompt": req.prompt,
        "enriched_prompt": enriched,
        "preferences_applied": len(directives),
        "status": "ready_for_synthesis"
    }
