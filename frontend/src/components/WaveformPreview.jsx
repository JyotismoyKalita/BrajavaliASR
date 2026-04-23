import { useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

export default function WaveformPreview({ audioUrl, onRegionChange, trimStartSec, trimEndSec, theme }) {
  const containerRef = useRef(null);
  const waveSurferRef = useRef(null);
  const regionRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formattedCurrentTime = useMemo(() => currentTime.toFixed(2), [currentTime]);
  const formattedDuration = useMemo(() => duration.toFixed(2), [duration]);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) {
      return;
    }

    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
    }

    const regionsPlugin = RegionsPlugin.create();
    const isLightTheme = theme === "light";
    const waveSurfer = WaveSurfer.create({
      container: containerRef.current,
      plugins: [regionsPlugin],
      waveColor: isLightTheme ? "#2a1717" : "#fff7ef",
      progressColor: "#c21d18",
      cursorColor: isLightTheme ? "#050505" : "#ffffff",
      barWidth: 2,
      height: 120,
      normalize: true,
    });

    waveSurfer.load(audioUrl);
    waveSurferRef.current = waveSurfer;

    waveSurfer.on("ready", () => {
      const waveDuration = waveSurfer.getDuration();
      setDuration(waveDuration);
      setCurrentTime(0);

      const region = regionsPlugin.addRegion({
        start: 0,
        end: waveDuration > 0 ? waveDuration : 0.01,
        color: isLightTheme ? "rgba(194, 29, 24, 0.16)" : "rgba(209, 58, 47, 0.22)",
        drag: true,
        resize: true,
      });

      regionRef.current = region;
      onRegionChange(region.start, region.end);

      region.on("update-end", () => {
        onRegionChange(region.start, region.end);
      });
    });

    waveSurfer.on("timeupdate", (time) => {
      setCurrentTime(time);
    });

    waveSurfer.on("play", () => setIsPlaying(true));
    waveSurfer.on("pause", () => setIsPlaying(false));

    return () => {
      waveSurfer.destroy();
    };
  }, [audioUrl, onRegionChange, theme]);

  function togglePlay() {
    if (!waveSurferRef.current) {
      return;
    }
    waveSurferRef.current.playPause();
  }

  function playRegion() {
    const waveSurfer = waveSurferRef.current;
    const region = regionRef.current;
    if (!waveSurfer || !region) {
      return;
    }
    waveSurfer.play(region.start, region.end);
  }

  return (
    <div className="card waveform-card">
      <label className="label">Waveform</label>
      <div className="meta-row waveform-meta-row">
        <span className="badge">Trim start: {trimStartSec.toFixed(2)} sec</span>
        <span className="badge">Trim end: {(trimEndSec ?? 0).toFixed(2)} sec</span>
      </div>
      <div className="waveform-canvas" ref={containerRef} />
      <div className="player-controls">
        <button className="secondary-btn" onClick={togglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button className="secondary-btn" onClick={playRegion}>
          Play Selected Region
        </button>
        <span className="time-display">
          {formattedCurrentTime}s / {formattedDuration}s
        </span>
      </div>
      <p className="helper">Drag or resize the highlighted region to set trim start and trim end.</p>
    </div>
  );
}
