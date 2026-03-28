/**
 * Controls Component
 * 
 * Call control bar with toggle buttons for microphone, camera,
 * and a leave call button. Features tooltip labels and visual
 * state indicators with smooth animations.
 */

import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
} from 'react-icons/fa';
import './Controls.css';

export default function Controls({
  isMicOn,
  isCameraOn,
  onToggleMic,
  onToggleCamera,
  onLeaveCall,
}) {
  return (
    <div className="controls">
      <div className="controls__bar">
        {/* Microphone Toggle */}
        <button
          id="btn-toggle-mic"
          className={`controls__btn ${!isMicOn ? 'controls__btn--off' : ''}`}
          onClick={onToggleMic}
          title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          <span className="controls__btn-icon">
            {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </span>
          <span className="controls__btn-label">
            {isMicOn ? 'Mic' : 'Unmute'}
          </span>
        </button>

        {/* Camera Toggle */}
        <button
          id="btn-toggle-camera"
          className={`controls__btn ${!isCameraOn ? 'controls__btn--off' : ''}`}
          onClick={onToggleCamera}
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          <span className="controls__btn-icon">
            {isCameraOn ? <FaVideo /> : <FaVideoSlash />}
          </span>
          <span className="controls__btn-label">
            {isCameraOn ? 'Camera' : 'Start Video'}
          </span>
        </button>

        {/* Leave Call */}
        <button
          id="btn-leave-call"
          className="controls__btn controls__btn--leave"
          onClick={onLeaveCall}
          title="Leave call"
          aria-label="Leave call"
        >
          <span className="controls__btn-icon">
            <FaPhoneSlash />
          </span>
          <span className="controls__btn-label">Leave</span>
        </button>
      </div>
    </div>
  );
}
