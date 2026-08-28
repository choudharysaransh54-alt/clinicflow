import { useState, useEffect } from 'react';

export default function QueueStatus({ patient, queueData }) {
  const [estimatedWait, setEstimatedWait] = useState(null);

  useEffect(() => {
    // We now rely entirely on the backend AI for wait time calculation
  }, [patient, queueData]);

  if (!patient) return null;

  if (patient.status === 'removed') {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--status-removed)' }}>
        <h2 style={{ color: 'var(--status-removed)', marginBottom: '0.5rem', fontWeight: 700 }}>Ticket Cancelled</h2>
        <p style={{ color: 'var(--text-gray)' }}>Your queue ticket has been cancelled. Please speak to the receptionist if this was a mistake.</p>
      </div>
    );
  }

  if (patient.status === 'completed') {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--status-called)' }}>
        <h2 style={{ color: 'var(--status-called)', marginBottom: '0.5rem', fontWeight: 700 }}>Consultation Complete</h2>
        <p style={{ color: 'var(--text-gray)' }}>Thank you for visiting ClinicFlow. You may now close this page.</p>
      </div>
    );
  }

  const isCalled = patient.status === 'with_doctor' || patient.status === 'waiting_pharmacy';
  const totalWaiting = (queueData?.standard?.length || 0) + (queueData?.senior?.length || 0);

  return (
    <div className={`card ${isCalled ? 'hover-lift' : ''}`} style={{ border: isCalled ? '2px solid var(--primary)' : '1px solid var(--border-light)', position: 'relative', overflow: 'hidden' }}>
      {isCalled && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: 'var(--primary)' }} />
      )}
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: isCalled ? 'var(--primary)' : 'var(--text-dark)' }}>
          {isCalled ? "It's your turn!" : "You're in the queue"}
        </h2>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-gray)', marginTop: '0.5rem' }}>
          Ticket: <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{patient.ticketId.toUpperCase()}</span>
        </p>
        
        {patient.queueType === 'senior' && (
          <div style={{ display: 'inline-block', marginTop: '0.5rem', backgroundColor: '#FEF3C7', color: '#D97706', padding: '0.25rem 0.75rem', borderRadius: 'var(--border-radius-full)', fontSize: '0.875rem', fontWeight: 600 }}>
            ⭐ Senior Priority Queue
          </div>
        )}
        
        {patient.assignedDoctor && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-accent)', borderRadius: 'var(--border-radius-sm)', display: 'inline-block' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-gray)' }}>Assigned to:</span><br/>
            <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>Dr. {patient.assignedDoctor.name}</strong> 
            <div style={{ fontSize: '0.875rem', color: 'var(--text-gray)', marginTop: '0.25rem' }}>{patient.assignedDoctor.specialty}</div>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {isCalled ? 'Go to counter' : 'Your Position'}
          </span>
          <span style={{ fontSize: '3rem', fontWeight: 700, color: isCalled ? 'var(--primary)' : 'var(--text-dark)', lineHeight: 1, marginTop: '0.5rem' }}>
            {isCalled ? 'Now' : `#${patient.position}`}
          </span>
        </div>
        
        {!isCalled && !patient.doctorOffline && patient.aiWaitMessage && (
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textAlign: 'left' }}>
            <span style={{ fontSize: '1.25rem' }}>✨</span>
            <span style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 }}>
              {patient.aiWaitMessage}
            </span>
          </div>
        )}

        {patient.doctorOffline && (
          <div style={{ backgroundColor: '#FEE2E2', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #EF4444', color: '#B91C1C', textAlign: 'left' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              ⚠️ Doctor Offline
            </div>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
              Your assigned doctor is currently off-shift.
              {patient.nextAvailableTime ? (
                <> The next available doctor for this specialty will be online at <strong style={{ color: '#991B1B' }}>{new Date(patient.nextAvailableTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>.</>
              ) : (
                <> No upcoming shifts are scheduled for this specialty. Please see the receptionist.</>
              )}
            </div>
          </div>
        )}
      </div>

      {!isCalled && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-gray)' }}>
          Total patients waiting: <strong style={{ color: 'var(--text-dark)' }}>{totalWaiting}</strong>
        </div>
      )}
    </div>
  );
}
