import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

export default function ClinicDashboard() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [load, setLoad] = useState([]);
  const [generalQueue, setGeneralQueue] = useState([]);
  const [formData, setFormData] = useState({ name: '', age: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState({});
  const [selectedDoctors, setSelectedDoctors] = useState({});
  const [isAiLoading, setIsAiLoading] = useState({});
  const navigate = useNavigate();

  const fetchLoad = async () => {
    try {
      const [loadRes, generalRes] = await Promise.all([
        axios.get('/api/queue/load'),
        axios.get('/api/queue/general')
      ]);
      setLoad(loadRes.data.load);
      setGeneralQueue(generalRes.data.patients || []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchLoad();
    
    // Admin room for global updates
    if (socket) {
      socket.emit('join:admin');
      socket.on('queue:admin:updated', fetchLoad);
    }
    
    return () => {
      if (socket) socket.off('queue:admin:updated', fetchLoad);
    };
  }, [socket]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await axios.post('/api/queue/register', formData);
      setSuccess(`Patient ${response.data.patient.name} registered with Ticket ${response.data.patient.ticketId}`);
      setFormData({ name: '', age: '', phone: '' });
      fetchLoad(); // Update load after registering
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || err.response?.data?.error || 'Failed to register patient');
    }
  };

  const handleAssign = async (patientId, doctorId) => {
    if (!doctorId) return;
    try {
      await axios.post('/api/queue/assign', { patientId, doctorId });
      // Clear AI recommendation for this patient after assigning
      setAiRecommendations(prev => {
        const next = { ...prev };
        delete next[patientId];
        return next;
      });
      fetchLoad(); // Refresh queues
    } catch (err) {
      console.error('Failed to assign patient', err);
    }
  };

  const clearPatient = async (patientId) => {
    if (!window.confirm("Are you sure you want to remove this patient from the queue?")) return;
    try {
      await axios.post(`/api/queue/clear/${patientId}`);
      fetchLoad(); // Refresh queues
    } catch (err) {
      console.error('Failed to clear patient', err);
      setError('Failed to clear patient: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAiSuggest = async (patient) => {
    if (!patient.reason) {
      setError(`Cannot suggest doctor: Patient ${patient.name} did not provide symptoms.`);
      return;
    }
    
    setIsAiLoading(prev => ({ ...prev, [patient._id]: true }));
    setError('');
    
    try {
      const onlineDoctors = load.map(item => item.doctor);
      const res = await axios.post('/api/ai/recommend-doctor', {
        symptoms: patient.reason,
        onlineDoctors
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } // Fallback in case interceptor isn't there
      });
      
      const recommendedDoctorId = res.data.recommendedDoctorId;
      if (recommendedDoctorId) {
        setAiRecommendations(prev => ({ ...prev, [patient._id]: recommendedDoctorId }));
        setSelectedDoctors(prev => ({ ...prev, [patient._id]: recommendedDoctorId }));
      } else {
        setError('AI could not recommend a doctor based on these symptoms.');
      }
    } catch (err) {
      console.error('AI Recommendation failed:', err);
      setError('AI Suggestion failed. ' + (err.response?.data?.error || err.message));
    } finally {
      setIsAiLoading(prev => ({ ...prev, [patient._id]: false }));
    }
  };



  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="logo-icon">C</div>
          <h1>ClinicFlow Admin</h1>
          <span className={`status-badge ${socket?.connected ? 'live' : 'offline'}`}>
            {socket?.connected ? 'Live Sync' : 'Offline'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Welcome, {user?.name}</span>
          <button onClick={() => navigate('/admin/staff')} style={{ padding: '0.6rem 1.2rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Manage Staff & Shifts</button>
          <button onClick={logout} className="logout-btn" style={{background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.3s'}}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="dashboard-left">
          <section className="current-patient-section">
            <h2>Register New Patient</h2>
            <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', boxShadow: 'var(--shadow-glass)' }}>
              {error && <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>{error}</div>}
              {success && <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>{success}</div>}
              
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                    style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Age</label>
                    <input 
                      type="number" 
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                      required
                      style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 2 }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Phone Number</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      required
                      style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
                    />
                  </div>
                </div>
                <button type="submit" className="call-next-btn pulse" style={{ marginTop: '1rem', width: '100%' }}>
                  Register Patient to Queue
                </button>
              </form>
            </div>
          </section>

          <section style={{ marginTop: '2rem' }}>
            <h2>Unassigned Patients ({generalQueue.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {generalQueue.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <p>No unassigned patients waiting</p>
                </div>
              ) : (
                generalQueue.map(patient => (
                  <div key={patient._id} style={{ position: 'relative', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                      onClick={() => clearPatient(patient._id)}
                      style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem', opacity: 0.6, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = 'transparent'; }}
                      title="Remove patient from queue"
                    >
                      ✕
                    </button>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{patient.name}</h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ticket: {patient.ticketId}</span>
                      {patient.reason && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <strong>Reason:</strong> {patient.reason}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {patient.reason && (
                        <button 
                          onClick={() => handleAiSuggest(patient)}
                          disabled={isAiLoading[patient._id]}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(109, 40, 217, 0.2))',
                            color: '#c4b5fd',
                            border: '1px solid rgba(139, 92, 246, 0.5)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {isAiLoading[patient._id] ? (
                            <span style={{ animation: 'pulse 1.5s infinite' }}>Thinking...</span>
                          ) : (
                            <>✨ AI Suggest</>
                          )}
                        </button>
                      )}
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select 
                          onChange={(e) => setSelectedDoctors(prev => ({ ...prev, [patient._id]: e.target.value }))}
                          value={selectedDoctors[patient._id] || ""}
                          style={{ 
                            padding: '0.6rem', 
                            borderRadius: '6px', 
                            background: aiRecommendations[patient._id] ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0,0,0,0.3)', 
                            color: 'var(--text-primary)', 
                            border: `1px solid ${aiRecommendations[patient._id] ? '#8b5cf6' : 'var(--border-glass)'}`, 
                            outline: 'none',
                            boxShadow: aiRecommendations[patient._id] ? '0 0 10px rgba(139, 92, 246, 0.3)' : 'none',
                            transition: 'all 0.3s ease',
                            minWidth: '180px'
                          }}
                        >
                          <option value="" disabled>
                            {aiRecommendations[patient._id] ? '✨ AI Recommended 👇' : 'Select Doctor...'}
                          </option>
                          {load.map(item => (
                            <option key={item.doctor.id} value={item.doctor.id}>
                              Dr. {item.doctor.name} ({item.queueLength} waiting) {aiRecommendations[patient._id] === item.doctor.id ? '⭐' : ''}
                            </option>
                          ))}
                        </select>
                        <button 
                          onClick={() => handleAssign(patient._id, selectedDoctors[patient._id])}
                          disabled={!selectedDoctors[patient._id]}
                          style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '6px',
                            background: selectedDoctors[patient._id] ? '#10b981' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: 'none',
                            cursor: selectedDoctors[patient._id] ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold',
                            opacity: selectedDoctors[patient._id] ? 1 : 0.5,
                            transition: 'all 0.3s'
                          }}
                        >
                          Assign ➔
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="dashboard-right">
          <div className="queue-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Live Doctor Queues</h2>
          </div>

          <div className="queue-list" style={{ gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {load.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏥</div>
                <p>No doctors currently available</p>
              </div>
            ) : (
              load.map(item => (
                <div key={item.doctor.id} style={{ background: 'var(--bg-card)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-glass)', transition: 'transform 0.3s ease', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 15px var(--accent-glow)' }}>
                      {item.doctor.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{item.doctor.name}</h3>
                      <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.doctor.specialty}</p>
                    </div>
                  </div>
                  <div>
                    {item.isAvailable ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-success)', lineHeight: 1, textShadow: '0 0 10px rgba(16,185,129,0.3)' }}>{item.queueLength}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waiting</span>
                      </div>
                    ) : (
                      <span className="status-badge offline">Unavailable</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
