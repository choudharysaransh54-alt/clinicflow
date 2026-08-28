import React from 'react';

export default function About() {
  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1000px', margin: '0 auto', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>
          ABOUT <span style={{ color: 'var(--primary)' }}>US</span>
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Left Side: Image */}
          <div style={{ 
            flex: '1 1 300px', 
            height: '350px', 
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden'
          }}>
            <img 
              src="https://cdn.create.vista.com/api/media/small/210637426/stock-photo-cropped-image-doctor-holding-tablet-clinic" 
              alt="Clinic doctor" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          
          {/* Right Side: Text */}
          <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-gray)', lineHeight: '1.6', fontSize: '1.05rem' }}>
            <p>
              Welcome to <strong>ClinicFlow</strong>, your trusted partner in managing your healthcare needs conveniently and efficiently. At ClinicFlow, we understand the challenges individuals face when it comes to scheduling doctor appointments and managing their health records.
            </p>
            <p>
              ClinicFlow is committed to excellence in healthcare technology. We continuously strive to enhance our platform, integrating the latest advancements to improve user experience and deliver superior service. Whether you're booking your first appointment or managing ongoing care, ClinicFlow is here to support you every step of the way.
            </p>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Our Vision</h3>
              <p>
                Our vision at ClinicFlow is to create a seamless healthcare experience for every user. We aim to bridge the gap between patients and healthcare providers, making it easier for you to access the care you need, when you need it.
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '2rem' }}>
            WHY CHOOSE <span style={{ color: 'var(--primary)' }}>US</span>
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '2rem' 
          }}>
            {[
              {
                title: 'NO MORE WAITING IN THE DARK',
                desc: 'Never guess when you\'ll be seen. Our live digital queues let you track your exact position and wait time in real-time from anywhere.'
              },
              {
                title: 'SMART DOCTOR MATCHING',
                desc: 'Not sure which specialist you need? Our intelligent symptom checker instantly connects you to the right doctor for your specific needs.'
              },
              {
                title: 'SEAMLESS CONTINUITY',
                desc: 'Your time is valuable. If a doctor becomes unavailable, you are automatically and instantly routed to the next available specialist without losing your spot.'
              }
            ].map((feature, index) => (
              <div key={index} className="card hover-lift" style={{ 
                padding: '2rem', 
                border: '1px solid var(--border-light)',
                transition: 'all 0.3s ease'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                  {feature.title}
                </h4>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
