# Brajavali ASR Studio

Brajavali ASR Studio is a web-based Automatic Speech Recognition (ASR) application for transcribing Brajavali speech. The project uses a Whisper-based speech recognition model adapted with LoRA fine-tuning and provides a simple browser interface for uploading, trimming, normalizing, and transcribing audio.

This project was developed as a Semester 6 Mini Project for the B.Tech in Information Technology programme at Gauhati University.

## Project Overview

Brajavali is a low-resource language with limited publicly available speech data. Because of this scarcity, the project uses transfer learning instead of training a speech recognition model from scratch. A pre-trained Whisper model is adapted for Brajavali using LoRA (Low-Rank Adaptation), allowing the model to learn language-specific patterns while retaining the multilingual knowledge of the base model.

The system includes:

- A FastAPI backend for audio processing and model inference
- A React frontend for user interaction
- A locally stored Whisper LoRA model
- Audio trimming, normalization, waveform preview, transcription, and IPA generation

## Features

- Upload audio files from the browser
- Preview uploaded audio using a waveform
- Trim audio before inference
- Optional audio normalization
- Transcribe Brajavali speech using a Whisper-based model
- Generate IPA-style phonetic output from the transcription
- REST API support through FastAPI
- Clean frontend built with React and Vite

## Tech Stack

### Frontend

- React
- Vite
- WaveSurfer.js
- JavaScript
- CSS

### Backend

- Python
- FastAPI
- Uvicorn
- Transformers
- PyTorch
- Torchaudio
- SoundFile
- NumPy
- Pydub

### Model

- Base model: `openai/whisper-small`
- Adaptation method: LoRA
- Local model directory: `whisper-brajavali-lora-model`

## Repository Structure

```text
BrajavaliASR/
|-- backend/
|   |-- app/
|   |   |-- main.py              # FastAPI routes and inference endpoint
|   |   |-- asr_service.py       # Whisper model loading and transcription
|   |   |-- audio_utils.py       # Audio loading, trimming, normalization, resampling
|   |   |-- ipa.py               # IPA-style phonetic conversion
|   |   |-- schemas.py           # API response models
|   |   `-- config.py            # Model path and device configuration
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- components/          # UI components
|   |   |-- services/api.js      # Backend API calls
|   |   |-- App.jsx              # Main application
|   |   `-- main.jsx             # React entry point
|   |-- package.json
|   `-- vite.config.js
|-- whisper-brajavali-lora-model/
|   |-- adapter_config.json
|   |-- adapter_model.safetensors
|   |-- processor_config.json
|   |-- tokenizer_config.json
|   `-- tokenizer.json
|-- commands.txt
`-- README.md
```

## Prerequisites

Make sure the following are installed on your system:

- Python 3.10 or later
- Node.js 18 or later
- npm
- Git
- FFmpeg, recommended for WebM/Ogg and other compressed browser audio formats

For GPU acceleration, install a CUDA-compatible version of PyTorch. If CUDA is unavailable, the backend automatically runs on CPU.

## Installation and Setup

Clone the repository:

```bash
git clone <repository-url>
cd BrajavaliASR
```

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install pydub
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will run at:

```text
http://127.0.0.1:8000
```

FastAPI interactive documentation will be available at:

```text
http://127.0.0.1:8000/docs
```

### Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:

```text
http://localhost:5173
```

## API Endpoints

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

### Transcribe Audio

```http
POST /transcribe
```

Form data:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `audio` | File | Yes | Audio file to be transcribed |
| `trim_start_sec` | Float | No | Start time for trimming in seconds |
| `trim_end_sec` | Float | No | End time for trimming in seconds |
| `normalize` | Boolean | No | Whether to normalize audio before inference |

Response:

```json
{
  "transcription": "transcribed text",
  "ipa": "phonetic output",
  "sample_rate": 16000,
  "duration_sec": 4.25
}
```

## How It Works

1. The user uploads an audio file through the React interface.
2. The frontend displays a waveform preview and allows trim selection.
3. The selected audio settings are sent to the FastAPI backend.
4. The backend loads the audio, trims it, optionally normalizes it, and resamples it to 16 kHz.
5. The Whisper-based Brajavali model generates the transcription.
6. The transcription is converted into an IPA-style phonetic representation.
7. The frontend displays the transcription, IPA output, duration, and sample rate.

## Model Notes

The model files are stored locally inside `whisper-brajavali-lora-model`. The backend expects this directory to exist at the root of the repository.

The project uses LoRA-based fine-tuning to make adaptation practical for a low-resource language setting. This approach reduces training cost and helps avoid overfitting on a small dataset.

## Limitations

- The model performance depends heavily on the size and quality of the Brajavali training data.
- Accuracy may vary for noisy audio, unclear speech, or accents not represented in the dataset.
- CPU inference may be slow compared to GPU inference.
- IPA generation is rule-based and may not fully capture all pronunciation variations.

## Future Scope

- Expand the Brajavali speech dataset
- Improve model accuracy through additional fine-tuning and evaluation
- Add word error rate (WER) based evaluation reports
- Support batch transcription
- Add speaker metadata and dataset management tools
- Improve IPA conversion using a more complete linguistic rule set
- Package the application for easier deployment

## Contributors

- Jyotismoy Kalita
- Sanjib Das

Department of Information Technology  
Gauhati University

## Academic Context

This repository is part of a Mini Project submitted for Semester 6 of the B.Tech in Information Technology programme under Gauhati University. The project demonstrates the application of speech processing, transfer learning, web development, and low-resource language technology.

## License

This project is intended for academic and educational use. Add a license file before using, distributing, or modifying the project for public or commercial purposes.
