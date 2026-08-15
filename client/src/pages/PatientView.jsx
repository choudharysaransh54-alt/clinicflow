import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import IntakeForm from '../components/IntakeForm';
import QueueStatus from '../components/QueueStatus';
import ReviewScreen from '../components/ReviewScreen';
import '../styles/patient.css';

export default function PatientView() {
  const navigate = useNavigate();
  const { isConnected, emit, on } = useSocket();
  const [patientData, setPatientData] = useState(() => {
    // Try to load existing session
    const saved = sessionStorage.getItem('clinicflow_patient');
    return saved ? JSON.parse(saved) : null;
  });
  const [queueData, setQueueData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [completedPatient, setCompletedPatient] = useState(null);

  // Fetch initial queue data and check patient status
  useEffect(() => {
    if (isConnected) {
      emit('queue:get')
        .then(res => setQueueData(res.queue))
        .catch(console.error);

      if (patientData?.ticketId) {
        emit('patient:get', { ticketId: patientData.ticketId })
          .then(res => {
            if (res.patient) {
              setPatientData(res.patient);
            } else {
              // Patient no longer in system
              handleClearSession();
            }
          })
          .catch(console.error);
      }
    }
  }, [isConnected, emit, patientData?.ticketId]);

  // Listen for real-time updates
  useEffect(() => {
    const unsubUpdate = on('queue:updated', (data) => {
      setQueueData(data);
      // Update our specific position if we're in the queue
      if (patientData?.status === 'waiting') {
        const allWaiting = [...(data.standard || []), ...(data.senior || [])];
        const updatedMe = allWaiting.find(p => p.ticketId === patientData.ticketId);
        if (updatedMe) {
          setPatientData(prev => ({ ...prev, ...updatedMe }));
        }
      }
    });

    const unsubCalled = on('patient:called', (data) => {
      if (data.patient.ticketId === patientData?.ticketId) {
        setPatientData(data.patient);
        // Vibrate if supported
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
        // Play chime sound using Web Audio API
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const playTone = (freq, startTime, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
          };
          // Play a pleasant 3-note chime: C5 → E5 → G5
          playTone(523.25, ctx.currentTime, 0.4);
          playTone(659.25, ctx.currentTime + 0.2, 0.4);
          playTone(783.99, ctx.currentTime + 0.4, 0.6);
        } catch (e) {
          console.warn('Audio not available:', e);
        }
      }
    });

    const unsubCompleted = on('patient:completed', (data) => {
      if (data.patient.ticketId === patientData?.ticketId) {
        setCompletedPatient(data.patient);
        setShowReview(true);
      }
    });
    
    const unsubRemoved = on('patient:removed', (data) => {
       if (data.patient.ticketId === patientData?.ticketId) {
        handleClearSession();
        alert('You have been removed from the queue.');
      }
    });

    return () => {
      unsubUpdate();
      unsubCalled();
      unsubCompleted();
      unsubRemoved();
    };
  }, [on, patientData]);

  const handleJoin = async (formData) => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const res = await emit('patient:join', formData);
      setPatientData(res.patient);
      sessionStorage.setItem('clinicflow_patient', JSON.stringify(res.patient));
    } catch (err) {
      setError(err.message || 'Failed to join queue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSession = () => {
    sessionStorage.removeItem('clinicflow_patient');
    setPatientData(null);
    setShowReview(false);
    setCompletedPatient(null);
  };

  const handleReviewSubmit = async ({ rating, comment }) => {
    try {
      await emit('patient:review', {
        ticketId: completedPatient?.ticketId,
        rating,
        comment,
        name: completedPatient?.name,
      });
    } catch (e) {
      // silently ignore — review is optional
    }
  };

  return (
    <div className="patient-container">
      <header className="patient-header">
        <button
          className="patient-home-btn"
          onClick={() => navigate('/')}
          aria-label="Back to home"
        >
          ← Home
        </button>
        <div className="logo">
          <span className="logo-icon">C</span>
          ClinicFlow
        </div>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="dot"></div>
          {isConnected ? 'Live' : 'Connecting...'}
        </div>
      </header>

      <main className="patient-main">
        {error && <div className="error-banner">{error}</div>}

        {showReview ? (
          <ReviewScreen
            patient={completedPatient}
            onSubmit={handleReviewSubmit}
            onSkip={handleClearSession}
          />
        ) : !patientData ? (
          <IntakeForm onSubmit={handleJoin} isLoading={isSubmitting} />
        ) : (
          <div className="status-container">
            <QueueStatus patient={patientData} queueData={queueData} />
            {patientData.status === 'waiting' && (
              <button className="leave-btn" onClick={handleClearSession}>
                Leave Queue (Demo only)
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
