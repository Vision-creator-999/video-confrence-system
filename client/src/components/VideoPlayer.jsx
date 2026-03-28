/**
 * VideoPlayer Component
 * 
 * Renders a video element with label, connection status indicator,
 * and camera-off placeholder. Handles both local (mirrored) and
 * remote video streams.
 */

import { useRef, useEffect } from 'react';
import './VideoPlayer.css';

export default function VideoPlayer({
  stream,
  muted = false,
  mirrored = false,
  label = '',
  isCameraOn = true,
  isConnected = false,
  isLocal = false,
}) {
  const videoRef = useRef(null);

  // Attach the MediaStream to the video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-player ${isLocal ? 'video-player--local' : 'video-player--remote'}`}>
      {/* Glass card container */}
      <div className="video-player__container">
        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`video-player__video ${mirrored ? 'video-player__video--mirrored' : ''} ${
            !isCameraOn || !stream ? 'video-player__video--hidden' : ''
          }`}
        />

        {/* Camera off placeholder */}
        {(!isCameraOn || !stream) && (
          <div className="video-player__placeholder">
            <div className="video-player__avatar">
              <span className="video-player__avatar-icon">
                {label ? label.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
            <p className="video-player__placeholder-text">
              {!stream ? 'Waiting for video...' : 'Camera is off'}
            </p>
          </div>
        )}

        {/* Label badge */}
        <div className="video-player__label">
          {/* Connection status dot */}
          <span
            className={`video-player__status-dot ${
              isConnected ? 'video-player__status-dot--connected' : ''
            }`}
          />
          <span className="video-player__label-text">{label}</span>
        </div>
      </div>
    </div>
  );
}
