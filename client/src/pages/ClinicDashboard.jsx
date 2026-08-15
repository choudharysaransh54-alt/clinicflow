import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import PatientCard from '../components/PatientCard';
import QRGenerator from '../components/QRGenerator';
import '../styles/dashboard.css';

export default function ClinicDashboard() {
  const { isConnected, emit, on } = useSocket();
  const [queue, setQueue] = useState({ standard: [], senior: [], called: null, stats: null });
  const [isCalling, setIsCalling] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('clinicflow_auth') === 'true';
  });

  useEffect(() => {
    if (isConnected) {
      emit('queue:get')
        .then(res => {
          if (res.success) setQueue(res.queue);
        })
        .catch(console.error);
    }
  }, [isConnected, emit]);

  useEffect(() => {
    const unsub = on('queue:updated', (newQueue) => {
      setQueue(newQueue);
    });
    return unsub;
  }, [on]);

  const handleCallNext = async (queueType) => {
    if (isCalling) return;
    setIsCalling(true);
    try {
      await emit('queue:callNext', { queueType });
    } catch (err) {
      console.error('Failed to call next:', err);
    } finally {
      setIsCalling(false);
    }
  };

  const handleComplete = async (ticketId) => {
    try {
      await emit('patient:complete', { ticketId });
    } catch (err) {
      console.error('Failed to complete:', err);
    }
  };

  const handleRemove = async (ticketId) => {
    if (!window.confirm('Are you sure you want to remove this patient?')) return;
    try {
      await emit('patient:remove', { ticketId });
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  const checkInUrl = `${window.location.origin}/patient`;

  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('clinicflow_auth');
    navigate('/');
  };

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="logo-icon">C</div>
          <h1>ClinicFlow Dashboard</h1>
          <span className={`status-badge ${isConnected ? 'live' : 'offline'}`}>
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {queue.stats && (
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-value">{queue.stats.waitingCount}</span>
                <span className="stat-label">Waiting</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{queue.stats.servedToday}</span>
                <span className="stat-label">Served Today</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{queue.stats.avgWaitMinutes}m</span>
                <span className="stat-label">Avg Wait</span>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="logout-btn" style={{background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.9rem'}}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-left">
          <section className="current-patient-section">
            <h2>Currently Calling</h2>
            {queue.called ? (
              <div className="called-card-wrapper">
                 <PatientCard 
                    patient={queue.called} 
                    onComplete={handleComplete}
                 />
              </div>
            ) : (
              <div className="empty-state called-empty">
                <div className="empty-icon">👋</div>
                <p>No patient is currently at the counter</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  {queue.senior?.length > 0 && (
                    <button 
                      className="call-next-btn pulse"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4)' }}
                      onClick={() => handleCallNext('senior')}
                      disabled={isCalling}
                    >
                      Call Senior
                    </button>
                  )}
                  {queue.standard?.length > 0 && (
                    <button 
                      className="call-next-btn pulse"
                      onClick={() => handleCallNext('standard')}
                      disabled={isCalling}
                    >
                      Call Standard
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="dashboard-actions">
             <QRGenerator url={checkInUrl} />
          </section>
        </div>

        <div className="dashboard-right">
          <div className="queue-list-header">
            <h2>Senior Citizens (65+)</h2>
            {queue.senior?.length > 0 && (
              <button 
                className="call-next-btn small pulse"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)' }}
                onClick={() => handleCallNext('senior')}
                disabled={isCalling || !!queue.called}
              >
                Call Senior
              </button>
            )}
          </div>

          <div className="queue-list" style={{ marginBottom: '3rem' }}>
            {(!queue.senior || queue.senior.length === 0) ? (
              <div className="empty-state">
                <p>No seniors waiting</p>
              </div>
            ) : (
              queue.senior.map((patient, index) => (
                <PatientCard 
                  key={patient.ticketId}
                  patient={patient}
                  isNext={index === 0 && !queue.called}
                  onRemove={handleRemove}
                />
              ))
            )}
          </div>

          <div className="queue-list-header">
            <h2>Standard Patients</h2>
            {queue.standard?.length > 0 && (
              <button 
                className="call-next-btn small pulse"
                onClick={() => handleCallNext('standard')}
                disabled={isCalling || !!queue.called}
              >
                Call Standard
              </button>
            )}
          </div>

          <div className="queue-list">
            {(!queue.standard || queue.standard.length === 0) ? (
              <div className="empty-state">
                <p>No standard patients waiting</p>
              </div>
            ) : (
              queue.standard.map((patient, index) => (
                <PatientCard 
                  key={patient.ticketId}
                  patient={patient}
                  isNext={index === 0 && !queue.called && queue.senior?.length === 0}
                  onRemove={handleRemove}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
