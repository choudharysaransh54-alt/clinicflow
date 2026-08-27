import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelect.css';

export default function RoleSelect() {
  const navigate = useNavigate();

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

          {/* Doctor Card */}
          <button
            className="role-card admin-card"
            style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.05))', borderColor: 'rgba(56, 189, 248, 0.3)' }}
            onClick={() => navigate('/login/doctor')}
          >
            <div className="role-card-icon" style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)' }}>🩺</div>
            <h3>I'm a Doctor</h3>
            <p>Access your queue, call patients and view history</p>
            <div className="role-card-arrow" style={{ color: '#38bdf8' }}>→</div>
          </button>

          {/* Staff/Admin Card */}
          <button
            className="role-card admin-card"
            onClick={() => navigate('/login/staff')}
          >
            <div className="role-card-icon">🖥️</div>
            <h3>I'm Staff / Admin</h3>
            <p>Manage the clinic, add staff, and view analytics</p>
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
