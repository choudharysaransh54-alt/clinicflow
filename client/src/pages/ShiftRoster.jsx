import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

export default function ShiftRoster() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [formData, setFormData] = useState({ staffId: '', startTime: '', endTime: '', department: '', roleDuringShift: '' });
  const [error, setError] = useState('');

  const fetchShifts = async () => {
    try {
      const res = await axios.get('/api/shifts');
      setShifts(res.data.shifts);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await axios.get('/api/staff');
      setStaff(res.data.staff.filter(s => s.status === 'active'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchStaff();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/shifts', formData);
      setFormData({ staffId: '', startTime: '', endTime: '', department: '', roleDuringShift: '' });
      fetchShifts();
    } catch (err) {
      setError('Failed to assign shift');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/shifts/${id}`);
      fetchShifts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)' }}>Shift Roster</h1>
          <p style={{ color: 'var(--text-gray)' }}>Schedule and manage staff shifts</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/admin')} className="btn-outline">Back to Dashboard</button>
          <button onClick={() => navigate('/admin/staff')} className="btn-outline">Staff Directory</button>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div>
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Assign New Shift</h2>
            <div className="card">
              {error && <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
              <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Staff Member</label>
                  <select value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})} required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }}>
                    <option value="" disabled>Select Staff Member...</option>
                    {staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Time</label>
                    <input type="datetime-local" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Time</label>
                    <input type="datetime-local" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }} />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Department (Optional)</label>
                  <input type="text" placeholder="e.g. ER, Ward A" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Role During Shift (Optional)</label>
                  <input type="text" placeholder="e.g. Attending" value={formData.roleDuringShift} onChange={e => setFormData({...formData, roleDuringShift: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }} />
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Schedule Shift</button>
              </form>
            </div>
          </section>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Scheduled Shifts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {shifts.map(shift => (
              <div key={shift._id} className="card hover-lift" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                    {shift.staffId?.name} <span style={{ fontSize: '0.85rem', color: 'var(--text-gray)', fontWeight: 400 }}>({shift.staffId?.role})</span>
                  </h3>
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-gray)', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-dark)' }}>Time:</span> {new Date(shift.startTime).toLocaleString()} - {new Date(shift.endTime).toLocaleTimeString()}
                  </div>
                  <div style={{ marginTop: '0.25rem', color: 'var(--text-gray)', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-dark)' }}>Dept:</span> {shift.department || 'N/A'} | <span style={{ fontWeight: 500, color: 'var(--text-dark)' }}>Role:</span> {shift.roleDuringShift || 'N/A'}
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(shift._id)} 
                  className="btn-outline" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', borderColor: '#FCA5A5', color: '#DC2626' }}
                >
                  Cancel Shift
                </button>
              </div>
            ))}
            {shifts.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                No shifts scheduled.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
