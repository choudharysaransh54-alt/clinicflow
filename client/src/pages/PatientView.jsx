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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: 'white', borderBottom: '1px solid var(--border-light)' }}>
        <button className="btn-outline" onClick={() => navigate('/')} style={{ border: 'none', padding: '0.5rem 1rem' }}>← Home</button>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--border-radius-full)' }}>C</div>
          ClinicFlow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-gray)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isConnected ? 'var(--status-called)' : 'var(--status-removed)' }}></span>
          {isConnected ? 'Live' : 'Connecting...'}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1rem' }}>
        {!patientData ? (
          <div className="card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
              <button 
                onClick={() => {setMode('status'); setError('');}} 
                className={mode === 'status' ? 'btn-primary' : 'btn-outline'}
              >
                Check Status
              </button>
              <button 
                onClick={() => {setMode('join'); setError('');}} 
                className={mode === 'join' ? 'btn-primary' : 'btn-outline'}
              >
                Join Queue
              </button>
              <button 
                onClick={() => {setMode('screen'); setError('');}} 
                className={mode === 'screen' ? 'btn-primary' : 'btn-outline'}
              >
                ✨ Screen Symptoms
              </button>
            </div>
            
            {mode === 'status' ? (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Check Your Queue Status</h2>
                <p style={{ color: 'var(--text-gray)' }}>Enter the Ticket ID provided by the receptionist or SMS.</p>
                <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. T-1234"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    style={{ padding: '1rem', fontSize: '1.25rem', textAlign: 'center', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', width: '100%', maxWidth: '300px', outline: 'none' }}
                    required
                  />
                  <button type="submit" className="btn-primary" style={{ width: '100%', maxWidth: '300px' }} disabled={loading}>
                    {loading ? 'Checking...' : 'Check Status'}
                  </button>
                </form>
              </>
            ) : mode === 'join' ? (
              <IntakeForm onSubmit={handleJoin} isLoading={loading} />
            ) : (
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>✨ AI Symptom Checker</h2>
                <p style={{ color: 'var(--text-gray)', textAlign: 'center', marginBottom: '1.5rem' }}>Describe what you're feeling, and our AI will provide an immediate assessment.</p>
                <textarea 
                  placeholder="e.g. I woke up with a severe headache and have a high fever..."
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  style={{ width: '100%', minHeight: '120px', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none', resize: 'vertical', marginBottom: '1rem' }}
                />
                
                {isAnalyzing ? (
                  <div style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 500 }}>Thinking...</div>
                ) : (
                  <button className="btn-primary" style={{ width: '100%' }} onClick={handleScreenSymptoms} disabled={!symptomInput.trim()}>
                    Analyze Symptoms
                  </button>
                )}

                {aiAnalysis && (
                  <div className="card" style={{ marginTop: '1.5rem', borderLeft: `4px solid ${aiAnalysis.urgency.includes('High') ? '#EF4444' : aiAnalysis.urgency.includes('Medium') ? '#F59E0B' : '#10B981'}` }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem', color: aiAnalysis.urgency.includes('High') ? '#EF4444' : aiAnalysis.urgency.includes('Medium') ? '#F59E0B' : '#10B981' }}>{aiAnalysis.urgency}</div>
                    
                    {aiAnalysis.urgency.includes('High') && (
                      <p style={{ color: '#EF4444', fontWeight: 600, marginBottom: '1rem' }}>⚠️ Please seek immediate medical attention or proceed to the ER.</p>
                    )}
                    
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ color: 'var(--text-gray)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Possible Conditions:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {aiAnalysis.conditions.map((cond, i) => (
                          <span key={i} style={{ backgroundColor: 'var(--bg-accent)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--border-radius-full)', fontSize: '0.875rem', fontWeight: 500 }}>{cond}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ color: 'var(--text-gray)', fontSize: '0.875rem' }}>Recommended Specialty:</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>{aiAnalysis.specialty}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {error && <p style={{ color: '#B91C1C', marginTop: '1.5rem', backgroundColor: '#FEE2E2', padding: '1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem' }}>{error}</p>}
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
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
                  className="btn-primary"
                >
                  Add Another Patient
                </button>
                <button 
                  onClick={handleLeave} 
                  disabled={loading}
                  className="btn-outline"
                  style={{ borderColor: '#EF4444', color: '#EF4444' }}
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
                  className="btn-primary"
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
                  className="btn-outline"
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
