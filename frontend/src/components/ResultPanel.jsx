export default function ResultPanel({ loading, result, error, hasAudio, onRunInference, onClear }) {
  return (
    <div className="card inference-card">
      <label className="label">Inference Output</label>
      <div className="inference-actions">
        <button className="primary-btn action-btn" disabled={loading || !hasAudio} onClick={onRunInference}>
          {loading ? "Processing..." : "Run Inference"}
        </button>
        <button className="secondary-btn action-btn" disabled={loading} onClick={onClear}>
          Clear
        </button>
      </div>
      {loading && <p className="muted">Running inference...</p>}
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="result-grid">
          <div>
            <span className="small-label">Transcription</span>
            <p className="result-text">{result.transcription}</p>
          </div>
          <div>
            <span className="small-label">IPA</span>
            <p className="result-text">{result.ipa}</p>
          </div>
          <div className="meta-row">
            <span className="badge">Sample rate: {result.sample_rate} Hz</span>
            <span className="badge">Duration: {result.duration_sec.toFixed(2)} sec</span>
          </div>
        </div>
      )}
    </div>
  );
}
