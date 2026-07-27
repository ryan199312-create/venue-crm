import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { isRootDomain } from './core/tenantResolver';
import { useLang } from './i18n/language';

// Helpers
import ScrollToTop from './components/ScrollToTop';

// Pages
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const ClientPortal = lazy(() => import('./admin/ClientPortal'));
const RsvpPortal = lazy(() => import('./admin/RsvpPortal'));
const SuperAdminPortal = lazy(() => import('./super-admin/SuperAdminPortal'));
const LandingPage = lazy(() => import('./landing/LandingPage'));
const ActivatePage = lazy(() => import('./admin/ActivatePage'));

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
const PageLoader = () => {
  const { L } = useLang();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
      <Loader2 className="animate-spin mr-2" size={24} /> {L('載入中 (Loading)')}...
    </div>
  );
};

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

            {/* Always-available preview of the landing page (works on any host, incl. localhost). */}
            <Route path="/landing" element={<LandingPage />} />

            {/* SUPER ADMIN CONSOLE - Always available at this path */}
            <Route path="/super-admin" element={<SuperAdminPortal />} />

            {/* TENANT ADMIN & PORTAL — only on a tenant subdomain.
                On the root domain there is NO default tenant, so these redirect to the
                public landing page. Access a tenant via its subdomain, e.g.
                kinglungheen.vowsos.com/admin (or kinglungheen.localhost:5173/admin in dev). */}
            <Route path="/admin" element={rootDomain ? <Navigate to="/" replace /> : <AdminLayout />} />
            <Route path="/activate" element={rootDomain ? <Navigate to="/" replace /> : <ActivatePage />} />
            <Route path="/portal" element={rootDomain ? <Navigate to="/" replace /> : <ClientPortal />} />
            <Route path="/portal/:eventId" element={rootDomain ? <Navigate to="/" replace /> : <ClientPortal />} />

            {/* Public guest RSVP page — no login. Reached via the shareable token link. */}
            <Route path="/rsvp/:token" element={rootDomain ? <Navigate to="/" replace /> : <RsvpPortal />} />

            {/* Fallback: unknown paths → landing (root domain) or the tenant app (subdomain) */}
            <Route path="*" element={<Navigate to={rootDomain ? '/' : '/admin'} replace />} />
          </Routes>
        </Suspense>
      </GlobalErrorBoundary>
    </Router>
  );
}
