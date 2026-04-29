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
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const ClientPortal = lazy(() => import('./admin/ClientPortal'));

// Error Boundary to catch Chunk Load errors or React UI crashes
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Caught by ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 text-center font-sans">
          <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong.</h2>
          <p className="text-slate-500 mb-6">We had trouble loading this page. This often happens after an app update or on poor connections.</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md">Refresh Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// A simple loading spinner to show while the specific route is downloading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
    <Loader2 className="animate-spin mr-2" size={24} /> 載入中 (Loading)...
  </div>
);

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <GlobalErrorBoundary>
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
            <Route path="/admin" element={<AdminLayout />} />
    
            {/* CLIENT PORTAL ROUTES */}
            <Route path="/portal" element={<ClientPortal />} />
            <Route path="/portal/:eventId" element={<ClientPortal />} />
    
            {/* CATCH ALL */}
            <Route path="*" element={<Navigate to="/" replace />} />
            
          </Routes>
        </Suspense>
      </GlobalErrorBoundary>
    </Router>
  );
}