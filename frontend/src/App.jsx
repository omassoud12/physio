import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import SignIn from './pages/auth/SignIn.jsx'
import Register from './pages/auth/Register.jsx'
import ConnectionTest from './pages/ConnectionTest.jsx'
import PatientDashboard from './pages/dashboards/PatientDashboard.jsx'
import PhysiotherapistDashboard from './pages/dashboards/PhysiotherapistDashboard.jsx'
import AdminDashboard from './pages/dashboards/AdminDashboard.jsx'
import MedicalIntake from './pages/medical/MedicalIntake.jsx'
import MedicalRecordViewer from './pages/medical/MedicalRecordViewer.jsx'
import RoleRoute from './components/RoleRoute.jsx'
import './pages/dashboards/Dashboard.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route path="/connection-test" element={<ConnectionTest />} />
      <Route path="/patient/dashboard" element={<RoleRoute allowedRoles={['patient']}><PatientDashboard /></RoleRoute>} />
      <Route path="/patient/medical-profile" element={<RoleRoute allowedRoles={['patient']}><MedicalIntake /></RoleRoute>} />
      <Route path="/medical-records/patient/:patientId" element={<RoleRoute allowedRoles={['physiotherapist', 'admin']}><MedicalRecordViewer /></RoleRoute>} />
      <Route
        path="/physiotherapist/dashboard"
        element={<RoleRoute allowedRoles={['physiotherapist']}><PhysiotherapistDashboard /></RoleRoute>}
      />
      <Route path="/admin/dashboard" element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
