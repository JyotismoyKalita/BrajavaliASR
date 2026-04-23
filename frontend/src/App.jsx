import { useCallback, useEffect, useMemo, useState } from "react";
import AudioUpload from "./components/AudioUpload";
import ResultPanel from "./components/ResultPanel";
import WaveformPreview from "./components/WaveformPreview";
import { transcribeAudio } from "./services/api";

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(url);
    };
  });
}

export default function App() {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState(null);
  const [normalize, setNormalize] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [inputResetKey, setInputResetKey] = useState(0);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const fileName = useMemo(() => file?.name || "", [file]);
  const hasAudio = Boolean(audioUrl);
  const selectedDurationSec = useMemo(() => {
    if (!hasAudio) {
      return 0;
    }
    if (trimEndSec !== null && trimEndSec !== undefined) {
      return Math.max(0, trimEndSec - trimStartSec);
    }
    return 0;
  }, [hasAudio, trimEndSec, trimStartSec]);

  const handleRegionChange = useCallback((start, end) => {
    setTrimStartSec(start);
    setTrimEndSec(end);
  }, []);

  async function onFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setFile(selected);
    setAudioUrl(URL.createObjectURL(selected));
    const duration = await readAudioDuration(selected);
    setTrimStartSec(0);
    setTrimEndSec(duration || null);
    setResult(null);
    setError("");
  }

  async function runInference() {
    if (!file) {
      setError("Please choose an audio file first.");
      return;
    }
    if (trimEndSec !== null && trimEndSec <= trimStartSec) {
      setError("Trim end must be greater than trim start.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await transcribeAudio({
        file,
        trimStartSec,
        trimEndSec,
        normalize,
      });
      setResult(payload);
    } catch (requestError) {
      setError(requestError.message || "Inference failed.");
    } finally {
      setLoading(false);
    }
  }

  function clearInferenceOutput() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setFile(null);
    setAudioUrl("");
    setTrimStartSec(0);
    setTrimEndSec(null);
    setResult(null);
    setError("");
    setInputResetKey((prev) => prev + 1);
  }

  const linkStyle = {textDecoration: "none", color: "white", fontWeight: "bold", marginRight: "10px", marginLeft: "10px"};

  return (
    <main className="page app-shell">
      <section className="hero hero-landing">
        <div>
          <span className="hero-pill">A mini project by<a href="https://www.linkedin.com/in/jyotismoy-kalita/" style={linkStyle}>Jyotismoy Kalita</a>and<a href="https://www.linkedin.com/in/sanjib-das-6226342a9/" style={linkStyle}>Sanjib Das</a>: 6th Semester, Department of Information Techonology, Gauhati University</span>
          <h1>Brajavali ASR Studio</h1>
          <p>
          Echoes of tradition, decoded by machine learning, where, Brajavali meets AI
          </p>
        </div>
      </section>

      <section className="top-row">
        <div>
          <AudioUpload
            onFileChange={onFileChange}
            fileName={fileName}
            normalize={normalize}
            onNormalizeChange={setNormalize}
            inputResetKey={inputResetKey}
          />
        </div>
        <div>
          <ResultPanel
            loading={loading}
            result={result}
            error={error}
            hasAudio={hasAudio}
            selectedDurationSec={selectedDurationSec}
            onRunInference={runInference}
            onClear={clearInferenceOutput}
          />
        </div>
      </section>

      <section className="waveform-row">
        {audioUrl ? (
          <WaveformPreview
            audioUrl={audioUrl}
            onRegionChange={handleRegionChange}
            trimStartSec={trimStartSec}
            trimEndSec={trimEndSec}
          />
        ) : (
          <div className="card empty-state">
            <label className="label">Waveform</label>
            <p className="muted">Upload audio to see playback and region trim controls.</p>
          </div>
        )}
      </section>

      <section className="card project-description-card project-footer">
        <label className="label">Project Description</label>
        <p className="description-text">
          Brajavali is a low-resource language with very limited available training data. To
          overcome this scarcity, transfer learning is applied by adapting the Whisper model to
          Brajavali using the small dataset. Parameter-efficient fine-tuning with LoRA (Low-Rank
          Adaptation) is employed, which freezes most of the model&apos;s layers. This approach
          prevents catastrophic forgetting of the original multilingual knowledge while allowing the
          model to learn Brajavali-specific patterns. As a result, the model adapts effectively to
          the new language without overfitting or memorizing the limited data.
        </p>
      </section>
    </main>
  );
}
