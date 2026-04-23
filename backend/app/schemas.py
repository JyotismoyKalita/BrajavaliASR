from pydantic import BaseModel


class TranscriptionResponse(BaseModel):
    transcription: str
    ipa: str
    sample_rate: int
    duration_sec: float
