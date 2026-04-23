from pydantic import BaseModel


class TranscriptionChunkResponse(BaseModel):
    index: int
    start_sec: float
    end_sec: float
    transcription: str
    split_reason: str


class TranscriptionResponse(BaseModel):
    transcription: str
    sample_rate: int
    duration_sec: float
    chunks: list[TranscriptionChunkResponse]
