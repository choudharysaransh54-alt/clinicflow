import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelect from './pages/RoleSelect';
import PatientView from './pages/PatientView';
import ClinicDashboard from './pages/ClinicDashboard';
import './styles/variables.css';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/patient" element={<PatientView />} />
        <Route path="/dashboard" element={<ClinicDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
