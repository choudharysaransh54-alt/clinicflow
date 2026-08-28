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
    if (user && user.role === 'doctor' && user.id !== id) {
      navigate(`/doctor/${user.id}`, { replace: true });
      return;
    }

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
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--border-radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem' }}>D</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>Doctor Workspace</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', paddingLeft: '3.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: socket?.connected ? 'var(--status-called)' : 'var(--status-removed)' }}></span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-gray)' }}>
              {socket?.connected ? 'Live Sync Active' : 'Offline'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Welcome, Dr. {user?.name}</span>
          <button onClick={handleLogout} className="btn-outline" style={{ borderColor: 'var(--status-removed)', color: 'var(--status-removed)' }}>Logout</button>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <section id="queue">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>Your Patient Queue ({queue.length})</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {queue.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-gray)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>☕</div>
                <p style={{ fontSize: '1.1rem' }}>Your queue is clear. Take a break!</p>
              </div>
            ) : (
              queue.map(patient => (
                <div key={patient._id} className="card hover-lift" style={{ 
                  borderLeft: patient.status === 'with_doctor' ? '4px solid var(--status-called)' : 'none',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-dark)' }}>{patient.name}</h3>
                      <span style={{ backgroundColor: 'var(--bg-color)', padding: '0.25rem 0.75rem', borderRadius: 'var(--border-radius-full)', fontSize: '0.875rem', color: 'var(--text-gray)' }}>Ticket: {patient.ticketId}</span>
                      {patient.status === 'with_doctor' && (
                        <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '0.25rem 0.75rem', borderRadius: 'var(--border-radius-full)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>IN CONSULTATION</span>
                      )}
                    </div>
                    {patient.reason && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-gray)', marginTop: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>Reported Symptoms:</span> {patient.reason}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {patient.status === 'waiting_doctor' && (
                      <button onClick={() => callPatient(patient._id)} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                        Call Next
                      </button>
                    )}
                    
                    {patient.status === 'with_doctor' && (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => openConsultation(patient)} 
                          className="btn-primary"
                          style={{ backgroundColor: 'var(--status-called)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <span>📝</span> Open EHR
                        </button>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <button onClick={() => setTransferModal({ open: true, patientId: patient._id, toDoctorId: '', reason: '' })} className="btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Transfer</button>
                          <button onClick={() => clearPatient(patient._id)} className="btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--status-removed)', color: 'var(--status-removed)' }}>Clear ✕</button>
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
        <section id="past">
          {completedPatients.length === 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-gray)' }}>Consulted Patients (0 Records)</h2>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-gray)', opacity: 0.7 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📁</div>
                <p>No patients have been consulted yet.</p>
              </div>
            </>
          ) : (
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
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-gray)' }}>Consulted Patients ({groupedCompleted.length} Records)</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {groupedCompleted.map(group => (
                      <div key={group.phone} className="card" style={{ 
                        padding: '1.5rem',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        opacity: 0.8
                      }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>{group.names.join(' & ')}</h3>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-gray)', marginTop: '0.5rem' }}>
                            📞 {group.phone} • Tickets: {group.tickets.join(', ')} • Last Treated: {new Date(group.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <button 
                            onClick={() => openConsultation(group.patient)}
                            className="btn-outline"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                          >
                            View Record
                          </button>
                          <span style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-gray)', padding: '0.25rem 0.75rem', borderRadius: 'var(--border-radius-full)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>COMPLETED</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()
          )}
        </section>
      </main>

      {/* EHR Consultation Modal */}
      {consultModal.open && consultModal.patient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="card" style={{ padding: '2.5rem', borderRadius: 'var(--border-radius-lg)', minWidth: '900px', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>Consultation: {consultModal.patient.name}</h3>
              <button onClick={() => setConsultModal({ open: false, patient: null })} style={{ background: 'var(--bg-color)', border: 'none', color: 'var(--text-gray)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: consultModal.patient.status === 'completed' ? '1fr' : '350px 1fr', gap: '2.5rem' }}>
              {/* Left Column: Medical History */}
              <div style={{ backgroundColor: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>📖 Medical History</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-gray)', backgroundColor: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                    📞 {consultModal.patient.phone}
                  </span>
                </div>
                {loadingEhr ? <p style={{ color: 'var(--text-gray)' }}>Loading history...</p> : (
                  medicalRecord ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Blood Group</div>
                          <div style={{ color: 'var(--text-dark)', fontWeight: 'bold' }}>{medicalRecord.bloodGroup}</div>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Allergies</div>
                          <div style={{ color: 'var(--text-dark)', fontWeight: 'bold' }}>{medicalRecord.allergies.join(', ') || 'None'}</div>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-gray)', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 600 }}>Chronic Conditions</div>
                        <div style={{ color: 'var(--text-dark)' }}>{medicalRecord.chronicConditions.join(', ') || 'None'}</div>
                      </div>

                      <h5 style={{ margin: '1.5rem 0 1rem 0', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', fontWeight: 600 }}>Past Visits ({medicalRecord.visits.length})</h5>
                      <ul style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {medicalRecord.visits.slice().reverse().map((v, i) => (
                          <li key={i} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)', borderRight: '1px solid var(--border-light)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <strong style={{ color: 'var(--text-dark)' }}>{new Date(v.visitDate).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - {v.patientName || medicalRecord.patientName}</strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>Dr. {v.doctorName}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-gray)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Reason:</span> {v.symptoms || 'Not specified'}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-gray)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Diag:</span> {v.diagnosis}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-gray)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Rx:</span> {v.prescription}
                            </div>
                            {v.notes && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-gray)', marginTop: '0.8rem', padding: '0.8rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                {v.notes}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-gray)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
                      <p>First visit. No medical record found.</p>
                    </div>
                  )
                )}
              </div>

              {/* Right Column: New Consultation Form (Hide if completed) */}
              {consultModal.patient.status !== 'completed' && (
                <div>
                <h4 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>🩺 Current Encounter</h4>
                <form onSubmit={submitConsultation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Highlight AI integration point */}
                  <div style={{ backgroundColor: 'var(--bg-accent)', padding: '1.5rem', borderRadius: 'var(--border-radius-lg)', border: '1px dashed var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h5 style={{ margin: 0, color: 'var(--primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                        ✨ AI SOAP Note Generator
                      </h5>
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'white', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '10px', border: '1px solid var(--primary)' }}>Powered by Groq</span>
                    </div>
                    

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-gray)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>Symptoms (Subjective)</label>
                        <textarea 
                          value={consultForm.symptoms} 
                          onChange={e => setConsultForm({...consultForm, symptoms: e.target.value})} 
                          style={{ width: '100%', padding: '0.8rem', backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-dark)', outline: 'none', resize: 'vertical' }} 
                          rows={2}
                          placeholder="e.g., patient complains of severe headache for 3 days..."
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-gray)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>Diagnosis (Assessment)</label>
                        <input 
                          type="text" 
                          value={consultForm.diagnosis} 
                          onChange={e => setConsultForm({...consultForm, diagnosis: e.target.value})} 
                          style={{ width: '100%', padding: '0.8rem', backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-dark)', outline: 'none' }} 
                          placeholder="e.g., Acute Migraine"
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-gray)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>Prescription (Plan)</label>
                        <textarea 
                          value={consultForm.prescription} 
                          onChange={e => setConsultForm({...consultForm, prescription: e.target.value})} 
                          style={{ width: '100%', padding: '0.8rem', backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-dark)', outline: 'none', resize: 'vertical' }} 
                          rows={2}
                          placeholder="e.g., Sumatriptan 50mg PRN, rest in dark room"
                        />
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={handleGenerateSoap}
                        disabled={isGeneratingSoap || !consultForm.symptoms || !consultForm.diagnosis || !consultForm.prescription}
                        className="btn-primary"
                        style={{
                          marginTop: '0.5rem',
                          padding: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          opacity: (isGeneratingSoap || !consultForm.symptoms || !consultForm.diagnosis || !consultForm.prescription) ? 0.6 : 1
                        }}
                      >
                        {isGeneratingSoap ? (
                          <><span>⏳</span> AI is writing SOAP note...</>
                        ) : (
                          <>✨ Generate Professional SOAP Note</>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-gray)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>Final EHR Note</label>
                    <textarea 
                      value={consultForm.notes} 
                      onChange={e => setConsultForm({...consultForm, notes: e.target.value})} 
                      style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-dark)', outline: 'none', minHeight: '200px', fontFamily: 'monospace', lineHeight: 1.6 }} 
                      placeholder=""
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setConsultModal({ open: false, patient: null })} className="btn-outline" style={{ flex: 1, padding: '1rem' }}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ flex: 2, padding: '1rem', backgroundColor: 'var(--status-called)' }}>💾 Save Record & Complete Patient</button>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '2rem', borderRadius: 'var(--border-radius-md)', minWidth: '400px' }}>
            <h3 style={{ color: 'var(--text-dark)', marginTop: 0, fontWeight: 700, fontSize: '1.25rem' }}>Transfer Patient</h3>
            <select 
              value={transferModal.toDoctorId} 
              onChange={e => setTransferModal(prev => ({ ...prev, toDoctorId: e.target.value }))}
              style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', backgroundColor: 'white', border: '1px solid var(--border-light)', color: 'var(--text-dark)', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
            >
              <option value="" disabled>Select Doctor</option>
              {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name} ({d.specialty})</option>)}
            </select>
            <input 
              type="text" 
              placeholder="Reason for transfer..." 
              value={transferModal.reason}
              onChange={e => setTransferModal(prev => ({ ...prev, reason: e.target.value }))}
              style={{ width: '100%', marginBottom: '1.5rem', padding: '0.8rem', backgroundColor: 'white', border: '1px solid var(--border-light)', color: 'var(--text-dark)', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setTransferModal({ open: false, patientId: null, toDoctorId: '', reason: '' })} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
              <button onClick={transferPatient} disabled={!transferModal.toDoctorId} className="btn-primary" style={{ flex: 1, opacity: transferModal.toDoctorId ? 1 : 0.5 }}>Confirm Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
