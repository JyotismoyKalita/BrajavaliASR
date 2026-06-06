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

function getInitialTheme() {
  const savedTheme = localStorage.getItem("brajavali-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function App() {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState(null);
  const [disableSplitting, setDisableSplitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [inputResetKey, setInputResetKey] = useState(0);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("brajavali-theme", theme);
  }, [theme]);

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
        disableSplitting,
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

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return (
    <main className="page app-shell">
      <section className="hero hero-landing">
        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"></circle>
              <line x1="12" y1="2" x2="12" y2="4"></line>
              <line x1="12" y1="20" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"></line>
              <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="4" y2="12"></line>
              <line x1="20" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"></line>
              <line x1="17.66" y1="6.34" x2="19.07" y2="4.93"></line>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>
        <div className="hero-content">
          <span className="hero-pill">অসমীয়া ভাষা প্ৰযুক্তি • Gauhati University Mini Project</span>
          <h1>Brajavali ASR Studio</h1>
          <p>Echoes of tradition, decoded by machine learning, where Brajavali meets AI.</p>
          <div className="hero-authors">
            <a href="https://www.linkedin.com/in/jyotismoy-kalita/">Jyotismoy Kalita</a>
            <span>and</span>
            <a href="https://www.linkedin.com/in/sanjib-das-6226342a9/">Sanjib Das</a>
            <span>6th Semester, Department of Information Technology</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <img src="/assets/assam/monikut.png" alt="" />
        </div>
      </section>

      <section className="top-row">
        <div>
          <AudioUpload
            onFileChange={onFileChange}
            fileName={fileName}
            disableSplitting={disableSplitting}
            onDisableSplittingChange={setDisableSplitting}
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
            disableSplitting={disableSplitting}
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
            theme={theme}
          />
        ) : (
          <div className="card empty-state">
            <label className="label">Waveform</label>
            <p className="muted">Upload audio to see playback and region trim controls.</p>
          </div>
        )}
      </section>

      <section className="card project-description-card project-footer">
        <div className="project-copy">
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
        </div>
        <img className="project-symbols" src="/assets/assam/sattriya-elements.png" alt="" aria-hidden="true" />
      </section>
    </main>
  );
}
