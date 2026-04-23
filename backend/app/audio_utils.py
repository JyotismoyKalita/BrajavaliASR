from __future__ import annotations

import numpy as np
import torch
import torchaudio
import soundfile as sf
import io
from pydub import AudioSegment

from .config import TARGET_SAMPLE_RATE


#def load_audio(file_path: str) -> tuple[np.ndarray, int]:
#    speech, sample_rate = sf.read(file_path)
#    if speech.ndim > 1:
#        speech = speech.mean(axis=1)
#    return speech.astype(np.float32), sample_rate

def load_audio(file_path: str) -> tuple[np.ndarray, int]:
    # Check if the file is a format soundfile might struggle with (like webm)
    if file_path.endswith('.webm') or file_path.endswith('.ogg'):
        # Load the "weird" browser format
        audio = AudioSegment.from_file(file_path)
        
        # Export it to a temporary WAV buffer
        wav_buffer = io.BytesIO()
        audio.export(wav_buffer, format="wav")
        wav_buffer.seek(0)
        
        # Read the buffer using soundfile
        speech, sample_rate = sf.read(wav_buffer)
    else:
        # Fallback to your original logic for standard files
        speech, sample_rate = sf.read(file_path)

    # Original normalization/mono logic
    if speech.ndim > 1:
        speech = speech.mean(axis=1)
    
    return speech.astype(np.float32), sample_rate

def trim_audio(speech: np.ndarray, sample_rate: int, start_sec: float, end_sec: float | None) -> np.ndarray:
    safe_start = max(0.0, start_sec)
    if end_sec is not None and end_sec > safe_start:
        start_idx = int(safe_start * sample_rate)
        end_idx = int(end_sec * sample_rate)
        return speech[start_idx:end_idx]
    if safe_start > 0:
        start_idx = int(safe_start * sample_rate)
        return speech[start_idx:]
    return speech


def normalize_audio(speech: np.ndarray) -> np.ndarray:
    peak = np.max(np.abs(speech)) if speech.size > 0 else 0.0
    if peak <= 0.0:
        return speech
    return speech / peak


def resample_audio(speech: np.ndarray, sample_rate: int) -> tuple[np.ndarray, int]:
    if sample_rate == TARGET_SAMPLE_RATE:
        return speech, sample_rate

    resampled = torchaudio.functional.resample(
        torch.tensor(speech).float(),
        orig_freq=sample_rate,
        new_freq=TARGET_SAMPLE_RATE,
    ).numpy()
    return resampled.astype(np.float32), TARGET_SAMPLE_RATE
