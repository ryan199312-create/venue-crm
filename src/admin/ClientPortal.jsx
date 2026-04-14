import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, CreditCard, Utensils, Clock, MapPin, Phone, CheckCircle, ChevronLeft, FileText, Loader2, Download, Upload, Layout, LogOut, Sparkles, AlertTriangle, AlertCircle, PenTool, X } from 'lucide-react';
import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { renderToString } from 'react-dom/server';
import { TOOL_GROUPS } from '../components/FloorplanEditor';
import DocumentManager from '../components/DocumentManager';

export default function ClientPortal() {
  const { eventId: urlEventId } = useParams();
  const [eventId, setEventId] = useState(urlEventId);
  const [viewState, setViewState] = useState('LOGIN'); // 'LOGIN', 'SELECT', 'PORTAL'
  const [isLoading, setIsLoading] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [allEvents, setAllEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [eventData, setEventData] = useState(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [dietaryReq, setDietaryReq] = useState('');
  const [allergies, setAllergies] = useState('');
  const [isSubmittingDietary, setIsSubmittingDietary] = useState(false);
  const [appSettings, setAppSettings] = useState(null);

  // Fetch appSettings for Floorplan background image and zones (stored in public collection)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "artifacts", "my-venue-crm", "public", "data", "settings", "config"));
        if (snap.exists()) {
          setAppSettings(snap.data());
        }
      } catch (error) {
        console.error("Error fetching public settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // --- AUTO LOGIN CHECK ---
  useEffect(() => {
    const savedPhone = localStorage.getItem('vms_client_phone');
    const savedEventId = localStorage.getItem('vms_client_event_id');
    if (savedPhone && viewState === 'LOGIN') {
      setPhoneInput(savedPhone);
      handleLogin(null, savedPhone, urlEventId || savedEventId);
    }
  }, []);

  const handleLogin = async (e, overridePhone = null, targetEventId = null) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    const phoneToUse = overridePhone || phoneInput;
    const eventToUse = targetEventId || urlEventId;
    
    try {
      if (phoneToUse.replace(/[^0-9]/g, '').length < 8) {
        alert("請輸入有效的電話號碼 (Please enter a valid phone number)");
        setIsLoading(false);
        return;
      }
      
      const verifyAccess = httpsCallable(functions, 'verifyClientAccess');
      const payload = eventToUse ? { eventId: eventToUse, phone: phoneToUse } : { phone: phoneToUse };
      const response = await verifyAccess(payload);
      
      const fetchedEvents = response.data.events;
      setAllEvents(fetchedEvents);

      // Save to localStorage
      localStorage.setItem('vms_client_phone', phoneToUse);
      
      if (fetchedEvents.length === 1 || eventToUse) {
        const ev = fetchedEvents.find(e => e.id === eventToUse) || fetchedEvents[0];
        handleSelectEvent(ev);
      } else {
        setViewState('SELECT');
      }
    } catch (error) {
      console.error("Login failed:", error);
      if (overridePhone) {
        // Clear invalid storage silently on auto-login failure
        localStorage.removeItem('vms_client_phone');
        localStorage.removeItem('vms_client_event_id');
      } else {
        alert("驗證失敗：找不到符合的活動或電話號碼不正確。 (Verification failed)");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEvent = (ev) => {
    setEventData(ev);
    setEventId(ev.id);
    setDietaryReq(ev.specialMenuReq || '');
    setAllergies(ev.allergies || '');
    localStorage.setItem('vms_client_event_id', ev.id);
    setViewState('PORTAL');
  };

  const handleLogout = () => {
    localStorage.removeItem('vms_client_phone');
    localStorage.removeItem('vms_client_event_id');
    setPhoneInput('');
    setEventData(null);
    setAllEvents([]);
    setViewState('LOGIN');
  };

  // --- PAYMENT PROOF UPLOAD HANDLER ---
  const handleFileUpload = (e, milestoneLabel = 'Payment') => {
    const file = e.target.files[0];
    
    if (!file) return;
    const target = e.target; // Save reference to clear AFTER processing

    // Prevent files larger than 5MB to avoid crashing the Cloud Function payload limit (10MB Max)
    if (file.size > 5 * 1024 * 1024) {
      alert("檔案過大 (File too large). 請上傳小於 5MB 的檔案。");
      target.value = null;
      return;
    }

    setIsUploadingProof(true);
    const reader = new FileReader();
    
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Str = reader.result.split(',')[1];
        
        const uploadApi = httpsCallable(functions, 'uploadClientPaymentProof');
        const safePrefix = milestoneLabel.split(' ')[0]; // e.g. "1st", "2nd"
        const response = await uploadApi({ 
          eventId, 
          phone: phoneInput, 
          fileName: `${safePrefix}_${file.name}`,
          fileBase64: base64Str 
        });
        

        // Add to local state so the UI updates immediately with the green badge
        setEventData(prev => ({
          ...prev,
          clientUploadedProofs: [...(prev.clientUploadedProofs || []), {
            url: response.data.url,
            fileName: `${safePrefix}_${file.name}`,
            uploadedAt: new Date().toISOString()
          }]
        }));

        alert("上傳成功 (Upload Successful)! 我們將盡快為您核對付款。");
      } catch (error) {
        alert("上傳失敗 (Upload Failed). 檔案可能過大或網路不穩，請稍後再試。");
      } finally {
        setIsUploadingProof(false);
        target.value = null; // Clear input safely after processing
      }
    };
    reader.onerror = (err) => {
      alert("讀取手機檔案失敗 (Failed to read local file).");
      setIsUploadingProof(false);
      target.value = null;
    };
  };

  // --- DIETARY SUBMIT HANDLER ---
  const handleDietarySubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingDietary(true);
    try {
      const updateDietaryApi = httpsCallable(functions, 'updateClientDietaryReq');
      await updateDietaryApi({
        eventId,
        phone: phoneInput,
        specialMenuReq: dietaryReq,
        allergies: allergies
      });
      alert("已成功更新您的餐飲要求 (Dietary requirements updated successfully)!");
      setEventData(prev => ({ ...prev, specialMenuReq: dietaryReq, allergies: allergies }));
    } catch (error) {
      console.error("Failed to update dietary reqs:", error);
      alert("更新失敗 (Update failed). 請稍後再試。");
    } finally {
      setIsSubmittingDietary(false);
    }
  };

  // --- SIGNATURE SUBMIT HANDLER ---
  const handleSignatureSubmit = async (docType, base64String) => {
    try {
      const signApi = httpsCallable(functions, 'signClientContract');
      await signApi({ eventId, phone: phoneInput, signatureBase64: base64String, docType });
      
      setEventData(prev => ({ 
        ...prev, 
        signatures: {
          ...(prev.signatures || {}),
          [docType]: {
            ...(prev.signatures?.[docType] || {}),
            client: base64String,
            clientDate: new Date().toISOString()
          }
        }
      }));
      alert("合約已成功簽署 (Contract signed successfully)!");
    } catch (error) {
      console.error("Signature failed:", error);
      alert("簽署失敗 (Signature failed). 請稍後再試。");
      throw error;
    }
  };

  // --- LOGIN VIEW ---
  if (viewState === 'LOGIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100 relative overflow-hidden">
          {/* Decorative Gold Header */}
          <div className="absolute top-0 left-0 w-full h-2 bg-[#A57C00]"></div>
          
          <div className="text-center mb-8 mt-4">
            <h1 className="text-3xl font-black text-[#A57C00] tracking-tight mb-1">璟瓏軒</h1>
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">King Lung Heen</h2>
          </div>
          
          <div className="mb-8">
            <p className="text-center text-slate-500 text-sm font-medium mb-6">
              請輸入您的登記電話號碼以查看活動詳情。<br/>
              <span className="text-xs text-slate-400 mt-1 block">Please enter your registered phone number.</span>
            </p>

            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="tel" 
                placeholder="電話號碼 (Phone No.)" 
                className="w-full bg-slate-50 border border-slate-200 py-3 pl-12 pr-4 rounded-xl text-lg font-bold tracking-wider focus:border-[#A57C00] focus:ring-2 focus:ring-[#A57C00]/20 outline-none transition-all"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#A57C00] hover:bg-[#8a6800] text-white py-3.5 rounded-xl font-bold tracking-wide transition-colors flex justify-center items-center shadow-lg shadow-[#A57C00]/20"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : '登入查看 (Access Portal)'}
          </button>
        </form>
      </div>
    );
  }
  
  // --- SELECT EVENT VIEW ---
  if (viewState === 'SELECT') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 font-sans pb-24">
        <div className="max-w-md mx-auto mt-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-[#A57C00] tracking-tight mb-1">璟瓏軒</h1>
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">Select Your Event</h2>
          </div>
          <div className="space-y-4">
            {allEvents.map(ev => (
              <button 
                key={ev.id} 
                onClick={() => handleSelectEvent(ev)}
                className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-left hover:border-[#A57C00] transition-colors group relative overflow-hidden flex flex-col"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#A57C00] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start mb-2 w-full">
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{ev.eventName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ml-2 shrink-0 ${ev.status === 'completed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>{ev.status}</span>
                </div>
                <div className="flex items-center text-sm text-slate-500">
                  <Calendar size={14} className="mr-1.5 text-[#A57C00]" />
                  {ev.date}
                  <MapPin size={14} className="ml-4 mr-1.5 text-[#A57C00]" />
                  {ev.venueLocation}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Hero Banner with Dynamic Back Button */}
      <div className="bg-slate-900 text-white p-6 pt-12 pb-10 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#A57C00 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        <div className="relative z-10 text-center">
          <h2 className="text-[10px] tracking-[0.2em] text-[#A57C00] uppercase font-bold mb-3">Your Event Details</h2>
          <h1 className="text-2xl md:text-3xl font-black mb-2 leading-tight">{eventData.eventName}</h1>
          <div className="flex items-center justify-center text-sm text-slate-300 font-medium bg-white/10 w-max mx-auto px-4 py-1.5 rounded-full backdrop-blur-sm mt-4">
            <Calendar size={14} className="mr-2 text-[#A57C00]" />
            {eventData.date}
          </div>
        </div>
        
        {allEvents.length > 1 && (
          <button onClick={() => setViewState('SELECT')} className="absolute top-4 left-4 bg-white/20 p-2 rounded-full backdrop-blur-md text-white hover:bg-white/30 transition-colors z-20">
            <ChevronLeft size={20} />
          </button>
        )}
        
        <button onClick={handleLogout} className="absolute top-4 right-4 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md text-white hover:bg-white/30 transition-colors z-20 flex items-center gap-1 text-xs font-bold">
          <LogOut size={12} /> 登出
        </button>
      </div>

      {/* Main Content Area based on Tabs */}
      <div className="p-4 max-w-lg mx-auto mt-2 space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-[#A57C00]/10 p-3 rounded-full mr-4">
                  <MapPin size={20} className="text-[#A57C00]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Venue</p>
                  <p className="font-bold text-slate-800 text-sm">{eventData.venueLocation}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-[#A57C00]/10 p-3 rounded-full mr-4">
                  <Clock size={20} className="text-[#A57C00]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Time</p>
                  <p className="font-bold text-slate-800 text-sm">{eventData.startTime} - {eventData.endTime}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BILLING */}
        {activeTab === 'billing' && (() => {
          const total = eventData.totalAmount || 0;
          const remaining = eventData.balanceDue || 0;
          const paid = Math.max(0, total - remaining);
          const progressPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
          
          const dep1 = Number(eventData.deposit1) || 0;
          const dep2 = Number(eventData.deposit2) || 0;
          const dep3 = Number(eventData.deposit3) || 0;
          const expectedFinalBalance = Math.max(0, total - dep1 - dep2 - dep3);

          const milestones = [
            { key: 'deposit1', label: '1st Payment', amount: dep1, date: eventData.deposit1Date, received: eventData.deposit1Received },
            { key: 'deposit2', label: '2nd Payment', amount: dep2, date: eventData.deposit2Date, received: eventData.deposit2Received },
            { key: 'deposit3', label: '3rd Payment', amount: dep3, date: eventData.deposit3Date, received: eventData.deposit3Received },
            { key: 'balance', label: 'Final Balance', amount: expectedFinalBalance, date: 'Before Event', received: eventData.balanceReceived }
          ].filter(m => m.amount > 0);
          
          return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Outstanding Balance</p>
              <h3 className="text-4xl font-black text-[#A57C00] font-mono tracking-tight">
                ${remaining.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 mt-2">Total: ${total.toLocaleString()}</p>
              
              {/* --- PROGRESS BAR --- */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-left">
                <div className="flex justify-between text-[10px] font-bold mb-2">
                  <span className="text-emerald-600 uppercase tracking-widest">Paid: ${paid.toLocaleString()}</span>
                  <span className="text-slate-400 uppercase tracking-widest">{progressPercent}% Settled</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Payment Status</h4>
              <div className="space-y-4">
                {milestones.map((m, idx) => (
                  <div key={idx} className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm font-bold text-slate-700 block">{m.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Due: {m.date || 'TBC'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 font-mono block">${m.amount.toLocaleString()}</span>
                        {m.received ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded mt-1"><CheckCircle size={10} className="mr-1"/> Received</span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mt-1">Pending</span>
                        )}
                      </div>
                    </div>
                    
                    {(() => {
                      const rawProofs = eventData[`${m.key}Proof`];
                      const officialProofs = (Array.isArray(rawProofs) ? rawProofs : (rawProofs ? [rawProofs] : [])).filter(u => u && typeof u === 'string' && u.trim() !== '');
                      
                      const clientProofsForMilestone = (eventData.clientUploadedProofs || []).filter(p => p && p.fileName && p.fileName.startsWith(m.label.split(' ')[0]));
                      const pendingProofs = clientProofsForMilestone.filter(p => !officialProofs.includes(p.url));

                      if (m.received && officialProofs.length === 0 && pendingProofs.length === 0) return null;

                      return (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            
                            {/* UPLOAD BOX (Only visible if not received) */}
                            {!m.received && (
                              <div className={`relative overflow-hidden flex items-center justify-center w-full py-2.5 border-2 border-dashed border-[#A57C00]/50 rounded-lg transition-colors group ${isUploadingProof ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#A57C00]/5 hover:border-[#A57C00]'}`}>
                                {isUploadingProof ? <Loader2 className="animate-spin text-[#A57C00] mr-2" size={14} /> : <Upload size={14} className="text-[#A57C00] mr-2 group-hover:-translate-y-0.5 transition-transform" />}
                                <span className="text-[10px] font-bold text-[#A57C00] uppercase tracking-widest">{isUploadingProof ? 'Uploading...' : 'Upload Proof (上傳紀錄)'}</span>
                                <input type="file" accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, m.label)} disabled={isUploadingProof} title="Upload Proof" />
                              </div>
                            )}
                        
                            {/* VERIFIED/OFFICIAL PROOFS */}
                            {officialProofs.map((url, idx) => (
                              <div key={`off-${idx}`} className="mt-2 text-[10px] font-bold flex flex-col gap-1.5 bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-200 shadow-sm">
                                <div className="flex items-center justify-between w-full">
                                  <span className="flex items-center text-emerald-700"><CheckCircle size={12} className="mr-1" /> 已確認收據 (Official Proof) {officialProofs.length > 1 ? idx + 1 : ''}</span>
                                  <a href={url} download target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200 flex items-center shadow-sm transition-colors">
                                    <Download size={10} className="mr-1"/> 檢視 (View)
                                  </a>
                                </div>
                              </div>
                            ))}

                            {/* PENDING PROOFS */}
                            {pendingProofs.map((p, idx) => (
                              <div key={`pend-${idx}`} className="mt-2 text-[10px] font-bold flex flex-col gap-1.5 bg-slate-50 py-2 px-3 rounded-lg border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between w-full">
                                  <span className="flex items-center text-slate-600"><Clock size={12} className="mr-1" /> 處理中 (Pending Review)</span>
                                  <a href={p.url} download target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center shadow-sm transition-colors">
                                    <Download size={10} className="mr-1"/> 檢視 (View)
                                  </a>
                                </div>
                                <div className="pt-1 border-t border-slate-200/60 mt-0.5">
                                  {p.ocrResult === 'MATCH' ? (
                                    <span className="flex items-start text-emerald-600"><Sparkles size={12} className="mr-1 shrink-0 mt-0.5" /> AI 識別金額相符，待專員最終確認 (Verified by AI)</span>
                                  ) : p.ocrResult === 'MISMATCH' ? (
                                    <span className="flex items-start text-amber-600"><AlertTriangle size={12} className="mr-1 shrink-0 mt-0.5" /> AI 識別金額不符，專員將人手跟進 (Pending Manual Review)</span>
                                  ) : (p.ocrResult === 'UNKNOWN_AMT' || p.ocrResult === 'ERROR') ? (
                                    <span className="flex items-start text-slate-500"><AlertCircle size={12} className="mr-1 shrink-0 mt-0.5" /> 已記錄，等待專員人手確認 (Pending Manual Review)</span>
                                  ) : (
                                    <span className="flex items-start text-blue-600"><Loader2 size={12} className="mr-1 shrink-0 mt-0.5 animate-spin" /> AI 正在核對金額... (AI Verifying...)</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )})()}

        {/* TAB 3: MENU */}
        {activeTab === 'menu' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            {eventData.menus.map(menu => (
              <div key={menu.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-black text-[#A57C00] text-lg mb-4 text-center border-b border-slate-100 pb-3">{menu.title}</h3>
                <p className="text-sm text-slate-700 leading-loose text-center whitespace-pre-wrap font-serif">
                  {menu.content}
                </p>
              </div>
            ))}

            {/* Dietary Requirements Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-4">
              <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">Dietary Requirements (特殊餐飲要求)</h4>
              <p className="text-[10px] text-slate-500 mb-4">Please let us know if any guests have special dietary needs or allergies. (如賓客有任何特殊飲食需求或過敏，請在此填寫。)</p>
              
              <form onSubmit={handleDietarySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Special Requirements (特殊要求 e.g. 3 Vegetarians)</label>
                  <textarea 
                    rows={2} 
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#A57C00]/50 outline-none resize-none bg-slate-50"
                    placeholder="e.g. 3位素食, 1位走青..."
                    value={dietaryReq}
                    onChange={(e) => setDietaryReq(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Allergies (食物過敏)</label>
                  <textarea 
                    rows={2} 
                    className="w-full border border-red-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/50 outline-none resize-none bg-red-50"
                    placeholder="e.g. 1位對花生敏感..."
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={isSubmittingDietary} className="w-full bg-[#1a1a1a] hover:bg-[#333] text-white py-3 rounded-xl font-bold tracking-wide transition-colors flex justify-center items-center text-xs">
                  {isSubmittingDietary ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Submit Requirements (提交要求)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: RUNDOWN */}
        {activeTab === 'logistics' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center"><Clock size={18} className="mr-2 text-[#A57C00]" /> Event Rundown</h4>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.1rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {eventData.rundown.map((item, index) => (
                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-[#A57C00] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
                    <time className="font-mono text-xs font-bold text-[#A57C00] mb-1 block">{item.time}</time>
                    <div className="text-sm font-bold text-slate-700">{item.activity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FLOORPLAN */}
        {activeTab === 'floorplan' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <FloorplanViewer floorplan={eventData.floorplan} selectedLocations={eventData.selectedLocations || [eventData.venueLocation]} />
          </div>
        )}

        {/* TAB 6: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center px-1"><FileText size={18} className="mr-2 text-[#A57C00]" /> Official Documents</h4>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <DocumentManager 
                eventData={eventData} 
                appSettings={appSettings} 
              onSign={handleSignatureSubmit} 
                isClientPortal={true} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-between px-1 p-2 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavButton icon={Calendar} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <NavButton icon={CreditCard} label="Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
        <NavButton icon={Utensils} label="Menu" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
        <NavButton icon={Clock} label="Rundown" active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} />
        <NavButton icon={Layout} label="Floorplan" active={activeTab === 'floorplan'} onClick={() => setActiveTab('floorplan')} />
        <NavButton icon={Download} label="Docs" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
      </div>
    </div>
  );
}

const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${active ? 'text-[#A57C00]' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <Icon size={20} className={`mb-1 transition-transform ${active ? 'scale-110' : ''}`} />
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

// --- FLOORPLAN VIEWER COMPONENT ---
const FloorplanViewer = ({ floorplan, selectedLocations = [] }) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const bgImage = floorplan?.bgImage || '';
  const itemScale = floorplan?.itemScale || 40;
  const zones = floorplan?.zones || [];
  const elements = floorplan?.elements || [];
  
  if (!bgImage && elements.length === 0 && zones.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-4 text-center">
        <Layout size={32} className="mx-auto text-slate-300 mb-3" />
        <h4 className="font-bold text-slate-700">尚未設定平面圖</h4>
        <p className="text-xs text-slate-500 mt-1">Floorplan is not yet configured for this event.</p>
      </div>
    );
  }
  
  const isWholeVenue = selectedLocations.includes('全場');
  const visibleZones = zones.filter(z => isWholeVenue || selectedLocations.some(l => l && typeof l === 'string' && l.includes(z.name)));

  // Max boundaries to ensure scrolling works properly
  const maxRight = elements.length > 0 ? Math.max(1000, ...elements.map(el => (el.x || 0) + ((el.w_m || (el.w ? el.w / 40 : 1)) * itemScale))) : 1000;
  const maxBottom = elements.length > 0 ? Math.max(700, ...elements.map(el => (el.y || 0) + ((el.h_m || (el.h ? el.h / 40 : 1)) * itemScale))) : 700;

  const contentW = maxRight + 100;
  const contentH = maxBottom + 100;

  // Resize observer to scale map dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const scaleW = width / contentW;
        const scaleH = height / contentH;
        setScale(Math.min(scaleW, scaleH, 1));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [contentW, contentH]);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mt-4">
      <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center">
        <Layout size={18} className="mr-2 text-[#A57C00]" /> Venue Floorplan (場地平面圖)
      </h4>
      
      <div ref={containerRef} className="w-full h-[60vh] min-h-[400px] bg-slate-50 border-2 border-slate-200 rounded-xl relative shadow-inner overflow-hidden flex items-center justify-center">
        <div 
          className="relative origin-center transition-transform" 
          style={{ 
            transform: `scale(${scale})`,
            width: `${contentW}px`, 
            height: `${contentH}px`,
            backgroundImage: bgImage ? `linear-gradient(to right, rgba(226, 232, 240, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(226, 232, 240, 0.4) 1px, transparent 1px), url("${bgImage}")` : 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
            backgroundSize: bgImage ? `${itemScale}px ${itemScale}px, ${itemScale}px ${itemScale}px, auto` : `${itemScale}px ${itemScale}px`,
            backgroundPosition: 'top left',
            backgroundRepeat: bgImage ? 'repeat, repeat, no-repeat' : 'repeat'
          }}
        >
          {/* Render Zones */}
          {visibleZones.length > 0 && (
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
               {visibleZones.map(z => {
                  const points = z.points.map(p => `${p.x_m * itemScale},${p.y_m * itemScale}`).join(' ');
                  const cx = ((Math.min(...z.points.map(p => p.x_m)) + Math.max(...z.points.map(p => p.x_m))) / 2) * itemScale;
                  const cy = ((Math.min(...z.points.map(p => p.y_m)) + Math.max(...z.points.map(p => p.y_m))) / 2) * itemScale;
                  return (
                    <g key={z.id}>
                      <polygon points={points} fill={z.color} stroke={z.color.replace(/0\.\d+\)/, '0.8)')} strokeWidth="2" strokeDasharray="4 4" />
                      <text x={cx} y={cy} fill={z.color.replace(/0\.\d+\)/, '1.0)')} fontSize={Math.max(14, itemScale * 0.8)} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" style={{textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff'}} opacity="0.8">{z.name}</text>
                    </g>
                  );
               })}
             </svg>
          )}

          {/* Render Elements */}
          {elements.map(el => {
            const w_m = el.w_m || (el.w ? el.w / 40 : 1);
            const h_m = el.h_m || (el.h ? el.h / 40 : 1);
            
            const toolDef = typeof TOOL_GROUPS !== 'undefined' ? TOOL_GROUPS.flatMap(g => g.items).find(t => t.type === el.type) : null;
            const displayStyle = toolDef && el.type !== 'text' ? toolDef.style : el.style || '';
            const displayContent = toolDef && el.type !== 'text' ? toolDef.content : el.content;

            return (
              <div
                key={el.id}
                className={`absolute flex items-center justify-center transition-all ${displayStyle}`}
                style={{ left: el.x || 0, top: el.y || 0, width: w_m * itemScale, height: h_m * itemScale, transform: `rotate(${el.rotation || 0}deg)` }}
              >
                {el.type === 'text' ? (
                  <div className="w-full h-full flex items-center justify-center overflow-visible">
                    <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{el.label || ''}</span>
                  </div>
                ) : (
                  displayContent
                )}
                {el.label && el.type !== 'text' && (
                  <div 
                    className="absolute left-1/2 bottom-0 pointer-events-none"
                    style={{ transform: `translate(-50%, 120%) rotate(${-(el.rotation || 0)}deg)` }}
                  >
                    <span className="bg-white/90 backdrop-blur-sm text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded shadow-sm text-[10px] font-black whitespace-nowrap inline-block">
                      {el.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};