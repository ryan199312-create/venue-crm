import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Helpers
import ScrollToTop from './components/ScrollToTop'; // <--- IMPORT THIS

// Pages
import WebsiteLayout from './website/WebsiteLayout';
import Home from './website/Home';
import Weddings from './website/Weddings';
import Corporate from './website/Corporate';
import Dining from './website/Dining';

// Lazy Loaded Routes (These will only download when the user visits them!)
const AdminApp = lazy(() => import('./admin/AdminApp'));
const ClientPortal = lazy(() => import('./admin/ClientPortal'));

// A simple loading spinner to show while the specific route is downloading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
    <Loader2 className="animate-spin mr-2" size={24} /> 載入中 (Loading)...
  </div>
);

export default function App() {
  return (
    <Router>
      <ScrollToTop /> {/* <--- ADD THIS LINE HERE */}
      <Suspense fallback={<PageLoader />}>
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
  
          {/* CLIENT PORTAL ROUTES */}
          <Route path="/portal" element={<ClientPortal />} />
          <Route path="/portal/:eventId" element={<ClientPortal />} />
  
          {/* CATCH ALL */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Routes>
      </Suspense>
    </Router>
  );
}