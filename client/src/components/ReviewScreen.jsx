import { useState } from 'react';
import './ReviewScreen.css';

export default function ReviewScreen({ patient, onSubmit, onSkip }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    await onSubmit({ rating, comment: comment.trim() });
    setSubmitted(true);
    setTimeout(onSkip, 2500); // auto-return after showing thank you
  };

  if (submitted) {
    return (
      <div className="review-screen">
        <div className="review-thankyou">
          <div className="thankyou-icon">🎉</div>
          <h2>Thank You!</h2>
          <p>Your feedback helps us serve you better.</p>
          <p className="redirect-note">Returning to home screen...</p>
        </div>
      </div>
    );
  }

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="review-screen">
      <div className="review-card">
        <div className="review-header">
          <div className="review-icon">💬</div>
          <h2>How was your visit?</h2>
          <p>Rate your experience today — this only takes 10 seconds!</p>
        </div>

        {/* Star Rating */}
        <div className="star-container">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`star-btn ${star <= (hovered || rating) ? 'active' : ''}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        {(hovered || rating) > 0 && (
          <p className="rating-label">{labels[hovered || rating]}</p>
        )}

        {/* Optional Comment */}
        <div className="comment-group">
          <label htmlFor="review-comment">
            Any comments? <span className="optional">(optional)</span>
          </label>
          <textarea
            id="review-comment"
            rows={3}
            placeholder="Tell us what we can improve..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={300}
          />
        </div>

        {/* Actions */}
        <div className="review-actions">
          <button
            className="review-submit-btn"
            onClick={handleSubmit}
            disabled={rating === 0}
          >
            Submit Review
          </button>
          <button className="review-skip-btn" onClick={onSkip}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
