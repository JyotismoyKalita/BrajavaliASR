import React, { useRef, useState } from "react";

export default function AudioUpload({
  onFileChange,
  fileName,
  normalize,
  onNormalizeChange,
  inputResetKey,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleRecordClick = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const mimeType = mediaRecorderRef.current.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const extension = mimeType.includes("wav") ? "wav" : "webm";
          const recordedFile = new File([audioBlob], `recording-${Date.now()}.${extension}`, {
            type: mimeType,
          });
          const mockEvent = {
            target: {
              files: [recordedFile],
              value: "",
            },
          };
          onFileChange(mockEvent);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert("Microphone access denied.");
      }
    } else {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="card audio-card">
      <label className="label">Audio Source</label>
      <div className="upload-row modern-upload">
        <label className="icon-btn upload-btn" title="Upload audio">
          <input
            key={inputResetKey}
            className="file-input-hidden"
            type="file"
            accept="audio/*"
            onChange={onFileChange}
          />
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </label>

        <button
          type="button"
          className={`icon-btn upload-btn ${isRecording ? "recording" : ""}`}
          title={isRecording ? "Stop recording" : "Record audio"}
          onClick={handleRecordClick}
        >
          {isRecording ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
        </button>

        <span className="muted file-name">{fileName || "No file selected"}</span>
      </div>

      <label className="checkbox-row upload-normalize-row">
        <input
          type="checkbox"
          checked={normalize}
          onChange={(e) => onNormalizeChange(e.target.checked)}
        />
        Normalize audio before inference
      </label>
    </div>
  );
}
