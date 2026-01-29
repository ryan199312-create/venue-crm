import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Helpers
import ScrollToTop from './ScrollToTop'; // <--- IMPORT THIS

// Pages
import WebsiteLayout from './WebsiteLayout';
import Home from './Home';
import Weddings from './Weddings';
import VMS from './VMS';

export default function App() {
  return (
    <Router>
      <ScrollToTop /> {/* <--- ADD THIS LINE HERE */}
      <Routes>
        
        {/* PUBLIC WEBSITE ROUTES */}
        <Route element={<WebsiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/weddings" element={<Weddings />} />
          {/* You can map /corporate and /dining to Home for now if you haven't made those pages yet */}
          <Route path="/corporate" element={<Navigate to="/" replace />} /> 
          <Route path="/dining" element={<Navigate to="/" replace />} />
        </Route>

        {/* ADMIN ROUTE */}
        <Route path="/admin" element={<VMS />} />

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </Router>
  );
}