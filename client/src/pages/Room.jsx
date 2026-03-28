/**
 * Room Page
 * 
 * The main video call interface. Displays local and remote video,
 * call controls, room info header, and connection status.
 * Uses the useWebRTC hook for all WebRTC & signaling logic.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { FaCopy, FaCheck, FaArrowLeft, FaCircle, FaExclamationTriangle } from 'react-icons/fa';
import VideoPlayer from '../components/VideoPlayer';
import Controls from '../components/Controls';
import useWebRTC from '../hooks/useWebRTC';
import './Room.css';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Initialize WebRTC with the room ID from URL params
  const {
    localStream,
    remoteStream,
    isMicOn,
    isCameraOn,
    connectionState,
    error,
    toggleMic,
    toggleCamera,
    leaveCall,
  } = useWebRTC(roomId);

  /**
   * Copy the room link to clipboard
   */
  const copyRoomLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  /**
   * Leave the call and navigate home
   */
  const handleLeave = useCallback(() => {
    leaveCall();
    navigate('/');
  }, [leaveCall, navigate]);

  /**
   * Get human-readable connection status
   */
  const getStatusInfo = () => {
    switch (connectionState) {
      case 'connecting':
        return { text: 'Connecting...', className: 'status--connecting' };
      case 'connected':
        return { text: 'Connected', className: 'status--connected' };
      case 'failed':
        return { text: 'Connection failed', className: 'status--failed' };
      default:
        return { text: 'Waiting for others...', className: 'status--waiting' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="room">
      {/* === Header === */}
      <header className="room__header">
        <div className="room__header-left">
          <button
            id="btn-back-home"
            className="room__back-btn"
            onClick={handleLeave}
            title="Leave and go home"
          >
            <FaArrowLeft />
          </button>
          <div className="room__info">
            <h1 className="room__title">MeetUp</h1>
            <div className={`room__status ${statusInfo.className}`}>
              <FaCircle className="room__status-dot" />
              <span>{statusInfo.text}</span>
            </div>
          </div>
        </div>

        <div className="room__header-right">
          <div className="room__room-id">
            <span className="room__room-id-label">Room:</span>
            <code className="room__room-id-code">{roomId}</code>
            <button
              id="btn-copy-link"
              className={`room__copy-btn ${copied ? 'room__copy-btn--copied' : ''}`}
              onClick={copyRoomLink}
              title="Copy room link"
            >
              {copied ? <FaCheck /> : <FaCopy />}
            </button>
          </div>
        </div>
      </header>

      {/* === Error Banner === */}
      {error && (
        <div className="room__error">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* === Video Grid === */}
      <main className="room__videos">
        {/* Remote Video (large, main view) */}
        <div className="room__video-main">
          <VideoPlayer
            stream={remoteStream}
            label="Remote"
            isCameraOn={true}
            isConnected={connectionState === 'connected'}
            isLocal={false}
          />

          {/* Waiting overlay when no remote stream */}
          {!remoteStream && (
            <div className="room__waiting-overlay">
              <div className="room__waiting-content">
                <div className="room__waiting-spinner" />
                <h2 className="room__waiting-title">Waiting for someone to join...</h2>
                <p className="room__waiting-text">
                  Share this link with someone to start your call
                </p>
                <button
                  className="room__waiting-copy-btn"
                  onClick={copyRoomLink}
                >
                  {copied ? (
                    <>
                      <FaCheck /> Link copied!
                    </>
                  ) : (
                    <>
                      <FaCopy /> Copy invite link
                    </>
                  )}
                </button>
                <div className="room__waiting-url-display">
                  <span className="room__waiting-url-text">{window.location.href}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (small, picture-in-picture style) */}
        <div className="room__video-self">
          <VideoPlayer
            stream={localStream}
            muted={true}
            mirrored={true}
            label="You"
            isCameraOn={isCameraOn}
            isConnected={true}
            isLocal={true}
          />
        </div>
      </main>

      {/* === Controls === */}
      <Controls
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onLeaveCall={handleLeave}
      />
    </div>
  );
}
