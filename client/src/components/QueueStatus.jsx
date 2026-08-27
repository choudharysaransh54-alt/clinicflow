import { useState, useEffect } from 'react';
import './QueueStatus.css';

export default function QueueStatus({ patient, queueData }) {
  const [estimatedWait, setEstimatedWait] = useState(null);

  useEffect(() => {
    // We now rely entirely on the backend AI for wait time calculation
  }, [patient, queueData]);

  if (!patient) return null;

  if (patient.status === 'removed') {
    return (
      <div className="queue-status">
        <div className="status-header" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <h2 style={{ color: '#ef4444' }}>Ticket Cancelled</h2>
          <p>Your queue ticket has been cancelled. Please speak to the receptionist if this was a mistake.</p>
        </div>
      </div>
    );
  }

  if (patient.status === 'completed') {
    return (
      <div className="queue-status">
        <div className="status-header" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
          <h2 style={{ color: '#22c55e' }}>Consultation Complete</h2>
          <p>Thank you for visiting ClinicFlow. You may now close this page.</p>
        </div>
      </div>
    );
  }

  const isCalled = patient.status === 'with_doctor' || patient.status === 'waiting_pharmacy';
  const totalWaiting = (queueData?.standard?.length || 0) + (queueData?.senior?.length || 0);

  return (
    <div className={`queue-status ${isCalled ? 'is-called' : ''}`}>
      <div className="status-header">
        <h2>{isCalled ? "It's your turn!" : "You're in the queue"}</h2>
        <p className="ticket-id">Ticket: <span>{patient.ticketId.toUpperCase()}</span></p>
        {patient.queueType === 'senior' && (
          <span className="queue-type-badge">⭐ Senior Priority Queue</span>
        )}
        
        {patient.assignedDoctor && (
          <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assigned to:</span><br/>
            <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{patient.assignedDoctor.name}</strong> 
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}> ({patient.assignedDoctor.specialty})</span>
          </div>
        )}
      </div>

      <div className="position-card">
        <div className="position-info">
          <span className="label">{isCalled ? 'Go to counter' : 'Your Position'}</span>
          <span className="number">{isCalled ? 'Now' : `#${patient.position}`}</span>
        </div>
        
        {!isCalled && !patient.doctorOffline && patient.aiWaitMessage && (
          <div className="wait-info" style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            <span style={{ fontSize: '1.2rem' }}>✨</span>
            <span style={{ color: '#e2e8f0' }}>
              {patient.aiWaitMessage}
            </span>
          </div>
        )}

        {patient.doctorOffline && (
          <div className="wait-info" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', flexWrap: 'wrap' }}>
            <div style={{ width: '100%', marginBottom: '0.5rem' }}>
              <strong>⚠️ Doctor Offline</strong>
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              Your assigned doctor is currently off-shift.
              {patient.nextAvailableTime ? (
                <> The next available doctor for this specialty will be online at <strong style={{ color: 'white' }}>{new Date(patient.nextAvailableTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>.</>
              ) : (
                <> No upcoming shifts are scheduled for this specialty. Please see the receptionist.</>
              )}
            </div>
          </div>
        )}
      </div>

      {!isCalled && (
        <div className="queue-context">
          <p>Total patients waiting: <strong>{totalWaiting}</strong></p>
        </div>
      )}

      {isCalled && (
        <div className="action-pulse">
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay"></div>
        </div>
      )}
    </div>
  );
}
