import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';
import QueueStatus from '../components/QueueStatus';
import IntakeForm from '../components/IntakeForm';
import '../styles/patient.css';
import '../styles/ai.css';

export default function PatientView() {
  const { ticketId: paramTicketId } = useParams();
  const navigate = useNavigate();
  const { isConnected, socket, on } = useSocket();
  const [ticketId, setTicketId] = useState(paramTicketId || sessionStorage.getItem('clinicflow_patient_ticket') || '');
  const [patientData, setPatientData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('status'); // 'status', 'join', or 'screen'
  
  // AI Screener State
  const [symptomInput, setSymptomInput] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchStatus = async (id) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/queue/status/${id}`);
      setPatientData(res.data.patient);
      sessionStorage.setItem('clinicflow_patient_ticket', id);
    } catch (err) {
      setError('Invalid Ticket ID or patient not found.');
      setPatientData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramTicketId) {
      fetchStatus(paramTicketId);
    } else if (ticketId && !patientData) {
      fetchStatus(ticketId);
    }
  }, [paramTicketId]);

  useEffect(() => {
    if (patientData && socket) {
      socket.emit('join:patient', patientData._id);
      
      const unsubStatus = on('patient:status_changed', (data) => {
        fetchStatus(ticketId); // Refetch full data on change
      });
      
      return () => {
        unsubStatus();
      };
    }
  }, [patientData, socket, on, ticketId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticketId) {
      let formatted = ticketId.trim().toUpperCase();
      if (/^\d{4}$/.test(formatted)) {
        formatted = `T-${formatted}`;
      }
      setTicketId(formatted);
      navigate(`/status/${formatted}`);
      fetchStatus(formatted);
    }
  };

  const handleJoin = async (formData) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/queue/register', formData);
      setPatientData(res.data.patient);
      const newTicketId = res.data.patient.ticketId;
      setTicketId(newTicketId);
      sessionStorage.setItem('clinicflow_patient_ticket', newTicketId);
      navigate(`/status/${newTicketId}`);
      setMode('status');
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to join queue');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave the queue? This cannot be undone.")) return;
    
    setLoading(true);
    try {
      await axios.post(`/api/queue/leave/${ticketId}`);
      sessionStorage.removeItem('clinicflow_patient_ticket');
      setPatientData(null);
      setTicketId('');
      setMode('status');
      if (paramTicketId) navigate('/patient');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to leave queue';
      setError(`Failed to leave queue: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScreenSymptoms = async () => {
    if (!symptomInput.trim()) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setError('');
    
    try {
      const res = await axios.post('/api/ai/screen', { symptoms: symptomInput });
      setAiAnalysis(res.data);
    } catch (err) {
      setError('AI Screening failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="patient-container">
      <header className="patient-header">
        <button className="patient-home-btn" onClick={() => navigate('/')}>← Home</button>
        <div className="logo"><span className="logo-icon">C</span> ClinicFlow</div>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="dot"></div>
          {isConnected ? 'Live' : 'Connecting...'}
        </div>
      </header>

      <main className="patient-main">
        {!patientData ? (
          <div className="status-container" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
              <button 
                onClick={() => {setMode('status'); setError('');}} 
                style={{ padding: '0.8rem 1.5rem', borderRadius: '20px', background: mode === 'status' ? 'var(--accent-primary)' : 'transparent', color: mode === 'status' ? 'white' : 'var(--text-primary)', border: '1px solid var(--accent-primary)', cursor: 'pointer' }}>
                Check Status
              </button>
              <button 
                onClick={() => {setMode('join'); setError('');}} 
                style={{ padding: '0.8rem 1.5rem', borderRadius: '20px', background: mode === 'join' ? 'var(--accent-primary)' : 'transparent', color: mode === 'join' ? 'white' : 'var(--text-primary)', border: '1px solid var(--accent-primary)', cursor: 'pointer' }}>
                Join Queue
              </button>
              <button 
                onClick={() => {setMode('screen'); setError('');}} 
                style={{ padding: '0.8rem 1.5rem', borderRadius: '20px', background: mode === 'screen' ? 'var(--accent-primary)' : 'transparent', color: mode === 'screen' ? 'white' : 'var(--text-primary)', border: '1px solid var(--accent-primary)', cursor: 'pointer' }}>
                ✨ Screen Symptoms
              </button>
            </div>
            
            {mode === 'status' ? (
              <>
                <h2>Check Your Queue Status</h2>
                <p>Enter the Ticket ID provided by the receptionist or SMS.</p>
                <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. T-1234"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    style={{ padding: '1rem', fontSize: '1.2rem', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)', width: '100%', maxWidth: '300px' }}
                    required
                  />
                  <button type="submit" className="call-next-btn pulse" style={{ width: '100%', maxWidth: '300px' }} disabled={loading}>
                    {loading ? 'Checking...' : 'Check Status'}
                  </button>
                </form>
              </>
            ) : mode === 'join' ? (
              <IntakeForm onSubmit={handleJoin} isLoading={loading} />
            ) : (
              <div className="ai-screener-container">
                <h2>✨ AI Symptom Checker</h2>
                <p>Describe what you're feeling, and our AI will provide an immediate assessment.</p>
                <textarea 
                  className="ai-textarea"
                  placeholder="e.g. I woke up with a severe headache and have a high fever..."
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                />
                
                {isAnalyzing ? (
                  <div className="ai-loader">
                    <div className="ai-dot"></div><div className="ai-dot"></div><div className="ai-dot"></div>
                  </div>
                ) : (
                  <button className="ai-analyze-btn" onClick={handleScreenSymptoms} disabled={!symptomInput.trim()}>
                    Analyze Symptoms
                  </button>
                )}

                {aiAnalysis && (
                  <div className={`ai-result-card urgency-${aiAnalysis.urgency.includes('High') ? 'high' : aiAnalysis.urgency.includes('Medium') ? 'medium' : 'normal'}`}>
                    <div className="urgency-badge">{aiAnalysis.urgency}</div>
                    
                    {aiAnalysis.urgency.includes('High') && (
                      <p style={{ color: '#fca5a5', fontWeight: 'bold' }}>⚠️ Please seek immediate medical attention or proceed to the ER.</p>
                    )}
                    
                    <div style={{ textAlign: 'left', marginTop: '1rem' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Possible Conditions:</p>
                      <div className="conditions-list">
                        {aiAnalysis.conditions.map((cond, i) => (
                          <span key={i} className="condition-tag">{cond}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'left', marginTop: '1rem' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Recommended Specialty:</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{aiAnalysis.specialty}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {error && <p style={{ color: '#ef4444', marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px' }}>{error}</p>}
          </div>
        ) : (
          <div className="status-container" style={{ position: 'relative' }}>
            <QueueStatus patient={patientData} queueData={null} />
            {!['completed', 'removed', 'with_doctor'].includes(patientData.status) && (
              <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  onClick={() => {
                    sessionStorage.removeItem('clinicflow_patient_ticket');
                    setPatientData(null);
                    setTicketId('');
                    setMode('join');
                    navigate('/patient');
                  }} 
                  style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  Add Another Patient
                </button>
                <button 
                  onClick={handleLeave} 
                  disabled={loading}
                  style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '0.6rem 1.2rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  {loading ? 'Processing...' : 'Leave Queue'}
                </button>
              </div>
            )}
            {['completed', 'removed'].includes(patientData.status) && (
              <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  onClick={() => {
                    sessionStorage.removeItem('clinicflow_patient_ticket');
                    setPatientData(null);
                    setTicketId('');
                    setMode('join');
                    navigate('/patient');
                  }} 
                  style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.3s', fontSize: '1rem', fontWeight: 'bold' }}
                >
                  Start New Visit
                </button>
                <button 
                  onClick={() => {
                    sessionStorage.removeItem('clinicflow_patient_ticket');
                    setPatientData(null);
                    setTicketId('');
                    setMode('status');
                    navigate('/patient');
                  }} 
                  style={{ background: 'transparent', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '0.8rem 1.5rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.3s', fontSize: '1rem', fontWeight: 'bold' }}
                >
                  Already in Queue?
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
