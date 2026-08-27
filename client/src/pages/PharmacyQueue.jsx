import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';

export default function PharmacyQueue() {
  const [queue, setQueue] = useState([]);
  const { socket } = useSocket();
  const { token } = useAuth();

  const fetchQueue = async () => {
    try {
      const response = await axios.get('/api/queue/pharmacy');
      setQueue(response.data.patients);
    } catch (error) {
      console.error('Failed to fetch pharmacy queue:', error);
    }
  };

  useEffect(() => {
    fetchQueue();
    if (socket) {
      socket.emit('join:pharmacy');
      socket.on('queue:pharmacy:updated', fetchQueue);
    }
    return () => {
      if (socket) {
        socket.off('queue:pharmacy:updated', fetchQueue);
      }
    };
  }, [socket]);

  const completePatient = async (patientId) => {
    try {
      await axios.post(`/api/queue/complete/${patientId}`);
      // Socket event will trigger fetchQueue
    } catch (error) {
      console.error('Failed to complete patient:', error);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Pharmacy Queue</h2>
      {queue.length === 0 ? (
        <p>No patients waiting for pharmacy.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {queue.map((patient) => (
            <li key={patient._id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
              <strong>{patient.name}</strong> - Ticket: {patient.ticketId}
              <br />
              <button onClick={() => completePatient(patient._id)} style={{ marginTop: '0.5rem' }}>
                Complete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
