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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="logo-icon">C</div>
          <h1>Shift Roster</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/admin')} style={{ padding: '0.6rem 1rem', background: 'transparent', color: 'white', border: '1px solid white', borderRadius: '4px', cursor: 'pointer' }}>Back to Dashboard</button>
          <button onClick={() => navigate('/admin/staff')} style={{ padding: '0.6rem 1rem', background: 'transparent', color: 'white', border: '1px solid white', borderRadius: '4px', cursor: 'pointer' }}>Staff Directory</button>
          <button onClick={logout} className="logout-btn" style={{ padding: '0.6rem 1.2rem', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="dashboard-left">
          <section className="current-patient-section">
            <h2>Assign New Shift</h2>
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
              {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
              <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <select value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }}>
                  <option value="" disabled>Select Staff Member...</option>
                  {staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                </select>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Start Time</label>
                  <input type="datetime-local" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>End Time</label>
                  <input type="datetime-local" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }} />
                </div>

                <input type="text" placeholder="Department (e.g. ER, Ward A)" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }} />
                <input type="text" placeholder="Role During Shift" value={formData.roleDuringShift} onChange={e => setFormData({...formData, roleDuringShift: e.target.value})} style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }} />

                <button type="submit" style={{ padding: '1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Schedule Shift</button>
              </form>
            </div>
          </section>
        </div>

        <div className="dashboard-right">
          <h2>Scheduled Shifts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {shifts.map(shift => (
              <div key={shift._id} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{shift.staffId?.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({shift.staffId?.role})</span></h3>
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <strong>Time:</strong> {new Date(shift.startTime).toLocaleString()} - {new Date(shift.endTime).toLocaleTimeString()}
                  </div>
                  <div style={{ marginTop: '0.2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <strong>Dept:</strong> {shift.department || 'N/A'} | <strong>Role:</strong> {shift.roleDuringShift || 'N/A'}
                  </div>
                </div>
                <button onClick={() => handleDelete(shift._id)} style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel Shift</button>
              </div>
            ))}
            {shifts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No shifts scheduled.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
