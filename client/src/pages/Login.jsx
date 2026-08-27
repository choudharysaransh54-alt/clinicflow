import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login({ type = 'staff' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
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
        // Fallback for unknown staff roles
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="login-container" style={{ padding: '2rem', maxWidth: '400px', margin: 'auto' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginBottom: '1rem', padding: 0 }}>← Back</button>
      <h2>{type === 'doctor' ? 'Doctor Login' : 'Staff / Admin Login'}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '0.5rem' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '0.5rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          Login
        </button>
      </form>
    </div>
  );
}
