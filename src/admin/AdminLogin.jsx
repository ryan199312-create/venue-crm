import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, AlertCircle, Mail, Key } from 'lucide-react';

const AdminLogin = ({ onLogin, error, appSettings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const venueProfile = appSettings?.venueProfile || {};

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password, false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          {/* Background Decorative Element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600 opacity-10 rounded-full -mr-16 -mt-16"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-2xl shadow-xl mb-6 border-4 border-white/10">
              <MapPin size={38} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">{venueProfile.nameZh || 'VowsOS'}</h1>
            <p className="text-indigo-600 font-bold text-xs uppercase tracking-[0.2em] mt-2">{venueProfile.nameEn || 'Venue Management'}</p>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6 flex items-center border border-red-100 font-bold">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email 或電話 (Email or Phone)</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all font-medium"
                  placeholder="name@company.com 或 91234567"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:opacity-90 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
            >
              登入管理系統 (Login)
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
              第一次使用？請先啟用您的帳戶並設定密碼。
              <span className="text-slate-300">First time? Activate your account.</span>
            </p>
            <Link to="/activate" className="inline-block text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors">
              啟用帳戶 (Activate Account) →
            </Link>
          </div>
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