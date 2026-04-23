export default function ResultPanel({
  loading,
  result,
  error,
  hasAudio,
  selectedDurationSec,
  onRunInference,
  onClear,
}) {
  const chunks = result?.chunks || [];
  const wasChunked = chunks.length > 1;
  const willChunk = hasAudio && selectedDurationSec > 14;
  const splitLabels = {
    long_pause: "long-pause split",
    silence: "pause split",
    low_energy: "low-energy split",
    final: "final chunk",
    single: "single chunk",
  };

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
      {willChunk && !result && (
        <p className="warning">
          Selected audio is {selectedDurationSec.toFixed(2)} seconds. It will be split at pauses before inference.
        </p>
      )}
      {loading && <p className="muted">Running inference...</p>}
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="result-grid">
          <div>
            <span className="small-label">Transcription</span>
            <p className="result-text">{result.transcription}</p>
          </div>
          <div className="meta-row">
            <span className="badge">Sample rate: {result.sample_rate} Hz</span>
            <span className="badge">Duration: {result.duration_sec.toFixed(2)} sec</span>
            {wasChunked && <span className="badge">Processed in {chunks.length} chunks</span>}
          </div>
          {wasChunked && (
            <details className="chunk-details">
              <summary>View chunk-wise transcription</summary>
              <div className="chunk-list">
                {chunks.map((chunk) => (
                  <div className="chunk-item" key={chunk.index}>
                    <div className="chunk-meta">
                      <span>Chunk {chunk.index}</span>
                      <span>
                        {chunk.start_sec.toFixed(2)}s - {chunk.end_sec.toFixed(2)}s
                      </span>
                      <span>{splitLabels[chunk.split_reason] || "chunk"}</span>
                    </div>
                    <p className="chunk-text">{chunk.transcription}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
