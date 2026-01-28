import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import WebsiteLayout from './WebsiteLayout';
import Home from './Home';
import Weddings from './Weddings';
import VMS from './VMS';

export default function App() {
  return (
    <Router>
      <Routes>
        
        {/* PUBLIC WEBSITE ROUTES */}
        <Route element={<WebsiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/weddings" element={<Weddings />} />
          {/* Add more pages here later: */}
          {/* <Route path="/corporate" element={<Corporate />} /> */}
        </Route>

        {/* ADMIN ROUTE */}
        <Route path="/admin" element={<VMS />} />

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </Router>
  );
}