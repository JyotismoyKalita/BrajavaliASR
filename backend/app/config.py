from pathlib import Path

import torch


ROOT_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT_DIR / "whisper-brajavali-lora-model"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
TARGET_SAMPLE_RATE = 16000
