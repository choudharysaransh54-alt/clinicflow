import { useState } from 'react';
import './IntakeForm.css';

export default function IntakeForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    reason: '',
    phone: '',
    age: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validation
    if (name === 'name' && !/^[A-Za-z\s]*$/.test(value)) return;
    if (name === 'age' && !/^\d*$/.test(value)) return;
    if (name === 'phone' && !/^\+?\d*$/.test(value)) return;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.age) return;
    
    onSubmit({
      ...formData,
      age: parseInt(formData.age, 10)
    });
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div className="form-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
        <h2>Patient Check-In</h2>
        <p>Please fill in your details to join the queue</p>
      </div>

      <div className="form-group">
        <label htmlFor="patient-name">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Full Name <span className="required">*</span>
        </label>
        <input
          id="patient-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter your full name"
          required
          autoComplete="name"
          maxLength={100}
        />
      </div>

      <div className="form-group">
        <label htmlFor="visit-reason">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Reason for Visit <span className="optional">(optional)</span>
        </label>
        <textarea
          id="visit-reason"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          placeholder="Briefly describe your reason for today's visit"
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="form-group">
        <label htmlFor="patient-age">
          Age <span className="required">*</span>
        </label>
        <input
          id="patient-age"
          type="number"
          name="age"
          value={formData.age}
          onChange={handleChange}
          placeholder="Enter your age"
          required
          min="0"
          max="120"
        />
      </div>

      <div className="form-group">
        <label htmlFor="patient-phone">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Phone Number <span className="required">*</span>
        </label>
        <input
          id="patient-phone"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Required for SMS notifications"
          required
          autoComplete="tel"
        />
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={isLoading || !formData.name.trim() || !formData.phone.trim() || !formData.age}
      >
        {isLoading ? (
          <span className="btn-loading">
            <span className="spinner"></span>
            Joining Queue...
          </span>
        ) : (
          <span className="btn-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Join Queue
          </span>
        )}
      </button>
    </form>
  );
}
