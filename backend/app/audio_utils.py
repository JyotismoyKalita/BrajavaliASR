from __future__ import annotations

from dataclasses import dataclass
import io

import numpy as np
import torch
import torchaudio
import soundfile as sf
from pydub import AudioSegment

from .config import TARGET_SAMPLE_RATE


MAX_DIRECT_AUDIO_SEC = 14.0
TARGET_CHUNK_SEC = 12.0
MIN_BOUNDARY_SEC = 9.0
MAX_BOUNDARY_SEC = 13.0
MIN_FINAL_CHUNK_SEC = 3.0
LONG_PAUSE_SEC = 0.4
MIN_PAUSE_SEGMENT_SEC = 1.0
MIN_SILENCE_SEC = 0.3
ENERGY_FRAME_SEC = 0.03
ENERGY_HOP_SEC = 0.01


@dataclass(frozen=True)
class AudioChunk:
    audio: np.ndarray
    start_sec: float
    end_sec: float
    split_reason: str


def load_audio(file_path: str) -> tuple[np.ndarray, int]:
    if file_path.endswith(".webm") or file_path.endswith(".ogg"):
        audio = AudioSegment.from_file(file_path)
        wav_buffer = io.BytesIO()
        audio.export(wav_buffer, format="wav")
        wav_buffer.seek(0)
        speech, sample_rate = sf.read(wav_buffer)
    else:
        speech, sample_rate = sf.read(file_path)

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


def split_audio_for_asr(speech: np.ndarray, sample_rate: int) -> list[AudioChunk]:
    duration_sec = float(len(speech) / sample_rate) if sample_rate else 0.0
    total_samples = len(speech)
    pause_boundaries = _find_long_pause_boundaries(speech, sample_rate)
    pause_boundaries = _filter_pause_boundaries(pause_boundaries, total_samples, sample_rate)

    if pause_boundaries:
        return _split_on_pause_boundaries(speech, sample_rate, pause_boundaries)

    if duration_sec <= MAX_DIRECT_AUDIO_SEC:
        return [AudioChunk(speech, 0.0, duration_sec, "single")]

    return _split_span_for_length(speech, sample_rate, 0, total_samples, "final")


def _split_on_pause_boundaries(
    speech: np.ndarray,
    sample_rate: int,
    pause_boundaries: list[int],
) -> list[AudioChunk]:
    chunks: list[AudioChunk] = []
    start_idx = 0
    total_samples = len(speech)

    for boundary_idx in [*pause_boundaries, total_samples]:
        end_reason = "long_pause" if boundary_idx < total_samples else "final"
        chunks.extend(_split_span_for_length(speech, sample_rate, start_idx, boundary_idx, end_reason))
        start_idx = boundary_idx

    if len(chunks) == 1:
        chunk = chunks[0]
        return [AudioChunk(chunk.audio, chunk.start_sec, chunk.end_sec, "single")]

    return chunks


def _split_span_for_length(
    speech: np.ndarray,
    sample_rate: int,
    span_start_idx: int,
    span_end_idx: int,
    final_reason: str,
) -> list[AudioChunk]:
    chunks: list[AudioChunk] = []
    start_idx = span_start_idx

    while start_idx < span_end_idx:
        remaining_sec = (span_end_idx - start_idx) / sample_rate
        if remaining_sec <= MAX_DIRECT_AUDIO_SEC:
            chunks.append(
                AudioChunk(
                    speech[start_idx:span_end_idx],
                    start_idx / sample_rate,
                    span_end_idx / sample_rate,
                    final_reason,
                )
            )
            break

        search_start_idx = start_idx + int(MIN_BOUNDARY_SEC * sample_rate)
        search_end_idx = min(start_idx + int(MAX_BOUNDARY_SEC * sample_rate), span_end_idx)
        target_idx = min(start_idx + int(TARGET_CHUNK_SEC * sample_rate), search_end_idx)

        cut_idx, split_reason = _find_chunk_boundary(
            speech,
            sample_rate,
            search_start_idx,
            search_end_idx,
            target_idx,
        )

        chunks.append(
            AudioChunk(
                speech[start_idx:cut_idx],
                start_idx / sample_rate,
                cut_idx / sample_rate,
                split_reason,
            )
        )

        next_start_idx = max(cut_idx, start_idx + 1)

        if (span_end_idx - next_start_idx) / sample_rate < MIN_FINAL_CHUNK_SEC and chunks:
            previous = chunks[-1]
            chunks[-1] = AudioChunk(
                speech[int(previous.start_sec * sample_rate):span_end_idx],
                previous.start_sec,
                span_end_idx / sample_rate,
                previous.split_reason,
            )
            break

        start_idx = next_start_idx

    return chunks


def _find_long_pause_boundaries(speech: np.ndarray, sample_rate: int) -> list[int]:
    frame_samples = max(1, int(ENERGY_FRAME_SEC * sample_rate))
    hop_samples = max(1, int(ENERGY_HOP_SEC * sample_rate))

    if len(speech) <= frame_samples:
        return []

    frame_starts = np.arange(0, len(speech) - frame_samples + 1, hop_samples)
    if frame_starts.size == 0:
        return []

    rms_values = np.array(
        [
            float(np.sqrt(np.mean(np.square(speech[start:start + frame_samples]))))
            for start in frame_starts
        ],
        dtype=np.float32,
    )

    if rms_values.size == 0 or float(np.max(rms_values)) <= 0.0:
        return []

    silence_threshold = _relative_silence_threshold(rms_values)
    quiet_frames = rms_values <= silence_threshold
    min_pause_frames = max(1, int(LONG_PAUSE_SEC / ENERGY_HOP_SEC))
    boundaries: list[int] = []
    run_start = None

    for index, is_quiet in enumerate(quiet_frames):
        if is_quiet and run_start is None:
            run_start = index

        is_run_end = run_start is not None and (not is_quiet or index == len(quiet_frames) - 1)
        if not is_run_end:
            continue

        run_end = index if is_quiet else index - 1
        run_length = run_end - run_start + 1
        if run_length >= min_pause_frames:
            start_sample = int(frame_starts[run_start])
            end_sample = int(frame_starts[run_end] + frame_samples)
            boundaries.append((start_sample + end_sample) // 2)

        run_start = None

    return boundaries


def _filter_pause_boundaries(boundaries: list[int], total_samples: int, sample_rate: int) -> list[int]:
    min_segment_samples = int(MIN_PAUSE_SEGMENT_SEC * sample_rate)
    filtered: list[int] = []
    previous_boundary = 0

    for boundary in sorted(set(boundaries)):
        if boundary - previous_boundary < min_segment_samples:
            continue
        if total_samples - boundary < min_segment_samples:
            continue

        filtered.append(boundary)
        previous_boundary = boundary

    return filtered


def _find_chunk_boundary(
    speech: np.ndarray,
    sample_rate: int,
    search_start_idx: int,
    search_end_idx: int,
    target_idx: int,
) -> tuple[int, str]:
    frame_samples = max(1, int(ENERGY_FRAME_SEC * sample_rate))
    hop_samples = max(1, int(ENERGY_HOP_SEC * sample_rate))

    if search_end_idx <= search_start_idx + frame_samples:
        return target_idx, "low_energy"

    frame_starts = np.arange(search_start_idx, search_end_idx - frame_samples + 1, hop_samples)
    if frame_starts.size == 0:
        return target_idx, "low_energy"

    rms_values = np.array(
        [
            float(np.sqrt(np.mean(np.square(speech[start:start + frame_samples]))))
            for start in frame_starts
        ],
        dtype=np.float32,
    )

    if rms_values.size == 0:
        return target_idx, "low_energy"

    silence_threshold = _relative_silence_threshold(rms_values)
    quiet_frames = rms_values <= silence_threshold
    min_silence_frames = max(1, int(MIN_SILENCE_SEC / ENERGY_HOP_SEC))
    silence_cut = _best_silence_cut(frame_starts, quiet_frames, min_silence_frames, target_idx, frame_samples)

    if silence_cut is not None:
        return silence_cut, "silence"

    low_energy_cut = _best_low_energy_cut(frame_starts, rms_values, target_idx, frame_samples)
    return low_energy_cut, "low_energy"


def _relative_silence_threshold(rms_values: np.ndarray) -> float:
    max_rms = float(np.max(rms_values))
    if max_rms <= 0.0:
        return 0.0

    percentile_floor = float(np.percentile(rms_values, 25)) * 1.25
    max_relative = max_rms * 0.2
    return max(1e-5, min(percentile_floor, max_relative))


def _best_silence_cut(
    frame_starts: np.ndarray,
    quiet_frames: np.ndarray,
    min_silence_frames: int,
    target_idx: int,
    frame_samples: int,
) -> int | None:
    best_cut = None
    best_distance = None
    run_start = None

    for index, is_quiet in enumerate(quiet_frames):
        if is_quiet and run_start is None:
            run_start = index
        is_run_end = run_start is not None and (not is_quiet or index == len(quiet_frames) - 1)
        if not is_run_end:
            continue

        run_end = index if is_quiet else index - 1
        run_length = run_end - run_start + 1
        if run_length >= min_silence_frames:
            start_sample = int(frame_starts[run_start])
            end_sample = int(frame_starts[run_end] + frame_samples)
            cut_idx = (start_sample + end_sample) // 2
            distance = abs(cut_idx - target_idx)
            if best_distance is None or distance < best_distance:
                best_cut = cut_idx
                best_distance = distance

        run_start = None

    return best_cut


def _best_low_energy_cut(
    frame_starts: np.ndarray,
    rms_values: np.ndarray,
    target_idx: int,
    frame_samples: int,
) -> int:
    quiet_limit = float(np.percentile(rms_values, 20))
    candidate_indexes = np.where(rms_values <= quiet_limit)[0]
    if candidate_indexes.size == 0:
        candidate_indexes = np.array([int(np.argmin(rms_values))])

    candidate_centers = frame_starts[candidate_indexes] + frame_samples // 2
    best_index = int(np.argmin(np.abs(candidate_centers - target_idx)))
    return int(candidate_centers[best_index])
