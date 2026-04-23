export default function TrimControls({
  trimStartSec,
  trimEndSec,
  normalize,
  onNormalizeChange,
}) {
  return (
    <div className="card">
      <label className="label">Selected Region + Preprocessing</label>
      <div className="meta-row">
        <span className="badge">Trim start: {trimStartSec.toFixed(2)} sec</span>
        <span className="badge">Trim end: {(trimEndSec ?? 0).toFixed(2)} sec</span>
      </div>
      <label className="checkbox-row">
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
