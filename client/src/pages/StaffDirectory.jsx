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
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)' }}>Staff Directory</h1>
          <p style={{ color: 'var(--text-gray)' }}>Manage hospital employees and their shift statuses</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/admin')} className="btn-outline">Back to Dashboard</button>
          <button onClick={() => navigate('/admin/shifts')} className="btn-outline">Shift Roster</button>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Hospital Employees</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
            {showAddForm ? 'Cancel' : '+ Add New Staff'}
          </button>
        </div>

        {showAddForm && (
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Register New Staff Member</h3>
            {error && <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }} />
              <input type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }} />
              <input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }} />
              
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }}>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="receptionist">Receptionist</option>
              </select>

              {formData.role === 'doctor' && (
                <input type="text" placeholder="Specialty (e.g. Cardiology)" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} required style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }} />
              )}
              
              <input type="text" placeholder="Contact Number" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-light)', outline: 'none' }} />
              
              <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2' }}>Create Staff Account</button>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-accent)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-gray)' }}>Name</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-gray)' }}>Role</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-gray)' }}>Email</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-gray)' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-gray)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(staff => (
                <tr key={staff._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{staff.name}</div>
                    {staff.specialty && <div style={{ fontSize: '0.85rem', color: 'var(--text-gray)' }}>{staff.specialty}</div>}
                  </td>
                  <td style={{ padding: '1rem', textTransform: 'capitalize', color: 'var(--text-dark)' }}>{staff.role}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-dark)' }}>{staff.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      backgroundColor: staff.status === 'active' ? '#D1FAE5' : '#FEE2E2',
                      color: staff.status === 'active' ? '#065F46' : '#991B1B'
                    }}>
                      {staff.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => toggleStatus(staff._id, staff.status)}
                      className="btn-outline"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      {staff.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    {staff.role === 'doctor' && (
                      activeShiftIds.has(staff._id) ? (
                        <button
                          onClick={() => stopShift(staff._id, staff.name)}
                          className="btn-outline"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: '#FCA5A5', color: '#DC2626' }}
                          title="End this doctor's shift — removes them from the live queue"
                        >
                          🔴 Stop Shift
                        </button>
                      ) : (
                        <button
                          onClick={() => startShift(staff._id, staff.name)}
                          className="btn-outline"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: '#6EE7B7', color: '#059669' }}
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
