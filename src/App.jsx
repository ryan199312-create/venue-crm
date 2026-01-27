import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import your two main pages
import Website from './Website';
import VMS from './VMS';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Route 1: The Public Website (Root URL) */}
        <Route path="/" element={<Website />} />

        {/* Route 2: The VMS Admin Panel */}
        <Route path="/admin" element={<VMS />} />

        {/* Optional: Catch-all to redirect unknown pages back home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}