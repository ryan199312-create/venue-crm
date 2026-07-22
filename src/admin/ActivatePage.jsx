import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, ShieldCheck, AlertCircle, AtSign, Eye, EyeOff, MailCheck } from 'lucide-react';
import { auth, functions } from '../core/firebase';
import { httpsCallable } from 'firebase/functions';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getTenantId } from '../core/tenantResolver';
import { detectIdentifierType } from '../core/authIdentity';
import { useLang } from '../i18n/language';

// Public self-activation: a whitelisted person enters their email/phone and sets a
// password to create their login. Phone -> synthetic internal email under the hood.
const ActivatePage = () => {
  const { L } = useLang();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [verifySent, setVerifySent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!identifier.trim()) return setErr(L('請輸入您的 Email 或電話號碼。 (Please enter your email or phone number.)'));
    if (pw.length < 8) return setErr(L('密碼至少需 8 位字元 (Password must be at least 8 characters).'));
    if (pw !== pw2) return setErr(L('兩次輸入的密碼不一致 (Passwords do not match).'));
    setBusy(true);
    try {
      const type = detectIdentifierType(identifier);
      const res = await httpsCallable(functions, 'activateUser')({
        tenantId: getTenantId(), identifier, type, password: pw
      });
      const { authEmail, requiresEmailVerification } = res.data || {};
      await signInWithEmailAndPassword(auth, authEmail, pw);
      if (requiresEmailVerification && auth.currentUser) {
        await sendEmailVerification(auth.currentUser).catch(() => {});
        setVerifySent(true);
        setBusy(false);
        return;
      }
      navigate('/admin');
    } catch (e2) {
      console.error('[Activate] error:', e2);
      setErr(String(e2?.message || L('啟用失敗，請重試。 (Activation failed, please try again.)')).replace(/^FirebaseError:\s*/, ''));
      setBusy(false);
    }
  };

  if (verifySent) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center animate-in zoom-in-95">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-5">
            <MailCheck size={30} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-2">{L('請驗證您的 Email (Please verify your email)')}</h1>
          <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
            {L('我們已寄出驗證信到 (We have sent a verification email to)')} <span className="font-bold text-slate-700">{identifier}</span>。
            {L('請點擊信中連結完成驗證。您現在可以先進入系統。 (Click the link in the email to finish verifying. You can enter the system now.)')}
          </p>
          <button onClick={() => navigate('/admin')} className="w-full bg-indigo-600 hover:opacity-90 text-white font-black py-3.5 rounded-xl transition-all shadow-lg active:scale-95">
            {L('進入系統 (Continue)')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600 opacity-10 rounded-full -mr-16 -mt-16" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl mb-5 border-4 border-white/10">
              <ShieldCheck size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{L('啟用您的帳戶 (Activate your account)')}</h1>
            <p className="text-indigo-300 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">{L('啟用您的帳戶 (Activate your account)')}</p>
          </div>
        </div>

        <div className="p-8">
          <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
            {L('請輸入管理員為您登記的 Email 或電話號碼，並設定您的密碼。 (Enter the email or phone number your administrator registered for you, and set your password.)')}
          </p>

          {err && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-5 flex items-start border border-red-100 font-bold">
              <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{L('Email 或電話 (Email or Phone)')}</label>
              <div className="relative group">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all font-medium"
                  placeholder={L('name@company.com 或 91234567 (name@company.com or 91234567)')} required />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{L('設定密碼 (New Password)')}</label>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)}
                  className="w-full pl-12 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all font-medium"
                  placeholder={L('至少 8 位字元 (At least 8 characters)')} required />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{L('確認密碼 (Confirm)')}</label>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all font-medium"
                  placeholder={L('再次輸入密碼 (Re-enter password)')} required />
              </div>
            </div>

            <button type="submit" disabled={busy}
              className="w-full bg-indigo-600 hover:opacity-90 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={20} /> : L('啟用並進入系統 (Activate)')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <a href="/admin" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
              {L('已經啟用？返回登入 (Already activated? Sign in)')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivatePage;
