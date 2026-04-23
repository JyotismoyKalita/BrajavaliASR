from __future__ import annotations

import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

from .config import DEVICE, MODEL_DIR
from .ipa import generate_brajavali_ipa


class BrajavaliASRService:
    def __init__(self) -> None:
        self.model = WhisperForConditionalGeneration.from_pretrained(str(MODEL_DIR)).to(DEVICE)
        self.processor = WhisperProcessor.from_pretrained(str(MODEL_DIR))

    def transcribe(self, speech, sample_rate: int) -> tuple[str, str]:
        input_features = self.processor.feature_extractor(
            speech,
            sampling_rate=sample_rate,
            return_tensors="pt",
        ).input_features.to(DEVICE)

        attention_mask = torch.ones(input_features.shape, dtype=torch.long).to(DEVICE)

        with torch.no_grad():
            predicted_ids = self.model.generate(
                input_features,
                attention_mask=attention_mask,
                language="as",
                task="transcribe",
            )

        transcription = self.processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
        ipa = generate_brajavali_ipa(transcription)
        return transcription, ipa


asr_service = BrajavaliASRService()
