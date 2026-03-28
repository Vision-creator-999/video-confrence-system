/**
 * Home Page
 * 
 * Landing page where users can create a new room or
 * join an existing room by entering a room ID.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaVideo, FaArrowRight, FaLink, FaShieldAlt, FaUsers } from 'react-icons/fa';
import './Home.css';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  /**
   * Generate a random room ID
   */
  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 3; i++) {
      if (i > 0) id += '-';
      for (let j = 0; j < 4; j++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return id;
  };

  /**
   * Create a new room with a random ID
   */
  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    navigate(`/room/${newRoomId}`);
  };

  /**
   * Join an existing room
   * Now handles both plain IDs and full room URLs
   */
  const handleJoinRoom = (e) => {
    e.preventDefault();
    const input = roomId.trim();
    if (!input) return;

    let targetId = input;

    // Check if user pasted a full URL (e.g., http://localhost:5173/room/abc-123)
    try {
      if (input.includes('/room/')) {
        // Simple extraction: parts after the last '/room/'
        const parts = input.split('/room/');
        let idFromUrl = parts[parts.length - 1];
        
        // Remove trailing slash if present
        if (idFromUrl.endsWith('/')) {
          idFromUrl = idFromUrl.slice(0, -1);
        }
        
        targetId = idFromUrl;
      }
    } catch (err) {
      console.error('Error parsing room URL:', err);
    }

    if (targetId) {
      navigate(`/room/${targetId}`);
    }
  };

  return (
    <div className="home">
      {/* Decorative background elements */}
      <div className="home__bg-orb home__bg-orb--1" />
      <div className="home__bg-orb home__bg-orb--2" />
      <div className="home__bg-orb home__bg-orb--3" />

      <div className="home__content">
        {/* Hero Section */}
        <div className="home__hero">
          <div className="home__logo">
            <div className="home__logo-icon">
              <FaVideo />
            </div>
            <h1 className="home__title">MeetUp</h1>
          </div>
          <p className="home__subtitle">
            Premium video conferencing, right in your browser.
            <br />
            Crystal clear audio & video, powered by WebRTC.
          </p>
        </div>

        {/* Actions Card */}
        <div className="home__card">
          {/* Create Room */}
          <button
            id="btn-create-room"
            className="home__create-btn"
            onClick={handleCreateRoom}
          >
            <span className="home__create-btn-content">
              <FaVideo className="home__create-btn-icon" />
              <span>
                <strong>New Meeting</strong>
                <small>Create a room instantly</small>
              </span>
            </span>
            <FaArrowRight className="home__create-btn-arrow" />
          </button>

          {/* Divider */}
          <div className="home__divider">
            <span>or join an existing room</span>
          </div>

          {/* Join Room Form */}
          <form className="home__join-form" onSubmit={handleJoinRoom}>
            <div className="home__input-wrapper">
              <FaLink className="home__input-icon" />
              <input
                id="input-room-id"
                type="text"
                placeholder="Enter room code (e.g. abc1-def2-ghi3)"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="home__input"
                autoComplete="off"
              />
            </div>
            <button
              id="btn-join-room"
              type="submit"
              className="home__join-btn"
              disabled={!roomId.trim()}
            >
              Join
              <FaArrowRight />
            </button>
          </form>
        </div>

        {/* Feature Highlights */}
        <div className="home__features">
          <div className="home__feature">
            <div className="home__feature-icon">
              <FaShieldAlt />
            </div>
            <div>
              <h3>Peer-to-Peer</h3>
              <p>Direct encrypted connection between participants</p>
            </div>
          </div>
          <div className="home__feature">
            <div className="home__feature-icon">
              <FaUsers />
            </div>
            <div>
              <h3>No Sign Up</h3>
              <p>Jump into a call instantly, no account needed</p>
            </div>
          </div>
          <div className="home__feature">
            <div className="home__feature-icon">
              <FaVideo />
            </div>
            <div>
              <h3>HD Quality</h3>
              <p>720p video with echo cancellation & noise suppression</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
