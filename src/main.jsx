import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'

import ProfilePage from './pages/ProfilePage'
import RecyclingCenters from './pages/RecyclingCenters'
import OrgDashboard from './pages/OrgDashboard';
import OrgProfile from './pages/OrgProfile';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/nearby-centers" element={<RecyclingCenters />} />
        <Route path="/org-dashboard" element={<OrgDashboard />} />
        <Route path="/org-profile" element={<OrgProfile />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
