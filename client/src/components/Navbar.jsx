import React from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname.startsWith('/patient')) {
    return null; // hide on kiosk
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 4rem',
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {/* Left: Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', 
          background: 'var(--primary)', position: 'relative', overflow: 'hidden'
        }}>
          {/* Simple star shape simulation */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '16px', height: '16px', backgroundColor: 'white', transform: 'translate(-50%, -50%) rotate(45deg)' }}></div>
        </div>
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', letterSpacing: '-0.5px' }}>
          ClinicFlow
        </span>
      </Link>

      {/* Center: Links */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {(user?.role === 'admin' 
          ? [
              { name: 'DASHBOARD', path: '/admin' },
              { name: 'STAFF', path: '/admin/staff' },
              { name: 'SHIFTS', path: '/admin/shifts' }
            ]
          : user?.role === 'doctor'
          ? [
              { name: 'YOUR PATIENT QUEUE', path: `/doctor/${user.id}` },
              { name: 'PAST PATIENTS', path: `/doctor/${user.id}#past` }
            ]
          : [
              { name: 'HOME', path: '/' },
              { name: 'ALL DOCTORS', path: '/doctors' },
              { name: 'ABOUT', path: '/about' },
              { name: 'CONTACT', path: '/contact' }
            ]
        ).map(link => (
          <NavLink 
            key={link.name}
            to={link.path}
            onClick={(e) => {
              if (link.path.includes('#')) {
                const id = link.path.split('#')[1];
                const element = document.getElementById(id);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              } else if (link.path.startsWith('/doctor/')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            style={({ isActive }) => ({
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-dark)',
              borderBottom: isActive && (location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path))) 
                ? '2px solid var(--primary)' 
                : '2px solid transparent',
              paddingBottom: '4px',
              transition: 'border-color 0.2s ease'
            })}
          >
            {link.name}
          </NavLink>
        ))}
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {token ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--text-gray)', fontSize: '0.9rem', fontWeight: 500 }}>
              {user.name} ({user.role})
            </span>
            <button onClick={handleLogout} className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}>
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

