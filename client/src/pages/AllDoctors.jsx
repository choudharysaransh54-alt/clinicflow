import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';

export default function AllDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket } = useSocket();

  const fetchDoctors = async () => {
    try {
      const response = await axios.get('/api/staff/public');
      setDoctors(response.data.doctors || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
      setError('Could not load doctors list. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();

    if (socket) {
      // Whenever the admin queue updates (e.g. shifts start/stop), refresh the list
      socket.on('queue:admin:updated', fetchDoctors);
    }

    return () => {
      if (socket) {
        socket.off('queue:admin:updated', fetchDoctors);
      }
    };
  }, [socket]);

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1440px', margin: '0 auto', minHeight: '80vh' }}>
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '1rem' }}>
          Meet Our Specialists
        </h1>
        <p style={{ color: 'var(--text-gray)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Browse through our extensive list of highly qualified doctors. See who is currently available for a consultation.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-gray)' }}>
          Loading doctors...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--status-removed)' }}>
          {error}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '2rem'
        }}>
          {doctors.map(doctor => (
            <div key={doctor._id} className="card hover-lift" style={{ 
              display: 'flex', 
              flexDirection: 'column',
              padding: '0', 
              overflow: 'hidden',
              cursor: 'pointer'
            }}>
              {/* Top half: Avatar / Image Placeholder */}
              <div style={{ 
                height: '200px', 
                backgroundColor: 'var(--bg-accent)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--primary)',
                fontSize: '4rem',
                fontWeight: 700
              }}>
                {doctor.name.charAt(0)}
              </div>
              
              {/* Bottom half: Details */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                
                {/* Availability Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: doctor.isAvailable ? 'var(--status-called)' : 'var(--border-med)'
                  }}></div>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: doctor.isAvailable ? 'var(--status-called)' : 'var(--text-gray)'
                  }}>
                    {doctor.isAvailable ? 'Available Now' : 'Currently Offline'}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                  Dr. {doctor.name}
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-gray)' }}>
                  {doctor.specialty || 'General Practitioner'}
                </p>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
