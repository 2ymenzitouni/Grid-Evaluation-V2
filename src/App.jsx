import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

// Pages
import AdminPage from './pages/AdminPage/AdminPage.jsx';
import UserPage from './pages/UserPage/UserPage.jsx';
import Home from './pages/Home/Home.jsx';
import LoginPage from './pages/LoginPage/LoginPage.jsx';
import Settings from './pages/AdminPage/SettingsPage.jsx';
import UserSurvey from './pages/UserPage/UserSurvey.jsx';
import StatsPage from './pages/UserPage/StatsPage.jsx';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/settings" element={<Settings />} />

        <Route path="/user" element={<UserPage />} />
        <Route path="/user/survey" element={<UserSurvey />} />
        <Route path="/user/stats" element={<StatsPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
