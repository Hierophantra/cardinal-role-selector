import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Questionnaire from './components/Questionnaire.jsx';
import PartnerHub from './components/PartnerHub.jsx';
import Admin from './components/admin/Admin.jsx';
import AdminHub from './components/admin/AdminHub.jsx';
import AdminProfile from './components/admin/AdminProfile.jsx';
import AdminComparison from './components/admin/AdminComparison.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/q/:partner" element={<Questionnaire />} />
      <Route path="/hub/:partner" element={<PartnerHub />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/hub" element={<AdminHub />} />
      <Route path="/admin/profile/:partner" element={<AdminProfile />} />
      <Route path="/admin/comparison" element={<AdminComparison />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
