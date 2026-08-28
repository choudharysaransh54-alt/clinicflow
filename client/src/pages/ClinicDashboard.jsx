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
  const [formData, setFormData] = useState({ name: '', age: '', phone: '', reason: '' });
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
      setFormData({ name: '', age: '', phone: '', reason: '' });
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
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)' }}>Admin Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: socket?.connected ? 'var(--status-called)' : 'var(--status-removed)'
            }}></span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-gray)' }}>
              {socket?.connected ? 'Live Sync Active' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Register New Patient</h2>
            <div className="card">
              {error && <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
              {success && <div style={{ padding: '0.75rem', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}
              
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Age</label>
                    <input 
                      type="number" 
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Phone Number</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Symptoms (Reason for visit)</label>
                  <input 
                    type="text" 
                    value={formData.reason}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                    placeholder="E.g., headache, fever, chest pain (Optional)"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                  Register to Queue
                </button>
              </form>
            </div>
          </section>

          <section style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Unassigned Patients ({generalQueue.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {generalQueue.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                  No unassigned patients waiting
                </div>
              ) : (
                generalQueue.map(patient => (
                  <div key={patient._id} className="card hover-lift" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{patient.name}</h4>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-gray)' }}>Ticket: {patient.ticketId}</span>
                      {patient.reason && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-gray)', marginTop: '0.25rem' }}>
                          <span style={{ fontWeight: 500 }}>Reason:</span> {patient.reason}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleAiSuggest(patient)}
                        disabled={isAiLoading[patient._id]}
                        className="btn-outline"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                      >
                        {isAiLoading[patient._id] ? 'Thinking...' : '✨ AI Suggest'}
                      </button>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select 
                          onChange={(e) => setSelectedDoctors(prev => ({ ...prev, [patient._id]: e.target.value }))}
                          value={selectedDoctors[patient._id] || ""}
                          style={{ 
                            padding: '0.6rem', 
                            borderRadius: 'var(--border-radius-sm)', 
                            border: `1px solid ${aiRecommendations[patient._id] ? 'var(--primary)' : 'var(--border-light)'}`,
                            backgroundColor: aiRecommendations[patient._id] ? 'var(--bg-accent)' : 'white',
                            outline: 'none',
                            fontSize: '0.875rem'
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
                          className="btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', opacity: selectedDoctors[patient._id] ? 1 : 0.5 }}
                        >
                          Assign
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => clearPatient(patient._id)}
                        style={{ background: 'none', border: 'none', color: 'var(--status-removed)', fontSize: '1.25rem', cursor: 'pointer', marginLeft: '0.5rem' }}
                        title="Remove patient"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Live Doctor Queues</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {load.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                No doctors currently available
              </div>
            ) : (
              load.map(item => (
                <div key={item.doctor.id} className="card hover-lift" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--border-radius-full)', backgroundColor: 'var(--bg-accent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 }}>
                      {item.doctor.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>Dr. {item.doctor.name}</h3>
                      <p style={{ margin: 0, color: 'var(--text-gray)', fontSize: '0.875rem' }}>{item.doctor.specialty}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {item.isAvailable ? (
                      <>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>{item.queueLength}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.05em', marginTop: '0.25rem' }}>Waiting</div>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: 'var(--status-removed)', fontWeight: 500, padding: '0.25rem 0.75rem', backgroundColor: '#FEE2E2', borderRadius: 'var(--border-radius-full)' }}>Offline</span>
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
