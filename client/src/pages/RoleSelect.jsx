import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginGate from '../components/LoginGate';
import '../components/LoginGate.css';
import './RoleSelect.css';

export default function RoleSelect() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = () => {
    sessionStorage.setItem('clinicflow_auth', 'true');
    navigate('/dashboard');
  };

  if (showLogin) {
    return (
      <div className="role-login-wrapper">
        <button className="role-back-btn" onClick={() => setShowLogin(false)}>
          ← Back
        </button>
        <LoginGate onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="role-select-page">
      {/* Background orbs */}
      <div className="role-orb orb-1" />
      <div className="role-orb orb-2" />

      <div className="role-content">
        <div className="role-brand">
          <div className="role-logo">C</div>
          <h1>ClinicFlow</h1>
          <p>Smart Queue Management System</p>
        </div>

        <h2 className="role-question">How can we help you today?</h2>

        <div className="role-cards">
          {/* Patient Card */}
          <button
            className="role-card patient-card"
            onClick={() => navigate('/patient')}
          >
            <div className="role-card-icon">🏥</div>
            <h3>I'm a Patient</h3>
            <p>Join the queue, check your position and wait time</p>
            <div className="role-card-arrow">→</div>
          </button>

          {/* Admin Card */}
          <button
            className="role-card admin-card"
            onClick={() => setShowLogin(true)}
          >
            <div className="role-card-icon">🖥️</div>
            <h3>I'm Staff / Admin</h3>
            <p>Manage the queue, call patients and view analytics</p>
            <div className="role-card-arrow">→</div>
          </button>
        </div>

        <p className="role-footer">
          ClinicFlow • Real-time Queue System
        </p>
      </div>
    </div>
  );
}
