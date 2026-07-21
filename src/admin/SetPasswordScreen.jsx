import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { auth, functions } from '../core/firebase';
import { updatePassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

// Shown on first login for an invited user (mustChangePassword). They must replace
// the one-time password with their own before they can use the app.
const SetPasswordScreen = ({ email, onSignOut }) => {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) return setErr('密碼至少需 8 位字元 (min 8 characters).');
    if (pw !== pw2) return setErr('兩次輸入的密碼不一致 (passwords do not match).');
    setBusy(true);
    try {
      await updatePassword(auth.currentUser, pw);
      await httpsCallable(functions, 'completePasswordSetup')({});
      window.location.reload();
    } catch (e2) {
      console.error('[SetPassword] error:', e2);
      if (e2.code === 'auth/requires-recent-login') {
        setErr('基於安全考量，請重新登入後再設定密碼 (please sign out and sign in again, then set your password).');
      } else if (e2.code === 'auth/weak-password') {
        setErr('密碼強度不足 (password too weak).');
      } else {
        setErr(e2.message || '設定失敗，請重試 (something went wrong).');
      }
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600 opacity-10 rounded-full -mr-16 -mt-16" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl mb-5 border-4 border-white/10">
              <ShieldCheck size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">設定您的新密碼</h1>
            <p className="text-indigo-300 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Set your password</p>
          </div>
        </div>

        <div className="p-8">
          <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
            歡迎！為了帳戶安全，請將一次性密碼更換為您自己的密碼。
            {email && <span className="block mt-1 text-xs text-slate-400">帳號 (Account): <span className="font-bold text-slate-600">{email}</span></span>}
          </p>

          {err && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-5 flex items-start border border-red-100 font-bold">
              <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">新密碼 (New Password)</label>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  type={show ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full pl-12 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all font-medium"
                  placeholder="至少 8 位字元"
                  required
                />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">確認密碼 (Confirm)</label>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  type={show ? 'text' : 'password'}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all font-medium"
                  placeholder="再次輸入新密碼"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-indigo-600 hover:opacity-90 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="animate-spin" size={20} /> : '設定密碼並進入系統 (Set & Continue)'}
            </button>
          </form>

          {onSignOut && (
            <div className="mt-5 text-center">
              <button onClick={onSignOut} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                改用其他帳號登入 (Sign in as someone else)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetPasswordScreen;
