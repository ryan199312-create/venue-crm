import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { isRootDomain } from './core/tenantResolver';

// Helpers
import ScrollToTop from './components/ScrollToTop';

// Pages
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const ClientPortal = lazy(() => import('./admin/ClientPortal'));
const SuperAdminPortal = lazy(() => import('./super-admin/SuperAdminPortal'));
const LandingPage = lazy(() => import('./landing/LandingPage'));

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
          <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-md">Refresh Page</button>
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
  const rootDomain = isRootDomain();

  // Global fix: Disable scroll-to-change on number inputs
  useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <GlobalErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ROOT: public marketing landing page (root domain only).
                On a tenant subdomain, "/" goes straight to that tenant's app. */}
            <Route path="/" element={rootDomain ? <LandingPage /> : <Navigate to="/admin" replace />} />

            {/* SUPER ADMIN CONSOLE - Always available at this path */}
            <Route path="/super-admin" element={<SuperAdminPortal />} />

            {/* TENANT ADMIN & PORTAL */}
            {/* These routes now work on both Subdomains AND Root Domain (defaulting to my-venue-crm) */}
            <Route path="/admin" element={<AdminLayout />} />
            <Route path="/portal" element={<ClientPortal />} />
            <Route path="/portal/:eventId" element={<ClientPortal />} />

            {/* Fallback: unknown paths → landing (root domain) or the tenant app (subdomain) */}
            <Route path="*" element={<Navigate to={rootDomain ? '/' : '/admin'} replace />} />
          </Routes>
        </Suspense>
      </GlobalErrorBoundary>
    </Router>
  );
}
