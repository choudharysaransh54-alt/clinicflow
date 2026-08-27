import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

export default function StaffDirectory() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [activeShiftIds, setActiveShiftIds] = useState(new Set()); // staffIds with active shifts
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'doctor', specialty: '', contactNumber: '' });
  const [error, setError] = useState('');

  const fetchStaff = async () => {
    try {
      const res = await axios.get('/api/staff');
      setStaffList(res.data.staff);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveShifts = async () => {
    try {
      const now = new Date();
      const res = await axios.get(`/api/shifts?start=${now.toISOString()}&end=${now.toISOString()}`);
      // The query returns shifts whose startTime >= now which is wrong for active check,
      // so use the active-doctors endpoint instead
      const res2 = await axios.get('/api/shifts/active-doctors');
      setActiveShiftIds(new Set(res2.data.doctors.map(d => d._id)));
    } catch (err) {
      console.error('Failed to fetch active shifts', err);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchActiveShifts();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/staff', formData);
      setShowAddForm(false);
      setFormData({ name: '', email: '', password: '', role: 'doctor', specialty: '', contactNumber: '' });
      fetchStaff();
      fetchActiveShifts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add staff');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await axios.patch(`/api/staff/${id}/status`, { status: newStatus });
      fetchStaff();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const startShift = async (id, name) => {
    try {
      await axios.post(`/api/staff/${id}/start-shift`);
      await fetchActiveShifts();
      alert(`✅ Shift started for ${name}. They are now live in the queue!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start shift');
    }
  };

  const stopShift = async (id, name) => {
    try {
      await axios.post(`/api/staff/${id}/stop-shift`);
      await fetchActiveShifts();
      alert(`🔴 Shift ended for ${name}. They have been removed from the live queue.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to stop shift');
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="logo-icon">C</div>
          <h1>Staff Directory</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/admin')} style={{ padding: '0.6rem 1rem', background: 'transparent', color: 'white', border: '1px solid white', borderRadius: '4px', cursor: 'pointer' }}>Back to Dashboard</button>
          <button onClick={() => navigate('/admin/shifts')} style={{ padding: '0.6rem 1rem', background: 'transparent', color: 'white', border: '1px solid white', borderRadius: '4px', cursor: 'pointer' }}>Shift Roster</button>
          <button onClick={logout} className="logout-btn" style={{ padding: '0.6rem 1.2rem', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main" style={{ display: 'block', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Hospital Employees</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: '0.8rem 1.5rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
            {showAddForm ? 'Cancel' : '+ Add New Staff'}
          </button>
        </div>

        {showAddForm && (
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0 }}>Register New Staff Member</h3>
            {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }} />
              <input type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }} />
              <input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }} />
              
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }}>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="admin">Admin</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="receptionist">Receptionist</option>
              </select>

              {formData.role === 'doctor' && (
                <input type="text" placeholder="Specialty (e.g. Cardiology)" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} required style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }} />
              )}
              
              <input type="text" placeholder="Contact Number" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} style={{ padding: '0.8rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-glass)' }} />
              
              <button type="submit" style={{ gridColumn: 'span 2', padding: '1rem', background: 'var(--accent-secondary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create Staff Account</button>
            </form>
          </div>
        )}

        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(staff => (
                <tr key={staff._id} style={{ borderTop: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{staff.name}</div>
                    {staff.specialty && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{staff.specialty}</div>}
                  </td>
                  <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{staff.role}</td>
                  <td style={{ padding: '1rem' }}>{staff.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`status-badge ${staff.status === 'active' ? 'live' : 'offline'}`}>{staff.status}</span>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => toggleStatus(staff._id, staff.status)}
                      style={{ padding: '0.4rem 0.8rem', background: staff.status === 'active' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {staff.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    {staff.role === 'doctor' && (
                      activeShiftIds.has(staff._id) ? (
                        <button
                          onClick={() => stopShift(staff._id, staff.name)}
                          style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          title="End this doctor's shift — removes them from the live queue"
                        >
                          🔴 Stop Shift
                        </button>
                      ) : (
                        <button
                          onClick={() => startShift(staff._id, staff.name)}
                          style={{ padding: '0.4rem 0.8rem', background: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          title="Start an 8-hour shift — doctor appears in the live queue"
                        >
                          🟢 Start Shift
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
