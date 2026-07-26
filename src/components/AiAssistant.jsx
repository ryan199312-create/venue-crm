import React, { useState } from 'react';
import { X, Mail, MessageCircle, Sparkles, Copy, Check, Loader2, Send, Settings2 } from 'lucide-react';
import { useAI } from '../hooks/useAI';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n/language';

export default function AiAssistant({ formData, setFormData, onClose }) {
  const { appSettings } = useAuth();
  const { L } = useLang();
  const venueProfile = appSettings?.venueProfiles?.[formData?.venueId] || appSettings?.venueProfile || {};
  const { generate, loading: aiLoading } = useAI();
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  
  // ✅ 1. NEW STATE: Track the selected Tone
  const [tone, setTone] = useState("professional");

// --- 1. THE ULTIMATE CONTEXT BUILDER ---
  const getEventContext = () => {
    // A. Financial Math (Safe)
    const totalAmount = Number(formData.totalAmount) || 0;
    let totalPaid = 0;
    if (formData.deposit1Received) totalPaid += Number(formData.deposit1) || 0;
    if (formData.deposit2Received) totalPaid += Number(formData.deposit2) || 0;
    if (formData.deposit3Received) totalPaid += Number(formData.deposit3) || 0;
    if (formData.balanceReceived) totalPaid = totalAmount; 
    const outstandingBalance = totalAmount - totalPaid;

    // B. Menu & Drinks Formatter
    const menuSummary = formData.menus?.map(m => `  - ${m.title} (Qty: ${m.qty})`).join('\n') || "  Standard Menu";
    
    // C. Rundown Formatter
    const rundownSummary = formData.rundown?.length > 0 
      ? formData.rundown.map(r => `  [${r.time}] ${r.activity}`).join('\n') 
      : "  No rundown provided.";

    // D. Bus & Logistics Formatter
    let busSummary = "  No bus arrangement.";
    if (formData.busInfo?.enabled) {
      const arrivals = formData.busInfo.arrivals?.map(b => `  - Arrival [${b.time}]: ${b.location} (Plate: ${b.plate || 'TBC'})`).join('\n') || "";
      const departures = formData.busInfo.departures?.map(b => `  - Departure [${b.time}]: ${b.location} (Plate: ${b.plate || 'TBC'})`).join('\n') || "";
      busSummary = `${arrivals}\n${departures}`.trim();
    }

    // E. Extract Active Checkboxes (AV, Equip, Decor)
    const getActive = (obj) => Object.entries(obj || {}).filter(([_, v]) => v).map(([k]) => k).join(', ') || "None";

    // F. Compile the Master Context String
    return `
      === CORE EVENT INFO ===
      - Order ID: ${formData.orderId || "N/A"}
      - Event Type: ${formData.eventType || "N/A"}
      - Client: ${formData.clientName} (Company: ${formData.companyName || "N/A"})
      - Contact: ${formData.clientPhone || "No Phone"} | Email: ${formData.clientEmail || "No Email"}
      - Date: ${formData.date}
      - Time: ${formData.startTime} to ${formData.endTime} (Serving Time: ${formData.servingTime || "TBC"})
      - Venue: ${formData.venueLocation || venueProfile.nameEn || venueProfile.nameZh || 'the venue'}
      - Attendance: ${formData.tableCount || 0} Tables / ${formData.guestCount || 0} Pax

      === FINANCIALS (HKD) ===
      - Total Estimated Cost: $${totalAmount}
      - Total Paid So Far: $${totalPaid}
      - Outstanding Balance: $${outstandingBalance > 0 ? outstandingBalance : 0}
      - Deposit 1: $${formData.deposit1 || 0} (Due: ${formData.deposit1Date || 'TBC'}) [${formData.deposit1Received ? 'PAID' : 'UNPAID'}]
      - Deposit 2: $${formData.deposit2 || 0} (Due: ${formData.deposit2Date || 'TBC'}) [${formData.deposit2Received ? 'PAID' : 'UNPAID'}]
      - Deposit 3: $${formData.deposit3 || 0} (Due: ${formData.deposit3Date || 'TBC'}) [${formData.deposit3Received ? 'PAID' : 'UNPAID'}]
      - Final Balance Status: [${formData.balanceReceived ? 'PAID' : 'UNPAID'}]

      === FOOD & BEVERAGE ===
      - Serving Style: ${formData.servingStyle}
      - Butler/Hand Carry Service: ${formData.enableHandCarry ? `YES (${formData.handCarryStaffQty || 0} staff)` : "NO"}
      - Menus:\n${menuSummary}
      - Drinks Package: ${formData.drinksPackage || "Standard"}
      - Dietary/Allergies: ${formData.allergies || "None"}
      - Special F&B Requests: ${formData.specialMenuReq || "None"}

      === SETUP & DECORATION ===
      - Table Cloth: ${formData.tableClothColor || "Standard"} | Chair Cover: ${formData.chairCoverColor || "Standard"}
      - Bridal Room: ${formData.bridalRoom ? `YES (${formData.bridalRoomHours || "Whole Event"})` : "NO"}
      - Equipment Required: ${getActive(formData.equipment)} (Sign Text: ${formData.nameSignText || "N/A"})
      - Decorations Required: ${getActive(formData.decoration)}
      - Additional Decor Notes: ${formData.venueDecor || "None"}

      === AUDIO VISUAL (AV) ===
      - AV Requirements: ${getActive(formData.avRequirements)}
      - AV Remarks: ${formData.avNotes || formData.avOther || "None"}

      === LOGISTICS & TRANSPORT ===
      - Parking: ${formData.parkingInfo?.ticketQty || 0} Tickets x ${formData.parkingInfo?.ticketHours || 0} Hrs
      - Registered License Plates: ${formData.parkingInfo?.plates || "None"}
      - Bus Arrangements:\n${busSummary}

      === EVENT RUNDOWN ===
${rundownSummary}

      === MANAGER REMARKS ===
      - ${formData.otherNotes || "None"}
    `;
  };

const handleGenerate = async (channel, intent, customInstruction = null) => {
    if (!formData.clientName) {
      alert(L("請先輸入客戶名稱 (Client Name Missing)"));
      return;
    }

    const context = getEventContext();
    let systemPrompt = "";
    let userPrompt = "";

    // ✅ 1. NEW TONE LOGIC (Added instructions to write naturally)
    let toneInstruction = "";
    if (tone === 'professional') toneInstruction = "Maintain a highly professional, formal, and polite tone.";
    else if (tone === 'friendly') toneInstruction = "Maintain a very friendly, warm, welcoming, and enthusiastic tone.";
    else if (tone === 'apologetic') toneInstruction = "Maintain a deeply apologetic, empathetic, and humble tone.";
    else if (tone === 'urgent') toneInstruction = "Maintain an urgent, clear, and firm tone while remaining polite.";

    const vNameEn = venueProfile.nameEn || appSettings?.venueName || 'the venue';
    const vNameZh = venueProfile.nameZh || vNameEn;
    const vPhone = venueProfile.phone || '';
    const vAddr = venueProfile.address || '';
    const venueIdentity = `You represent ${vNameEn} (${vNameZh}).`
      + (vPhone ? ` Your official contact phone number is ${vPhone}. ALWAYS use ${vPhone} if you ask the client to call or contact you. NEVER use the client's own phone number as the venue's contact number.` : ` NEVER use the client's own phone number as the venue's contact number.`)
      + (vAddr ? ` Your official address is ${vAddr}.` : '');

    if (channel === 'EMAIL') {
      // 🚨 Added: "Write in natural paragraphs. DO NOT just copy and paste the bullet points."
      systemPrompt = `${venueIdentity} Write a formal email in Traditional Chinese (Cantonese context). ${toneInstruction} Write in natural paragraphs. DO NOT just copy and paste the bullet points from the context. Return strictly valid JSON format with keys: 'subject' and 'body'.`;
    } else {
      systemPrompt = `${venueIdentity} Write a short WhatsApp message in Traditional Chinese (Cantonese). Use emojis 🎂🥂. ${toneInstruction} Write in a natural, conversational way. Do not include a subject line.`;
    }

    // Configure Intent
    if (customInstruction) {
      userPrompt = `Context: ${context}\n\nTask: ${customInstruction}`;
    } else {
      if (channel === 'EMAIL') {
        if (intent === 'payment') userPrompt = `Write a payment reminder. Context: ${context}. Highlight the outstanding balance and due dates clearly but politely in paragraph form.`;
        else if (intent === 'summary') userPrompt = `Write a booking confirmation email. Context: ${context}. Summarize the key event details smoothly in paragraphs, not robotic lists. Ask them to confirm.`;
      } else {
        if (intent === 'payment') userPrompt = `Reminder to settle balance for event on ${formData.date}. Context: ${context}`;
        else if (intent === 'summary') userPrompt = `Confirmation message looking forward to event on ${formData.date}. Context: ${context}`;
      }
    }

    // Call AI
    const aiResponse = await generate(
      userPrompt + (channel === 'EMAIL' ? " Output strictly as JSON without markdown wrappers." : ""), 
      systemPrompt
    );

    // ✅ 2. FIXED RESULT HANDLER (Strips out the ```json formatting)
    if (aiResponse) {
      if (channel === 'EMAIL') {
        try {
          // Strip out markdown code blocks (```json and ```) before parsing
          const cleanText = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
          const json = JSON.parse(cleanText);
          
          setFormData(prev => ({ 
            ...prev, 
            emailSubject: json.subject || `${venueProfile.nameZh || venueProfile.nameEn || 'VowsOS'} 活動通知`,
            emailBody: json.body || cleanText 
          }));
        } catch (e) {
          console.error("JSON Parse Error:", e);
          // Fallback: Strip markdown anyway and dump in body
          const cleanTextFallback = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
          setFormData(prev => ({ ...prev, emailBody: cleanTextFallback }));
        }
      } else {
        setFormData(prev => ({ ...prev, whatsappDraft: aiResponse }));
      }
    }
  };

  // Open the client's WhatsApp chat with the draft pre-filled (free wa.me deep link —
  // no paid messaging integration). The staff member sends it from their own WhatsApp.
  const handleOpenWhatsApp = () => {
    let phone = formData.clientPhone?.replace(/[^0-9]/g, '');
    if (phone && phone.length === 8) phone = '852' + phone;

    const message = formData.whatsappDraft;

    if (!phone) return alert(L("錯誤：缺少客戶電話號碼 (Client phone number is missing)"));
    if (!message) return alert(L("錯誤：WhatsApp 訊息內容是空的 (WhatsApp draft is empty)"));

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in print:hidden">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-lg">
              <Sparkles size={20} className="text-white"/>
            </div>
            <div>
              <h3 className="font-bold text-lg">{L('AI 智能助手 (AI Assistant)')}</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {formData.clientName} | {formData.date} | {formData.venueLocation}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col">
          
          {/* ✅ 3. NEW TONE SELECTOR UI */}
          <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 shrink-0">
            <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
              <Settings2 size={16}/>
            </div>
            <label className="text-sm font-bold text-slate-700">{L('選擇語氣 (Tone)')}:</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'professional', label: '專業有禮 (Professional)', color: 'indigo' },
                { id: 'friendly', label: '親切熱情 (Friendly)', color: 'emerald' },
                { id: 'apologetic', label: '誠懇致歉 (Apologetic)', color: 'amber' },
                { id: 'urgent', label: '緊急堅定 (Urgent)', color: 'red' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    tone === t.id 
                      ? `bg-${t.color}-100 text-${t.color}-700 border-${t.color}-300 ring-2 ring-${t.color}-500/20` 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {L(t.label)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
            
            {/* --- LEFT COLUMN: EMAIL --- */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-indigo-800 flex items-center gap-2"><Mail size={18}/> {L('正式電郵 (Email)')}</h4>
                <div className="flex gap-2">
                  <button onClick={() => handleGenerate('EMAIL', 'summary')} disabled={aiLoading} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 border border-indigo-200 font-bold disabled:opacity-50">{L('確認信 (Confirmation)')}</button>
                  <button onClick={() => handleGenerate('EMAIL', 'payment')} disabled={aiLoading} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 border border-indigo-200 font-bold disabled:opacity-50">{L('追數信 (Payment Reminder)')}</button>
                </div>
              </div>
              
              <input type="text" placeholder="Subject..." value={formData.emailSubject || ""} onChange={(e) => setFormData({...formData, emailSubject: e.target.value})} className="w-full text-sm font-bold border-b border-slate-200 px-2 py-2 mb-2 focus:outline-none focus:border-indigo-500 transition-colors"/>
              
              <textarea placeholder="Email content..." value={formData.emailBody || ""} onChange={(e) => setFormData({...formData, emailBody: e.target.value})} className="w-full flex-1 text-sm p-3 bg-indigo-50/20 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed"/>
              
              <div className="mt-3 pt-3 border-t border-slate-100">
                 <button onClick={() => window.open(`mailto:${formData.clientEmail}?subject=${encodeURIComponent(formData.emailSubject)}&body=${encodeURIComponent(formData.emailBody)}`)} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex justify-center items-center gap-2 transition-transform active:scale-[0.98]">
                   <Mail size={16}/> {L('開啟郵件軟體 (Open Mail App)')}
                 </button>
              </div>
            </div>

            {/* --- RIGHT COLUMN: WHATSAPP + CUSTOM AI --- */}
            <div className="flex flex-col gap-4 h-full">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-emerald-700 flex items-center gap-2"><MessageCircle size={18}/> WhatsApp</h4>
                  <div className="flex gap-2">
                    <button onClick={() => handleGenerate('WHATSAPP', 'summary')} disabled={aiLoading} className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full hover:bg-emerald-100 border border-emerald-200 font-bold disabled:opacity-50">{L('活動確認 (Event Confirmation)')}</button>
                    <button onClick={() => handleGenerate('WHATSAPP', 'payment')} disabled={aiLoading} className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full hover:bg-emerald-100 border border-emerald-200 font-bold disabled:opacity-50">{L('溫馨提示 (Friendly Reminder)')}</button>
                  </div>
                </div>
                
                <div className="flex-1 relative">
                  <textarea placeholder="WhatsApp message..." value={formData.whatsappDraft || ""} onChange={(e) => setFormData({...formData, whatsappDraft: e.target.value})} className="w-full h-full text-sm p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all leading-relaxed"/>
                  <button onClick={() => copyToClipboard(formData.whatsappDraft)} className="absolute top-2 right-2 p-1.5 bg-white rounded shadow-sm text-slate-400 hover:text-emerald-600 transition-colors">
                    {copied ? <Check size={14}/> : <Copy size={14}/>}
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={handleOpenWhatsApp}
                    disabled={aiLoading}
                    className="flex-1 py-2 text-white rounded-lg font-bold flex justify-center items-center gap-2 shadow-sm transition-all bg-[#25D366] hover:bg-[#1ebc57] active:scale-[0.98] disabled:opacity-50"
                  >
                     <Send size={16}/>
                     {L("用 WhatsApp 開啟 (Open in WhatsApp)")}
                  </button>
                </div>
              </div>

              {/* --- CUSTOM AI COMMAND CENTER --- */}
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-4 rounded-xl border border-violet-100 shadow-sm shrink-0">
                <label className="text-xs font-bold text-violet-700 mb-2 flex items-center gap-1">
                  <Sparkles size={12}/> {L('自訂 AI 指令 (Custom AI Command)')}
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={customPrompt} 
                    onChange={(e) => setCustomPrompt(e.target.value)} 
                    placeholder={L("寫一封禮貌的道歉信... (e.g. Write a polite apology letter...)")}
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-violet-200 focus:border-violet-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if(e.key === 'Enter' && customPrompt) handleGenerate('WHATSAPP', 'custom', customPrompt);
                    }}
                  />
                  <button 
                    onClick={() => handleGenerate('WHATSAPP', 'custom', customPrompt)} 
                    disabled={!customPrompt || aiLoading}
                    className="bg-violet-600 text-white p-2 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {aiLoading ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 p-2 text-center text-xs text-slate-400 flex justify-between px-6">
           <span>Core: DeepSeek V3</span>
           {aiLoading && <span className="flex items-center gap-2 text-violet-600 font-bold"><Loader2 size={12} className="animate-spin"/> {`${L('AI 正在分析訂單資料 (AI is analyzing order data)')}...`}</span>}
           <span>WhatsApp: wa.me</span>
        </div>
      </div>
    </div>
  );
}