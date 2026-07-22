import React, { useState } from 'react';
import { MailCheck, Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { auth } from '../core/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useLang } from '../i18n/language';

// Owner accounts (provisioned with "requires email verification") must verify their
// real email before they can use the app.
const VerifyEmailScreen = ({ email, onSignOut }) => {
  const { L } = useLang();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const resend = async () => {
    setErr(''); setBusy(true);
    try { await sendEmailVerification(auth.currentUser); setSent(true); }
    catch (e) { setErr(e.code === 'auth/too-many-requests' ? L('請求太頻繁，請稍後再試。 (Too many requests, please try again later.)') : (e.message || L('寄送失敗 (Failed to send)'))); }
    finally { setBusy(false); }
  };

  const recheck = async () => {
    setBusy(true);
    try { await auth.currentUser?.reload(); } catch (e) { /* ignore */ }
    window.location.reload(); // re-evaluate emailVerified
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center animate-in zoom-in-95">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-5">
          <MailCheck size={30} className="text-indigo-600" />
        </div>
        <h1 className="text-xl font-black text-slate-800 mb-2">{L('請先驗證您的 Email (Please verify your email first)')}</h1>
        <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
          {L('擁有者帳戶需完成 Email 驗證才能使用系統。我們已寄出驗證連結到 (Owner accounts must verify their email before using the system. We have sent a verification link to)')}
          <span className="block mt-1 font-bold text-slate-700">{email}</span>
          {L('請點擊信中連結，然後按下方按鈕重新整理。 (Click the link in the email, then press the button below to refresh.)')}
        </p>

        {err && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg mb-4 flex items-center border border-red-100 font-bold">
            <AlertCircle size={14} className="mr-2 flex-shrink-0" /> {err}
          </div>
        )}
        {sent && (
          <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg mb-4 flex items-center border border-emerald-100 font-bold">
            <CheckCircle size={14} className="mr-2 flex-shrink-0" /> {L('驗證信已重新寄出。 (Verification email resent.)')}
          </div>
        )}

        <div className="space-y-3">
          <button onClick={recheck} disabled={busy}
            className="w-full bg-indigo-600 hover:opacity-90 text-white font-black py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} {L('我已驗證，重新整理 (I have verified, refresh)')}
          </button>
          <button onClick={resend} disabled={busy}
            className="w-full bg-white text-slate-600 border border-slate-200 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all text-sm">
            {L('重新寄出驗證信 (Resend)')}
          </button>
          {onSignOut && (
            <button onClick={onSignOut} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors pt-2">
              {L('改用其他帳號登入 (Sign in as someone else)')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailScreen;
