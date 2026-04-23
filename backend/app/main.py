from __future__ import annotations

import os
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .asr_service import asr_service
from .audio_utils import load_audio, normalize_audio, resample_audio, split_audio_for_asr, trim_audio
from .schemas import TranscriptionChunkResponse, TranscriptionResponse

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
        timeline_offset_sec = max(0.0, trim_start_sec)
        speech = trim_audio(speech, sample_rate, trim_start_sec, trim_end_sec)

        if speech.size == 0:
            raise HTTPException(status_code=400, detail="Trim range produced empty audio.")

        if normalize:
            speech = normalize_audio(speech)

        speech, sample_rate = resample_audio(speech, sample_rate)
        duration_sec = float(len(speech) / sample_rate) if sample_rate else 0.0
        audio_chunks = split_audio_for_asr(speech, sample_rate)
        chunk_responses: list[TranscriptionChunkResponse] = []
        chunk_transcriptions: list[str] = []

        for index, chunk in enumerate(audio_chunks, start=1):
            chunk_transcription = asr_service.transcribe(chunk.audio, sample_rate)
            chunk_transcriptions.append(chunk_transcription)
            chunk_responses.append(
                TranscriptionChunkResponse(
                    index=index,
                    start_sec=timeline_offset_sec + chunk.start_sec,
                    end_sec=timeline_offset_sec + chunk.end_sec,
                    transcription=chunk_transcription,
                    split_reason=chunk.split_reason,
                )
            )

        transcription = merge_chunk_transcriptions(chunk_transcriptions)

        return TranscriptionResponse(
            transcription=transcription,
            sample_rate=sample_rate,
            duration_sec=duration_sec,
            chunks=chunk_responses,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


def merge_chunk_transcriptions(transcriptions: list[str]) -> str:
    merged_words: list[str] = []

    for transcription in transcriptions:
        words = transcription.split()
        if not words:
            continue

        overlap = _word_overlap(merged_words, words)
        merged_words.extend(words[overlap:])

    return " ".join(merged_words)


def _word_overlap(previous_words: list[str], next_words: list[str]) -> int:
    max_overlap = min(5, len(previous_words), len(next_words))
    for overlap in range(max_overlap, 0, -1):
        if previous_words[-overlap:] == next_words[:overlap]:
            return overlap
    return 0
