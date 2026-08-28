import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleSelect from './pages/RoleSelect';
import PatientView from './pages/PatientView';
import ClinicDashboard from './pages/ClinicDashboard';
import Login from './pages/Login';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacyQueue from './pages/PharmacyQueue';
import StaffDirectory from './pages/StaffDirectory';
import ShiftRoster from './pages/ShiftRoster';
import AllDoctors from './pages/AllDoctors';
import About from './pages/About';
import Contact from './pages/Contact';

import Navbar from './components/Navbar';

import './styles/variables.css';
import './App.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <Routes>
            <Route path="/" element={<RoleSelect />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/login/doctor" element={<Login type="doctor" />} />
            <Route path="/login/staff" element={<Login type="staff" />} />

            
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ClinicDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/staff" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <StaffDirectory />
              </ProtectedRoute>
            } />

            <Route path="/admin/shifts" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ShiftRoster />
              </ProtectedRoute>
            } />
            
            <Route path="/doctor/:id" element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <DoctorDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/pharmacy" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PharmacyQueue />
              </ProtectedRoute>
            } />
            
            <Route path="/status/:ticketId" element={<PatientView />} />
            <Route path="/patient" element={<PatientView />} />
            <Route path="/doctors" element={<AllDoctors />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
