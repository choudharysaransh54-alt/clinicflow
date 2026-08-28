import React from 'react';

export default function Contact() {
  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1000px', margin: '0 auto', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>
          CONTACT <span style={{ color: 'var(--primary)' }}>US</span>
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '4rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Left Side: Image */}
        <div style={{ 
          flex: '1 1 350px', 
          maxWidth: '450px',
          height: '400px', 
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden'
        }}>
          <img 
            src="https://cdn.create.vista.com/api/media/small/455913540/stock-photo-young-doctor-glasses-white-coat-holding-clipboard-looking-away-blue" 
            alt="Doctor with clipboard" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        
        {/* Right Side: Text Information */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Our Office
            </h3>
            <div style={{ color: 'var(--text-gray)', lineHeight: '1.8', fontSize: '1.05rem' }}>
              <p style={{ margin: '0 0 0.25rem 0' }}>00000 Willms Station</p>
              <p style={{ margin: '0 0 1.5rem 0' }}>Suite 000, Washington, USA</p>
              
              <p style={{ margin: '0 0 0.25rem 0' }}>Tel: (000) 000-0000</p>
              <p style={{ margin: 0 }}>Email: greatstackdev@gmail.com</p>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Careers at ClinicFlow
            </h3>
            <p style={{ color: 'var(--text-gray)', lineHeight: '1.8', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
              Learn more about our teams and job openings.
            </p>
            <button className="btn-outline" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderWidth: '2px' }}>
              Explore Jobs
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
