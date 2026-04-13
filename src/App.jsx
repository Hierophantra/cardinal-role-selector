import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Questionnaire from './components/Questionnaire.jsx';
import PartnerHub from './components/PartnerHub.jsx';
import KpiSelection from './components/KpiSelection.jsx';
import KpiSelectionView from './components/KpiSelectionView.jsx';
import Scorecard from './components/Scorecard.jsx';
import Admin from './components/admin/Admin.jsx';
import AdminHub from './components/admin/AdminHub.jsx';
import AdminProfile from './components/admin/AdminProfile.jsx';
import AdminComparison from './components/admin/AdminComparison.jsx';
import AdminPartners from './components/admin/AdminPartners.jsx';
import AdminTest from './components/admin/AdminTest.jsx';
import AdminKpi from './components/admin/AdminKpi.jsx';
import AdminScorecards from './components/admin/AdminScorecards.jsx';
import AdminMeeting from './components/admin/AdminMeeting.jsx';
import AdminMeetingSession from './components/admin/AdminMeetingSession.jsx';
import AdminMeetingSessionMock from './components/admin/AdminMeetingSessionMock.jsx';
import MeetingSummary from './components/MeetingSummary.jsx';
import MeetingHistory from './components/MeetingHistory.jsx';
import MeetingSummaryMock from './components/admin/MeetingSummaryMock.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/q/:partner" element={<Questionnaire />} />
      <Route path="/hub/:partner" element={<PartnerHub />} />
      <Route path="/kpi/:partner" element={<KpiSelection />} />
      <Route path="/kpi-view/:partner" element={<KpiSelectionView />} />
      <Route path="/scorecard/:partner" element={<Scorecard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/hub" element={<AdminHub />} />
      <Route path="/admin/partners" element={<AdminPartners />} />
      <Route path="/admin/profile/:partner" element={<AdminProfile />} />
      <Route path="/admin/comparison" element={<AdminComparison />} />
      <Route path="/comparison" element={<AdminComparison />} />
      <Route path="/admin/test" element={<AdminTest />} />
      <Route path="/admin/test/meeting-mock" element={<AdminMeetingSessionMock />} />
      <Route path="/meeting-history/:partner" element={<MeetingHistory />} />
      <Route path="/meeting-summary/:partner/:id" element={<MeetingSummary />} />
      <Route path="/admin/test/meeting-summary-mock" element={<MeetingSummaryMock />} />
      <Route path="/admin/kpi" element={<AdminKpi />} />
      <Route path="/admin/scorecards" element={<AdminScorecards />} />
      <Route path="/admin/meeting" element={<AdminMeeting />} />
      <Route path="/admin/meeting/:id" element={<AdminMeetingSession />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
