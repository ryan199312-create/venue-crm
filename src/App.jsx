import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Helpers
import ScrollToTop from './components/ScrollToTop.jsx'; 

// Pages
import WebsiteLayout from './website/WebsiteLayout.jsx';
import Home from './website/Home.jsx';
import Weddings from './website/Weddings.jsx';
import Corporate from './website/Corporate.jsx';
import Dining from './website/Dining.jsx';
import AdminApp from './admin/AdminApp.jsx';

export default function App() {
  return (
    <Router>
      <ScrollToTop /> {/* <--- ADD THIS LINE HERE */}
      <Routes>
        
        {/* PUBLIC WEBSITE ROUTES */}
        <Route element={<WebsiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/weddings" element={<Weddings />} />
          <Route path="/corporate" element={<Corporate />} /> 
          <Route path="/dining" element={<Dining />} />
        </Route>

        {/* ADMIN ROUTE */}
        <Route path="/admin" element={<AdminApp />} />

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </Router>
  );
}