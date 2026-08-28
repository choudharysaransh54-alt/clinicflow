import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelect.css';

export default function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="role-select-page">
      <div className="role-content">
        <div className="role-brand">
          <div className="role-logo">C</div>
          <h1>ClinicFlow</h1>
          <p>Smart Queue Management System</p>
        </div>

        <h2 className="role-question">Welcome. How can we help you today?</h2>

        <div className="role-cards">
          {/* Patient Card */}
          <button
            className="role-card hover-lift"
            onClick={() => navigate('/patient')}
          >
            <div className="role-card-icon">🏥</div>
            <h3>I'm a Patient</h3>
            <p>Join the queue, check your position and wait time</p>
            <div className="role-card-arrow">→</div>
          </button>

          {/* Doctor Card */}
          <button
            className="role-card hover-lift doctor-card"
            onClick={() => navigate('/login/doctor')}
          >
            <div className="role-card-icon">🩺</div>
            <h3>I'm a Doctor</h3>
            <p>Access your queue, call patients and view history</p>
            <div className="role-card-arrow">→</div>
          </button>

          {/* Staff/Admin Card */}
          <button
            className="role-card hover-lift"
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
