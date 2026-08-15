import { useState, useEffect } from 'react';
import './QueueStatus.css';

export default function QueueStatus({ patient, queueData }) {
  const [estimatedWait, setEstimatedWait] = useState(null);

  useEffect(() => {
    if (patient && patient.position > 1) {
      // Use real avg wait time from server stats, fallback to 8 mins
      const avgMinsPerPatient = queueData?.stats?.avgWaitMinutes || 8;
      const patientsAhead = patient.position - 1;
      setEstimatedWait(Math.max(1, patientsAhead * avgMinsPerPatient));
    } else if (patient?.position === 1) {
      setEstimatedWait(0);
    }
  }, [patient, queueData]);

  if (!patient) return null;

  const isCalled = patient.status === 'called';
  const totalWaiting = (queueData?.standard?.length || 0) + (queueData?.senior?.length || 0);

  return (
    <div className={`queue-status ${isCalled ? 'is-called' : ''}`}>
      <div className="status-header">
        <h2>{isCalled ? "It's your turn!" : "You're in the queue"}</h2>
        <p className="ticket-id">Ticket: <span>{patient.ticketId.split('-')[0].toUpperCase()}</span></p>
        {patient.queueType === 'senior' && (
          <span className="queue-type-badge">⭐ Senior Priority Queue</span>
        )}
      </div>

      <div className="position-card">
        <div className="position-info">
          <span className="label">{isCalled ? 'Go to counter' : 'Your Position'}</span>
          <span className="number">{isCalled ? 'Now' : `#${patient.position}`}</span>
        </div>
        
        {!isCalled && estimatedWait !== null && (
          <div className="wait-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              {estimatedWait === 0
                ? '🎉 You\'re next!'
                : `Est. Wait: ~${estimatedWait} min${estimatedWait !== 1 ? 's' : ''}`}
            </span>
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
