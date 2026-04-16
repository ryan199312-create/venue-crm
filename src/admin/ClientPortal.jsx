import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, CreditCard, Utensils, Clock, MapPin, Phone, CheckCircle, ChevronLeft, FileText, Loader2, Download, Upload, LogOut, Sparkles, AlertTriangle, AlertCircle, PenTool, X, ChevronUp, ChevronDown, Save, Plus } from 'lucide-react';
import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { renderToString } from 'react-dom/server';
import DocumentManager from '../components/DocumentManager';
import FloorplanViewer from '../components/FloorplanViewer';

const STYLES = {
  gridBox: "bg-white p-6 rounded-2xl shadow-sm border border-slate-200",
  h3: "text-lg font-bold text-slate-800 mb-4"
};

export default function ClientPortal() {
  const { eventId: urlEventId } = useParams();
  const [eventId, setEventId] = useState(urlEventId);
  const [viewState, setViewState] = useState('LOGIN'); // 'LOGIN', 'SELECT', 'PORTAL'
  const [isLoading, setIsLoading] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [allEvents, setAllEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [eventData, setEventData] = useState(null);
  const [uploadingMilestone, setUploadingMilestone] = useState(null); // Track specific upload
  const [dietaryReq, setDietaryReq] = useState('');
  const [allergies, setAllergies] = useState('');
  const [isSubmittingDietary, setIsSubmittingDietary] = useState(false);
  const [appSettings, setAppSettings] = useState(null);
  
  const [isEditingRundown, setIsEditingRundown] = useState(false);
  const [editedRundown, setEditedRundown] = useState([]);
  const [isSavingRundown, setIsSavingRundown] = useState(false);
  const [showDishSelector, setShowDishSelector] = useState(false);

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
      const fetchedSettings = response.data.appSettings;

      setAllEvents(fetchedEvents);
      if (fetchedSettings) {
        setAppSettings(fetchedSettings);
      }

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
        alert(`驗證失敗 (Verification failed): ${error.message || '找不到符合的活動或電話號碼不正確'}`);
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
    setEditedRundown(ev.rundown || []);
    localStorage.setItem('vms_client_event_id', ev.id);
    setViewState('PORTAL');
  };

  const handleLogout = async () => {
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

    setUploadingMilestone(milestoneLabel);
    const reader = new FileReader();
    
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Str = reader.result.split(',')[1];
        const currentPhone = phoneInput || localStorage.getItem('vms_client_phone') || '';
        
        const uploadApi = httpsCallable(functions, 'uploadClientPaymentProof');
        const safePrefix = milestoneLabel.split(' ')[0]; // e.g. "1st", "2nd"
        const response = await uploadApi({ 
          eventId, 
          phone: currentPhone, 
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
        console.error("Upload Error:", error);
        alert(`上傳失敗 (Upload Failed): ${error.message}`);
      } finally {
        setUploadingMilestone(null);
        target.value = null; // Clear input safely after processing
      }
    };
    reader.onerror = (err) => {
      alert("讀取手機檔案失敗 (Failed to read local file).");
      setUploadingMilestone(null);
      target.value = null;
    };
  };

  // --- DIETARY SUBMIT HANDLER ---
  const handleDietarySubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingDietary(true);
    try {
      const currentPhone = phoneInput || localStorage.getItem('vms_client_phone') || '';
      const updateDietaryApi = httpsCallable(functions, 'updateClientDietaryReq');
      await updateDietaryApi({
        eventId,
        phone: currentPhone,
        specialMenuReq: dietaryReq,
        allergies: allergies
      });
      alert("已成功更新您的餐飲要求 (Dietary requirements updated successfully)!");
      setEventData(prev => ({ ...prev, specialMenuReq: dietaryReq, allergies: allergies }));
    } catch (error) {
      console.error("Failed to update dietary reqs:", error);
      alert(`更新失敗 (Update failed): ${error.message}`);
    } finally {
      setIsSubmittingDietary(false);
    }
  };

  // --- RUNDOWN SUBMIT HANDLER ---
  const handleSaveRundown = async () => {
    setIsSavingRundown(true);
    try {
      const currentPhone = phoneInput || localStorage.getItem('vms_client_phone') || '';
      const api = httpsCallable(functions, 'updateClientRundown');
      // JSON.parse/stringify cleans the array of any React-specific proxy metadata so Firebase doesn't crash (INTERNAL ERROR)
      const cleanRundown = JSON.parse(JSON.stringify(editedRundown));
      await api({ eventId, phone: currentPhone, rundown: cleanRundown });
      setEventData(prev => ({ ...prev, rundown: editedRundown }));
      setIsEditingRundown(false);
      alert("流程更新成功 (Rundown updated successfully)!");
    } catch (error) {
      console.error("Rundown Save Error:", error);
      alert(`更新失敗 (Update failed): ${error.message}`);
    } finally {
      setIsSavingRundown(false);
    }
  };

  // --- SIGNATURE SUBMIT HANDLER ---
  const handleSignatureSubmit = async (docType, base64String) => {
    try {
      const currentPhone = phoneInput || localStorage.getItem('vms_client_phone') || '';
      const signApi = httpsCallable(functions, 'signClientContract');
      await signApi({ eventId, phone: currentPhone, signatureBase64: base64String, docType });
      
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

  // Extract actual document name from Firebase Storage URL
  const getFileNameFromUrl = (url) => {
    try {
      const decoded = decodeURIComponent(url.split('/').pop().split('?')[0]);
      const parts = decoded.split('_');
      if (parts.length > 2) return parts.slice(2).join('_');
      if (parts.length > 1) return parts.slice(1).join('_');
      return decoded;
    } catch(e) { return "Receipt.jpg"; }
  };

  // --- MEMOIZED BILLING DATA ---
  // Prevents heavy recalculations when typing in other tabs
  const billingMetrics = useMemo(() => {
    if (!eventData) return null;
    const total = eventData.totalAmount || 0;
    const remaining = eventData.balanceDue || 0;
    const paid = Math.max(0, total - remaining);
    const progressPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
    
    const dep1 = Number(eventData.deposit1) || 0;
    const dep2 = Number(eventData.deposit2) || 0;
    const dep3 = Number(eventData.deposit3) || 0;
    const expectedFinalBalance = Math.max(0, total - dep1 - dep2 - dep3);
    
    let balanceDueDateDisplay = eventData.date || 'Before Event';
    if (eventData.balanceDueDateType === 'manual' && eventData.balanceDueDateOverride) {
      balanceDueDateDisplay = eventData.balanceDueDateOverride;
    } else if (eventData.balanceDueDateType === '10daysPrior' && eventData.date) {
      const d = new Date(eventData.date); d.setDate(d.getDate() - 10);
      if (!isNaN(d.getTime())) balanceDueDateDisplay = d.toISOString().split('T')[0];
    }

    const milestones = [
      { key: 'deposit1', label: '1st Payment', amount: dep1, date: eventData.deposit1Date, received: eventData.deposit1Received },
      { key: 'deposit2', label: '2nd Payment', amount: dep2, date: eventData.deposit2Date, received: eventData.deposit2Received },
      { key: 'deposit3', label: '3rd Payment', amount: dep3, date: eventData.deposit3Date, received: eventData.deposit3Received },
      { key: 'balance', label: 'Final Balance', amount: expectedFinalBalance, date: balanceDueDateDisplay, received: eventData.balanceReceived }
    ].filter(m => m.amount > 0);

    return { total, remaining, paid, progressPercent, milestones };
  }, [eventData]);

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
    <div className="min-h-screen bg-slate-50 font-sans md:pb-0">
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

      {/* Desktop Navigation Tabs */}
      <div className="hidden md:flex justify-center gap-4 mt-8 px-4 flex-wrap max-w-5xl mx-auto">
        <DesktopTab icon={Calendar} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <DesktopTab icon={CreditCard} label="Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
        <DesktopTab icon={Utensils} label="Menu" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
        <DesktopTab icon={Clock} label="Rundown" active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} />
        <DesktopTab icon={Download} label="Documents" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
      </div>

      {/* Main Content Area based on Tabs */}
      <div className="p-4 max-w-lg md:max-w-5xl mx-auto mt-2 md:mt-4 space-y-6 pb-28 md:pb-12">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`${STYLES.gridBox} flex items-center justify-between`}>
              <div className="flex items-center">
                <div className="bg-[#A57C00]/10 p-3 rounded-full mr-4">
                  <MapPin size={20} className="text-[#A57C00]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Venue</p>
                  <p className="font-bold text-[#A57C00] text-base mb-0.5">璟瓏軒 King Lung Heen</p>
                  <p className="font-bold text-slate-800 text-sm mb-1.5">{eventData.venueLocation}</p>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-xs text-slate-600 font-medium">尖沙咀西九文化區博物館道8號香港故宮文化博物館4樓</p>
                    <p className="text-[10px] text-slate-400">4/F, Hong Kong Palace Museum, 8 Museum Drive, West Kowloon</p>
                  </div>
                </div>
              </div>
              </div>

              <div className={`${STYLES.gridBox} flex items-center justify-between`}>
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
            
            <FloorplanViewer floorplan={eventData.floorplan} selectedLocations={eventData.selectedLocations || [eventData.venueLocation]} />
          </div>
        )}

        {/* TAB 2: BILLING */}
        {activeTab === 'billing' && billingMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="md:col-span-5 space-y-6">
              <div className={`${STYLES.gridBox} text-center h-max`}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Outstanding Balance</p>
                <h3 className="text-4xl font-black text-[#A57C00] font-mono tracking-tight">
                  ${billingMetrics.remaining.toLocaleString()}
                </h3>
                <p className="text-xs text-slate-400 mt-2">Total: ${billingMetrics.total.toLocaleString()}</p>
                
                {/* --- PROGRESS BAR --- */}
                <div className="mt-6 pt-5 border-t border-slate-100 text-left">
                  <div className="flex justify-between text-[10px] font-bold mb-2">
                    <span className="text-emerald-600 uppercase tracking-widest">Paid: ${billingMetrics.paid.toLocaleString()}</span>
                    <span className="text-slate-400 uppercase tracking-widest">{billingMetrics.progressPercent}% Settled</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-out" 
                      style={{ width: `${billingMetrics.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`md:col-span-7 ${STYLES.gridBox}`}>
              <h3 className={STYLES.h3}>Payment Status</h3>
              <div className="space-y-4">
                {billingMetrics.milestones.map((m, idx) => (
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
                        
                            {/* VERIFIED/OFFICIAL PROOFS */}
                            {officialProofs.map((url, idx) => (
                              <div key={`off-${idx}`} className="mt-2 text-[10px] font-bold flex flex-col gap-1.5 bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-200 shadow-sm">
                                <div className="flex items-center justify-between w-full">
                                  <a href={url} target="_blank" rel="noreferrer" className="flex items-center text-emerald-700 max-w-full hover:underline truncate" title={getFileNameFromUrl(url)}>
                                    <CheckCircle size={12} className="mr-1 shrink-0" /> <span className="truncate">{getFileNameFromUrl(url)}</span>
                                  </a>
                                </div>
                              </div>
                            ))}

                            {/* PENDING PROOFS */}
                            {pendingProofs.map((p, idx) => (
                              <div key={`pend-${idx}`} className="mt-2 text-[10px] font-bold flex flex-col gap-1.5 bg-slate-50 py-2 px-3 rounded-lg border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between w-full">
                                  <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center text-slate-600 max-w-full hover:underline truncate" title={p.fileName}>
                                    <Clock size={12} className="mr-1 shrink-0" /> <span className="truncate">{p.fileName}</span>
                                  </a>
                                </div>
                                <div className="pt-1 border-t border-slate-200/60 mt-0.5">
                                  <span className="flex items-start text-slate-500"><Clock size={12} className="mr-1 shrink-0 mt-0.5" /> 已記錄，等待專員核對 (Pending Manual Review)</span>
                                </div>
                              </div>
                            ))}

                            {/* UPLOAD BOX (Only visible if not received) */}
                            {!m.received && (
                              <div className={`mt-2 relative overflow-hidden flex items-center justify-center w-full py-2.5 border-2 border-dashed border-[#A57C00]/50 rounded-lg transition-colors group ${uploadingMilestone === m.label ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#A57C00]/5 hover:border-[#A57C00]'}`}>
                                {uploadingMilestone === m.label ? <Loader2 className="animate-spin text-[#A57C00] mr-2" size={14} /> : <Upload size={14} className="text-[#A57C00] mr-2 group-hover:-translate-y-0.5 transition-transform" />}
                                <span className="text-[10px] font-bold text-[#A57C00] uppercase tracking-widest">{uploadingMilestone === m.label ? 'Uploading...' : 'Upload Proof (上傳紀錄)'}</span>
                                <input type="file" accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, m.label)} disabled={!!uploadingMilestone} title="Upload Proof" />
                              </div>
                            )}
                          </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MENU */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="md:col-span-7 space-y-4">
              {eventData.menus.map(menu => (
                <div key={menu.id} className={STYLES.gridBox}>
                  <h3 className="font-black text-[#A57C00] text-lg mb-4 text-center border-b border-slate-100 pb-3">{menu.title}</h3>
                  <p className="text-sm text-slate-700 leading-loose text-center whitespace-pre-wrap font-serif">
                    {menu.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Dietary Requirements Form */}
            <div className="md:col-span-5">
              <div className={`${STYLES.gridBox} sticky top-6`}>
                <h3 className={STYLES.h3}>Dietary Requirements (特殊餐飲要求)</h3>
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
          </div>
        )}

        {/* TAB 4: RUNDOWN */}
        {activeTab === 'logistics' && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <div className={STYLES.gridBox}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`${STYLES.h3} mb-0 flex items-center gap-2`}><Clock size={16} /> Event Rundown</h3>
                {!isEditingRundown && (
                  <button onClick={() => setIsEditingRundown(true)} className="text-xs bg-[#A57C00]/10 text-[#A57C00] px-3 py-1.5 rounded-lg font-bold flex items-center hover:bg-[#A57C00]/20 transition-colors">
                    <PenTool size={12} className="mr-1"/> 編輯 (Edit)
                  </button>
                )}
              </div>
            
            {isEditingRundown ? (
              <div className="space-y-3">
                {editedRundown.map((item, idx) => (
                   <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col gap-1">
                         <button onClick={() => { if (idx === 0) return; const newR = [...editedRundown]; [newR[idx-1], newR[idx]] = [newR[idx], newR[idx-1]]; setEditedRundown(newR); }} disabled={idx===0} className="text-slate-400 hover:text-[#A57C00] disabled:opacity-30"><ChevronUp size={14}/></button>
                         <button onClick={() => { if (idx === editedRundown.length - 1) return; const newR = [...editedRundown]; [newR[idx+1], newR[idx]] = [newR[idx], newR[idx+1]]; setEditedRundown(newR); }} disabled={idx===editedRundown.length-1} className="text-slate-400 hover:text-[#A57C00] disabled:opacity-30"><ChevronDown size={14}/></button>
                      </div>
                      <input value={item.time} onChange={e => setEditedRundown(prev => prev.map((it, i) => i === idx ? {...it, time: e.target.value} : it))} className="w-16 p-2 border border-slate-200 rounded bg-white text-xs text-center font-mono focus:border-[#A57C00] outline-none" placeholder="18:00" />
                      <input value={item.activity} onChange={e => setEditedRundown(prev => prev.map((it, i) => i === idx ? {...it, activity: e.target.value} : it))} className="flex-1 p-2 border border-slate-200 rounded bg-white text-xs focus:border-[#A57C00] outline-none" placeholder="活動內容 (Activity)" />
                      <button onClick={() => setEditedRundown(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 p-1"><X size={16}/></button>
                   </div>
                ))}
                
                {showDishSelector && (
                  <div className="mt-4 p-3 bg-white border border-[#A57C00]/30 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-2">
                       <span className="text-xs font-bold text-slate-700">點擊加入個別菜單項目 (Tap dish to insert)</span>
                       <button onClick={() => setShowDishSelector(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1 pb-2">
                      {(() => {
                        const addedDishSet = new Set(editedRundown.map(item => item.activity.startsWith('上菜: ') ? item.activity.substring(4) : null).filter(Boolean));
                        
                        const availableDishButtons = eventData.menus?.flatMap((m, mIdx) => {
                           const dishes = m.content ? m.content.split('\n').map(d => d.trim()).filter(d => d.length > 0) : [];
                           return dishes
                             .filter(dish => !addedDishSet.has(dish))
                             .map((dish, dIdx) => (
                                <button key={`${m.id}-${dIdx}`} onClick={() => setEditedRundown(prev => [...prev, { id: Date.now().toString() + Math.random(), time: '', activity: `上菜: ${dish}` }])} className="text-[10px] bg-slate-50 border border-[#A57C00]/20 text-slate-700 px-3 py-2 rounded-lg hover:bg-[#A57C00] hover:text-white transition-colors text-left font-medium">
                                  + {dish}
                                </button>
                             ));
                        });

                        if (!availableDishButtons || availableDishButtons.length === 0) {
                          const hasAnyMenuContent = eventData.menus?.some(m => m.content && m.content.trim().length > 0);
                          return (
                            <span className="text-xs text-slate-400 italic w-full text-center py-2">
                              {!hasAnyMenuContent ? "尚未設定菜單內容 (No menu content available)" : "所有菜式已加入 (All dishes added)"}
                            </span>
                          );
                        }
                        return availableDishButtons;
                      })()}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                   <button onClick={() => setEditedRundown(prev => [...prev, { id: Date.now().toString() + Math.random(), time: '', activity: '' }])} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 transition-colors flex items-center justify-center">
                     <Plus size={14} className="mr-1"/> 新增項目
                   </button>
                   <button onClick={() => setShowDishSelector(!showDishSelector)} className="flex-1 py-2.5 bg-[#A57C00]/10 text-[#A57C00] rounded-lg text-xs font-bold border border-[#A57C00]/20 hover:bg-[#A57C00]/20 transition-colors flex items-center justify-center">
                     <Utensils size={14} className="mr-1"/> 載入個別菜式
                   </button>
                </div>
                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                   <button onClick={() => setIsEditingRundown(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">取消 (Cancel)</button>
                   <button onClick={handleSaveRundown} disabled={isSavingRundown} className="flex-1 py-3 bg-[#A57C00] text-white rounded-xl text-xs font-bold hover:bg-[#8a6800] transition-colors shadow-md flex justify-center items-center">
                      {isSavingRundown ? <Loader2 size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>} 儲存流程
                   </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.1rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {(!eventData.rundown || eventData.rundown.length === 0) && <p className="text-center text-slate-400 italic text-sm">無流程紀錄 (No rundown provided)</p>}
                {(eventData.rundown || []).map((item, index) => (
                  <div key={item.id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
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
            )}
            </div>
          </div>
        )}

        {/* TAB 6: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center px-1"><FileText size={18} className="mr-2 text-[#A57C00]" /> Official Documents</h3>
            
            <div>
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
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-between px-1 p-2 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavButton icon={Calendar} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <NavButton icon={CreditCard} label="Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
        <NavButton icon={Utensils} label="Menu" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
        <NavButton icon={Clock} label="Rundown" active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} />
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

const DesktopTab = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
      active 
        ? 'bg-[#A57C00] text-white shadow-lg shadow-[#A57C00]/20 scale-105' 
        : 'bg-white text-slate-500 hover:bg-[#A57C00]/5 hover:text-[#A57C00] border border-slate-200'
    }`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);