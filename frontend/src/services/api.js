const API_BASE_URL = "http://127.0.0.1:8000";

export async function transcribeAudio({
  file,
  trimStartSec,
  trimEndSec,
}) {
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("trim_start_sec", String(trimStartSec ?? 0));
  if (trimEndSec !== null && trimEndSec !== undefined && Number.isFinite(trimEndSec)) {
    formData.append("trim_end_sec", String(trimEndSec));
  }

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.detail || "Transcription request failed.");
  }

  return response.json();
}
