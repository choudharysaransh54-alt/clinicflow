import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login({ type = 'staff' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      
      // Strict UI portal validation based on type
      if (type === 'doctor' && user.role !== 'doctor') {
        setError('Access Denied: Please use the Staff Login portal.');
        logout();
        return;
      }
      if (type === 'staff' && user.role === 'doctor') {
        setError('Access Denied: Please use the Doctor Login portal.');
        logout();
        return;
      }

      if (user.role === 'admin' || user.role === 'receptionist') {
        navigate('/admin');
      } else if (user.role === 'doctor') {
        navigate(`/doctor/${user.id}`);
      } else if (user.role === 'pharmacist') {
        navigate('/pharmacy');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <button onClick={() => navigate('/')} className="btn-outline" style={{ marginBottom: '2rem', alignSelf: 'flex-start', border: 'none', color: 'var(--text-light)' }}>
        ← Back
      </button>

      <div className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-dark)', fontWeight: '700' }}>
          {type === 'doctor' ? 'Doctor Portal' : 'Staff Portal'}
        </h2>
        <p style={{ color: 'var(--text-gray)', marginTop: '-1rem' }}>
          Please log in to continue
        </p>
        
        {error && <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
          
          {type === 'doctor' && (
            <div style={{ backgroundColor: 'var(--bg-accent)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-gray)' }}>
              <strong>Demo Doctor Accounts:</strong><br/>
              • doctor1@gmail.com (Dr. Sarah Jenkins)<br/>
              • doctor2@gmail.com (Dr. Marcus Thorne)<br/>
              • doctor3@gmail.com (Dr. Elena Rostova)<br/>
              • doctor4@gmail.com (Dr. James Chen)<br/>
              • doctor5@gmail.com (Dr. Aisha Patel)<br/>
              <em>Password for all: 123</em>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-dark)', fontWeight: '500' }}>Email Address</label>
            <input 
              type="email" 
              placeholder="you@clinic.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-dark)', fontWeight: '500' }}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
