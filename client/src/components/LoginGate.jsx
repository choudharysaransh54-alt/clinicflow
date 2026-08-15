import { useState } from 'react';

export default function LoginGate({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple demo password gate
    if (username.toLowerCase() === 'admin' && password === 'admin123') {
      onLogin();
    } else {
      setError('Incorrect credentials. Try admin / admin123');
      setPassword('');
    }
  };

  return (
    <div className="login-gate-overlay">
      <div className="login-card">
        <div className="logo-icon large">C</div>
        <h2>Staff Login</h2>
        <p>Please enter the clinic dashboard password.</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-submit-btn">
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
