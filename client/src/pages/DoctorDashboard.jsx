import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

export default function DoctorDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [completedPatients, setCompletedPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [transferModal, setTransferModal] = useState({ open: false, patientId: null, toDoctorId: '', reason: '' });
  
  // EHR State
  const [consultModal, setConsultModal] = useState({ open: false, patient: null });
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [consultForm, setConsultForm] = useState({ symptoms: '', diagnosis: '', prescription: '', notes: '' });
  const [loadingEhr, setLoadingEhr] = useState(false);
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);

  const { socket } = useSocket();

  const fetchQueue = async () => {
    try {
      const response = await axios.get(`/api/queue/doctor/${id}`);
      setQueue(response.data.patients || []);
      setCompletedPatients(response.data.completedPatients || []);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await axios.get('/api/staff');
      setDoctors(response.data.staff.filter(d => d._id !== id && d.role === 'doctor'));
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchDoctors();
    
    if (socket) {
      socket.emit('join:doctor', id);
      socket.on('queue:doctor:updated', fetchQueue);
    }
    return () => {
      if (socket) socket.off('queue:doctor:updated', fetchQueue);
    };
  }, [socket, id]);

  const callPatient = async (patientId) => {
    try { await axios.post(`/api/queue/call/${patientId}`); } catch (e) { console.error(e); }
  };

  const sendToPharmacy = async (patientId) => {
    try { await axios.post(`/api/queue/pharmacy/${patientId}`); } catch (e) { console.error(e); }
  };

  const completePatient = async (patientId) => {
    try { 
      await axios.post(`/api/queue/complete/${patientId}`); 
      fetchQueue();
    } catch (e) { 
      console.error(e); 
    }
  };

  const clearPatient = async (patientId) => {
    try { 
      await axios.post(`/api/queue/clear/${patientId}`); 
      fetchQueue();
    } catch (e) { 
      console.error(e); 
    }
  };

  const transferPatient = async () => {
    try {
      await axios.post('/api/queue/transfer', {
        patientId: transferModal.patientId,
        toDoctorId: transferModal.toDoctorId,
        reason: transferModal.reason
      });
      setTransferModal({ open: false, patientId: null, toDoctorId: '', reason: '' });
    } catch (e) {
      console.error(e);
    }
  };

  // EHR Functions
  const openConsultation = async (patient) => {
    setConsultModal({ open: true, patient });
    // Pre-fill symptoms if patient provided them via AI screener
    setConsultForm({ symptoms: patient.reason || '', diagnosis: '', prescription: '', notes: '' });
    setLoadingEhr(true);
    setMedicalRecord(null);

    try {
      const res = await axios.get(`/api/records/${patient.phone}`);
      setMedicalRecord(res.data.record);
    } catch (e) {
      if (e.response?.status !== 404) {
        console.error('Failed to fetch medical record', e);
      }
    } finally {
      setLoadingEhr(false);
    }
  };

  const submitConsultation = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/records/${consultModal.patient.phone}/visit`, {
        patientName: consultModal.patient.name,
        ...consultForm
      });
      await completePatient(consultModal.patient._id);
      setConsultModal({ open: false, patient: null });
    } catch (err) {
      console.error('Failed to submit consultation:', err);
      alert('Failed to save consultation. Check console.');
    }
  };

  const handleGenerateSoap = async () => {
    if (!consultForm.symptoms || !consultForm.diagnosis || !consultForm.prescription) {
      alert('Please fill out Symptoms, Diagnosis, and Prescription first.');
      return;
    }
    
    setIsGeneratingSoap(true);
    try {
      const res = await axios.post('/api/ai/soap', {
        symptoms: consultForm.symptoms,
        diagnosis: consultForm.diagnosis,
        prescription: consultForm.prescription
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setConsultForm(prev => ({ ...prev, notes: res.data.soapNote }));
    } catch (err) {
      console.error('Failed to generate SOAP note:', err);
      alert('Failed to generate AI note.');
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>D</div>
          <h1>Doctor Workspace</h1>
          <span className={`status-badge ${socket?.connected ? 'live' : 'offline'}`}>
            {socket?.connected ? 'Live Sync' : 'Offline'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Welcome, Dr. {user?.name}</span>
          <button onClick={handleLogout} className="logout-btn" style={{background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.3s'}}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main" style={{ gridTemplateColumns: '1fr', maxWidth: '1000px', margin: '0 auto' }}>
        <section>
          <div className="queue-list-header">
            <h2>Your Patient Queue ({queue.length})</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {queue.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">☕</div>
                <p>Your queue is clear. Take a break!</p>
              </div>
            ) : (
              queue.map(patient => (
                <div key={patient._id} style={{ 
                  background: patient.status === 'with_doctor' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)', 
                  padding: '1.5rem', 
                  borderRadius: 'var(--radius-lg)', 
                  border: patient.status === 'with_doctor' ? '1px solid #10b981' : '1px solid var(--border-glass)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  boxShadow: patient.status === 'with_doctor' ? '0 0 20px rgba(16,185,129,0.1)' : 'var(--shadow-glass)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>{patient.name}</h3>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ticket: {patient.ticketId}</span>
                      {patient.status === 'with_doctor' && (
                        <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>IN CONSULTATION</span>
                      )}
                    </div>
                    {patient.reason && (
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        <strong>Reported Symptoms:</strong> {patient.reason}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {patient.status === 'waiting_doctor' && (
                      <button onClick={() => callPatient(patient._id)} className="call-next-btn pulse" style={{ padding: '0.8rem 2rem', fontSize: '1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        Call Patient Next
                      </button>
                    )}
                    
                    {patient.status === 'with_doctor' && (
                      <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button 
                          onClick={() => openConsultation(patient)} 
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <span style={{ fontSize: '1.2rem' }}>📝</span> Open EHR / Consult
                        </button>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <button onClick={() => setTransferModal({ open: true, patientId: patient._id, toDoctorId: '', reason: '' })} style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}>Transfer</button>
                          <button onClick={() => clearPatient(patient._id)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Clear ✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Treated Patients Section */}
        {completedPatients.length > 0 && (
          (() => {
            const groupedCompleted = Object.values(completedPatients.reduce((acc, p) => {
              if (!acc[p.phone]) {
                acc[p.phone] = {
                  phone: p.phone,
                  names: [p.name],
                  tickets: [p.ticketId],
                  completedAt: p.completedAt,
                  patient: p // keep reference to open consultation
                };
              } else {
                if (!acc[p.phone].names.includes(p.name)) acc[p.phone].names.push(p.name);
                acc[p.phone].tickets.push(p.ticketId);
              }
              return acc;
            }, {})).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

            return (
              <section style={{ marginTop: '3rem' }}>
                <div className="queue-list-header">
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Consulted Patients ({groupedCompleted.length} Records)</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', opacity: 0.8 }}>
                  {groupedCompleted.map(group => (
                    <div key={group.phone} style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      padding: '1rem 1.5rem', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px dashed rgba(255,255,255,0.1)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center'
                    }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>{group.names.join(' & ')}</h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          📞 {group.phone} • Tickets: {group.tickets.join(', ')} • Last Treated: {new Date(group.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button 
                          onClick={() => openConsultation(group.patient)}
                          style={{ background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', padding: '0.4rem 1rem', borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          View Shared Record
                        </button>
                        <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>COMPLETED</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()
        )}
      </main>

      {/* EHR Consultation Modal */}
      {consultModal.open && consultModal.patient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', padding: '2.5rem', borderRadius: 'var(--radius-xl)', minWidth: '900px', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Consultation: {consultModal.patient.name}</h3>
              <button onClick={() => setConsultModal({ open: false, patient: null })} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: consultModal.patient.status === 'completed' ? '1fr' : '350px 1fr', gap: '2.5rem' }}>
              {/* Left Column: Medical History */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📖 Medical History</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                    📞 {consultModal.patient.phone}
                  </span>
                </div>
                {loadingEhr ? <p style={{ color: 'var(--text-muted)' }}>Loading history...</p> : (
                  medicalRecord ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Blood Group</div>
                          <div style={{ color: 'white', fontWeight: 'bold' }}>{medicalRecord.bloodGroup}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Allergies</div>
                          <div style={{ color: 'white', fontWeight: 'bold' }}>{medicalRecord.allergies.join(', ') || 'None'}</div>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Chronic Conditions</div>
                        <div style={{ color: 'white' }}>{medicalRecord.chronicConditions.join(', ') || 'None'}</div>
                      </div>

                      <h5 style={{ margin: '1.5rem 0 1rem 0', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Past Visits ({medicalRecord.visits.length})</h5>
                      <ul style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {medicalRecord.visits.slice().reverse().map((v, i) => (
                          <li key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-secondary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <strong style={{ color: 'white' }}>{new Date(v.visitDate).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - {v.patientName || medicalRecord.patientName}</strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dr. {v.doctorName}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Reason:</span> {v.symptoms || 'Not specified'}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Diag:</span> {v.diagnosis}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Rx:</span> {v.prescription}
                            </div>
                            {v.notes && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.8rem', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                {v.notes}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
                      <p>First visit. No medical record found.</p>
                    </div>
                  )
                )}
              </div>

              {/* Right Column: New Consultation Form (Hide if completed) */}
              {consultModal.patient.status !== 'completed' && (
                <div>
                <h4 style={{ margin: '0 0 1.5rem 0', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🩺 Current Encounter</h4>
                <form onSubmit={submitConsultation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Highlight AI integration point */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(109, 40, 217, 0.05))', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px dashed rgba(139, 92, 246, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h5 style={{ margin: 0, color: '#c4b5fd', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ✨ AI SOAP Note Generator
                      </h5>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', padding: '0.2rem 0.6rem', borderRadius: '10px' }}>Powered by Groq</span>
                    </div>
                    
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      Quickly jot down the patient's symptoms, your diagnosis, and prescription below. Then click generate to have the AI write a fully formatted professional SOAP medical note.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Symptoms (Subjective)</label>
                        <textarea 
                          value={consultForm.symptoms} 
                          onChange={e => setConsultForm({...consultForm, symptoms: e.target.value})} 
                          style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white', outline: 'none', resize: 'vertical' }} 
                          rows={2}
                          placeholder="e.g., patient complains of severe headache for 3 days..."
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Diagnosis (Assessment)</label>
                        <input 
                          type="text" 
                          value={consultForm.diagnosis} 
                          onChange={e => setConsultForm({...consultForm, diagnosis: e.target.value})} 
                          style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white', outline: 'none' }} 
                          placeholder="e.g., Acute Migraine"
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Prescription (Plan)</label>
                        <textarea 
                          value={consultForm.prescription} 
                          onChange={e => setConsultForm({...consultForm, prescription: e.target.value})} 
                          style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white', outline: 'none', resize: 'vertical' }} 
                          rows={2}
                          placeholder="e.g., Sumatriptan 50mg PRN, rest in dark room"
                        />
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={handleGenerateSoap}
                        disabled={isGeneratingSoap || !consultForm.symptoms || !consultForm.diagnosis || !consultForm.prescription}
                        style={{
                          marginTop: '0.5rem',
                          padding: '1rem',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                          transition: 'all 0.3s ease',
                          opacity: (isGeneratingSoap || !consultForm.symptoms || !consultForm.diagnosis || !consultForm.prescription) ? 0.6 : 1
                        }}
                      >
                        {isGeneratingSoap ? (
                          <><span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> AI is writing SOAP note...</>
                        ) : (
                          <>✨ Generate Professional SOAP Note</>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Final EHR Note</label>
                    <textarea 
                      value={consultForm.notes} 
                      onChange={e => setConsultForm({...consultForm, notes: e.target.value})} 
                      style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white', outline: 'none', minHeight: '200px', fontFamily: 'monospace', lineHeight: 1.6 }} 
                      placeholder="Your AI-generated SOAP note will appear here. You can manually edit it before saving."
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setConsultModal({ open: false, patient: null })} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', padding: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                    <button type="submit" style={{ flex: 2, background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '1rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>💾 Save Record & Complete Patient</button>
                  </div>
                </form>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', minWidth: '400px' }}>
            <h3 style={{ color: 'white', marginTop: 0 }}>Transfer Patient</h3>
            <select 
              value={transferModal.toDoctorId} 
              onChange={e => setTransferModal(prev => ({ ...prev, toDoctorId: e.target.value }))}
              style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: 'white', borderRadius: '8px', outline: 'none' }}
            >
              <option value="" disabled>Select Doctor</option>
              {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name} ({d.specialty})</option>)}
            </select>
            <input 
              type="text" 
              placeholder="Reason for transfer..." 
              value={transferModal.reason}
              onChange={e => setTransferModal(prev => ({ ...prev, reason: e.target.value }))}
              style={{ width: '100%', marginBottom: '1.5rem', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: 'white', borderRadius: '8px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setTransferModal({ open: false, patientId: null, toDoctorId: '', reason: '' })} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={transferPatient} disabled={!transferModal.toDoctorId} style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', opacity: transferModal.toDoctorId ? 1 : 0.5 }}>Confirm Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
