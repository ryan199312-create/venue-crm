import React, { useState } from 'react';
import { MapPin, AlertCircle, Mail, Key } from 'lucide-react';

const AdminLogin = ({ onLogin, error, appSettings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const branding = appSettings?.branding || {};
  const venueProfile = appSettings?.venueProfile || {};

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password, isRegistering);
  };

  const toggleRegister = () => {
    setIsRegistering(!isRegistering);
    // 🌟 Senior Strategy: Clear errors when switching modes to avoid residual "already in use" messages.
    if (onLogin) onLogin(null, null, null, true); // Trigger error clearing in parent
  };

  // 🌟 Senior Strategy: Hide registration if the tenant is already set up.
  // In a SaaS, subsequent users should be invited, not register themselves.
  const showRegisterLink = !appSettings?.isSetupComplete;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          {/* Background Decorative Element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary opacity-10 rounded-full -mr-16 -mt-16"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-primary rounded-2xl shadow-xl mb-6 border-4 border-white/10">
              <MapPin size={38} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">{venueProfile.nameZh || 'VowsOS'}</h1>
            <p className="text-brand-primary font-bold text-xs uppercase tracking-[0.2em] mt-2">{venueProfile.nameEn || 'Venue Management'}</p>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6 flex items-center border border-red-100">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-brand-primary hover:opacity-90 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-brand-primary/25 active:scale-95"
            >
              {isRegistering ? '立即註冊 (Register)' : '登入管理系統 (Login)'}
            </button>
          </form>

          {showRegisterLink && (
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <button 
                onClick={toggleRegister}
                className="text-xs font-bold text-slate-500 hover:text-brand-primary transition-colors"
              >
                {isRegistering ? '已有帳號？返回登入' : '第一次使用？點此註冊新帳號'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="fixed bottom-8 text-center w-full">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Powered by VowsOS</p>
      </div>
    </div>
  );
};

export default AdminLogin;