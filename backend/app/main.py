from __future__ import annotations

import os
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .asr_service import asr_service
from .audio_utils import load_audio, normalize_audio, resample_audio, trim_audio
from .schemas import TranscriptionResponse

app = FastAPI(title="Brajavali ASR API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    audio: UploadFile = File(...),
    trim_start_sec: float = Form(0.0),
    trim_end_sec: float | None = Form(None),
    normalize: bool = Form(False),
) -> TranscriptionResponse:
    suffix = os.path.splitext(audio.filename or "audio.wav")[1] or ".wav"
    temp_file_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await audio.read())
            temp_file_path = temp_file.name

        speech, sample_rate = load_audio(temp_file_path)
        speech = trim_audio(speech, sample_rate, trim_start_sec, trim_end_sec)

        if speech.size == 0:
            raise HTTPException(status_code=400, detail="Trim range produced empty audio.")

        if normalize:
            speech = normalize_audio(speech)

        speech, sample_rate = resample_audio(speech, sample_rate)
        duration_sec = float(len(speech) / sample_rate) if sample_rate else 0.0
        transcription, ipa = asr_service.transcribe(speech, sample_rate)

        return TranscriptionResponse(
            transcription=transcription,
            ipa=ipa,
            sample_rate=sample_rate,
            duration_sec=duration_sec,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
