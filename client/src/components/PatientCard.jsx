import './PatientCard.css';

export default function PatientCard({ patient, isNext, onComplete, onRemove }) {
  const waitTime = patient.waitTimeMinutes || 0;
  
  return (
    <div className={`patient-card ${isNext ? 'is-next' : ''}`}>
      {isNext && <div className="next-badge">Next in Line</div>}
      
      <div className="card-header">
        <div className="ticket-badge">
          #{patient.position}
          <span className="ticket-id-small">{patient.ticketId.split('-')[0]}</span>
        </div>
        <div className="wait-time">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {waitTime}m
        </div>
      </div>

      <div className="card-body">
        <h3 className="patient-name">{patient.name}</h3>
        <p className="patient-age">Age: {patient.age}</p>
        {patient.phone && (
          <p className="patient-phone">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {patient.phone}
          </p>
        )}
        <div className="patient-reason">
          {patient.reason}
        </div>
      </div>

      {(!isNext || onComplete || onRemove) && (
        <div className="card-actions">
          {onComplete && (
            <button className="action-btn complete-btn" onClick={() => onComplete(patient.ticketId)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Complete
            </button>
          )}
          {onRemove && (
            <button className="action-btn remove-btn" onClick={() => onRemove(patient.ticketId)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
