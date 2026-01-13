import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  LayoutDashboard, 
  Users, 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Trash2, 
  Edit2, 
  FileText, 
  Utensils, 
  Truck, 
  Monitor, 
  CreditCard, 
  Sparkles, 
  Copy, 
  Loader2, 
  Printer, 
  Shield, 
  Download, 
  LogOut, 
  Lock,
  Mail,
  Key,
  Upload,
  Image as ImageIcon,
  AlertTriangle
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously,
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  serverTimestamp, 
  setDoc, 
  getDoc 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCNJ-TZcqTres8fXcZr3rLaH5x2xLsk3Os",
  authDomain: "event-management-system-9f764.firebaseapp.com",
  projectId: "event-management-system-9f764",
  storageBucket: "event-management-system-9f764.firebasestorage.app",
  messagingSenderId: "281238143424",
  appId: "1:281238143424:web:b463511f0b3c4d68f84825",
  measurementId: "G-WK60NDKPT0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = "my-venue-crm"; 

const apiKey = "AIzaSyArNDvUTl9vADzhIhezHZuveNcnJzaEzSk"; 

// --- Constants & Types ---
const STATUS_COLORS = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  tentative: 'bg-amber-100 text-amber-800 border-amber-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  completed: 'bg-slate-100 text-slate-800 border-slate-200'
};

const EVENT_TYPES = [
  '婚宴 (Wedding)', '公司活動 (Corporate)', '生日派對 (Birthday)', 
  '演唱會 (Concert)', '會議 (Conference)', '私人聚會 (Private Party)', '其他 (Other)'
];

const LOCATIONS = ['大禮堂', '小禮堂', '戶外花園', 'VIP房'];
const SERVING_STYLES = ['位上', '圍餐', '分菜', '自助餐'];
const DRINK_PACKAGES = ['Package A (Basic)', 'Package B (Standard)', 'Package C (Premium)'];

// --- Helpers ---
const formatMoney = (val) => {
  if (!val) return '';
  const clean = val.toString().replace(/,/g, '');
  const number = parseFloat(clean);
  if (isNaN(number)) return '';
  return number.toLocaleString('en-US');
};

const parseMoney = (val) => {
  return val.replace(/,/g, '');
};

async function generateAIContent(prompt) {
  if (!apiKey || apiKey.includes("YOUR_")) {
    return "請先在程式碼中設定 Gemini API Key。";
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "無法生成內容，請稍後再試。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 服務暫時無法使用，請檢查網絡連接或 API Key 設定。";
  }
}

// --- Global UI Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const FormInput = ({ label, name, value, onChange, type = "text", required, className = "", placeholder = "" }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <input
      type={type}
      name={name}
      required={required}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
    />
  </div>
);

// New Money Input Component
const MoneyInput = ({ label, name, value, onChange, required, className = "" }) => {
  const handleChange = (e) => {
    const rawValue = parseMoney(e.target.value);
    // Only allow numbers
    if (rawValue && isNaN(rawValue)) return; 
    onChange({ target: { name, value: rawValue } });
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          type="text"
          name={name}
          required={required}
          value={formatMoney(value)}
          onChange={handleChange}
          placeholder="0"
          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
        />
      </div>
    </div>
  );
};

const FormSelect = ({ label, name, value, onChange, options, required, className = "" }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <select
      name={name}
      required={required}
      value={value || ''}
      onChange={onChange}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const FormTextArea = ({ label, name, value, onChange, rows = 3, className = "", placeholder = "" }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <textarea
      name={name}
      rows={rows}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
    />
  </div>
);

const FormCheckbox = ({ label, name, checked, onChange }) => (
  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
    <input 
      type="checkbox" 
      name={name} 
      checked={checked || false} 
      onChange={onChange}
      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
    />
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

const DepositField = ({ label, prefix, formData, setFormData, onUpload }) => {
  const amountKey = `${prefix}`;
  const dateKey = `${prefix}Date`; // New Date Key
  const receivedKey = `${prefix}Received`;
  const proofKey = `${prefix}Proof`;
  
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAmountChange = (e) => {
     const raw = parseMoney(e.target.value);
     if (raw && isNaN(raw)) return;
     setFormData(prev => ({ ...prev, [amountKey]: raw }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await onUpload(file);
      setFormData(prev => ({ ...prev, [proofKey]: url }));
    } catch (error) {
      alert("上傳失敗: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={formData[receivedKey] || false} 
            onChange={e => setFormData(prev => ({...prev, [receivedKey]: e.target.checked}))}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className={formData[receivedKey] ? "text-emerald-600 font-bold" : "text-slate-400"}>
            {formData[receivedKey] ? "已收款 (Received)" : "未收款"}
          </span>
        </label>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-2">
         {/* Amount */}
         <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              value={formatMoney(formData[amountKey])}
              onChange={handleAmountChange}
              className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              placeholder="金額"
            />
         </div>
         {/* Suggested Date */}
         <div className="relative">
             <input 
               type="date"
               value={formData[dateKey] || ''}
               onChange={e => setFormData(prev => ({...prev, [dateKey]: e.target.value}))}
               className="w-full px-2 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
               title="應付日期 (Due Date)"
             />
         </div>
      </div>

      <div className="flex justify-end">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileSelect}
        />
        
        {formData[proofKey] ? (
           <div className="flex items-center space-x-3 bg-white px-2 py-1 rounded border border-slate-200">
             <a href={formData[proofKey]} target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-600 hover:underline">
               <ImageIcon size={14} className="mr-1"/> 查看收據
             </a>
             <button type="button" onClick={() => { if(window.confirm('移除?')) setFormData(prev => ({...prev, [proofKey]: ''})); }} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
           </div>
        ) : (
           <button 
             type="button"
             onClick={() => fileInputRef.current?.click()}
             disabled={isUploading}
             className="text-xs flex items-center text-slate-500 hover:text-blue-600"
           >
             {isUploading ? <Loader2 size={12} className="animate-spin mr-1"/> : <Upload size={12} className="mr-1"/>}
             上傳收據
           </button>
        )}
      </div>
    </div>
  );
};

const Badge = ({ status }) => {
  const map = { 'confirmed': '已確認', 'tentative': '暫定', 'cancelled': '已取消', 'completed': '已完成' };
  const label = map[status] || status;
  const style = STATUS_COLORS[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 no-print">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
};

const AIResultModal = ({ isOpen, onClose, content, isLoading, title, onApply }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px] p-4 no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center text-blue-700 font-bold">
            <Sparkles size={18} className="mr-2" />
            {title || "AI 助手建議"}
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Loader2 className="animate-spin mb-3 text-blue-600" size={32} />
              <p>Gemini 正在思考中...</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
          )}
        </div>
        {!isLoading && (
          <div className="p-4 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50 rounded-b-xl">
             <button 
              onClick={() => {
                navigator.clipboard.writeText(content);
              }}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <Copy size={16} className="mr-2" /> 複製內容
            </button>
            {onApply && (
              <button 
                onClick={onApply}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                應用到欄位
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PrintableEO = ({ data }) => {
  if (!data) return null;

  const DetailRow = ({ label, value, fullWidth = false }) => (
    <div className={`mb-2 ${fullWidth ? 'w-full' : 'w-1/2 pr-4'} inline-block align-top`}>
      <span className="text-slate-500 text-xs block uppercase tracking-wider">{label}</span>
      <span className="text-slate-900 font-semibold text-sm whitespace-pre-wrap">{value || '-'}</span>
    </div>
  );

  const Section = ({ title, children, className = "" }) => (
    <div className={`mb-6 border-b border-slate-200 pb-4 ${className}`}>
      <h3 className="font-bold text-slate-800 text-lg mb-3 border-l-4 border-slate-800 pl-2">{title}</h3>
      <div className="flex flex-wrap">
        {children}
      </div>
    </div>
  );

  return (
    <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white">
      {/* PAGE 1: 廳面經理單 (FLOOR COPY) */}
      <div className="print-page relative p-8 h-[297mm]">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">活動訂單 (EO)</h1>
            <p className="text-slate-500 mt-1">Venue Management System</p>
          </div>
          <div className="text-right">
             <div className="inline-block bg-slate-900 text-white px-3 py-1 text-sm font-bold rounded mb-1">
               廳面經理保留 (Floor Copy)
             </div>
             <div className="text-2xl font-mono font-bold text-slate-800">{data.orderId}</div>
             <div className="text-sm text-slate-500">列印日期: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Basic Info */}
        <Section title="活動概覽 (Event Info)">
          <DetailRow label="活動名稱" value={data.eventName} />
          <DetailRow label="活動類型" value={data.eventType} />
          <DetailRow label="活動日期" value={data.date} />
          <DetailRow label="時間" value={`${data.startTime} - ${data.endTime}`} />
          <DetailRow label="活動位置" value={data.venueLocation} />
          <DetailRow label="席數/人數" value={`${data.tableCount || 0} 席 / ${data.guestCount || 0} 人`} />
        </Section>

        {/* Client Info */}
        <Section title="客戶資料 (Client)">
           <DetailRow label="客戶姓名" value={data.clientName} />
           <DetailRow label="電話" value={data.clientPhone} />
           <DetailRow label="公司/機構" value={data.companyName} />
           <DetailRow label="銷售負責人" value={data.salesRep} />
        </Section>

        {/* F&B */}
        <Section title="餐飲安排 (F&B)">
          <DetailRow label="菜單 (Text)" value={data.menuType} fullWidth />
          <DetailRow label="上菜方式" value={data.servingStyle} />
          <DetailRow label="酒水安排" value={data.drinksPackage} fullWidth />
          <DetailRow label="席前小食" value={data.preDinnerSnacks} />
          <DetailRow label="員工餐" value={data.staffMeals} />
          <DetailRow label="特殊飲食/過敏" value={data.specialMenuReq + (data.allergies ? `\n過敏: ${data.allergies}` : '')} fullWidth />
        </Section>

        {/* Logistics & AV */}
        <Section title="物流與場地 (Logistics & Venue)">
          <DetailRow label="場地佈置" value={`檯布: ${data.tableClothColor || '-'} / 椅套: ${data.chairCoverColor || '-'}`} fullWidth />
          <DetailRow label="AV 需求" value={
            Object.entries(data.avRequirements || {})
              .filter(([_, v]) => v)
              .map(([k]) => k.replace('ledWallBig', 'LED大').replace('ledWallSmall', 'LED小').replace('projector', '投影機').replace('mics', '無線咪').replace('lighting', '燈光'))
              .join(', ') || '無'
          } fullWidth />
          <DetailRow label="AV 備註" value={data.avNotes} fullWidth />
          <DetailRow label="泊車登記" value={data.parkingPlates} fullWidth />
          <DetailRow label="送貨/備註" value={data.deliveryNotes} fullWidth />
        </Section>
        
        {/* Payment Summary */}
        <Section title="費用摘要 (Billing)" className="border-none">
          <DetailRow label="總費用" value={`$${formatMoney(data.totalAmount)}`} />
          <DetailRow label="付款方式" value={data.paymentMethod} />
          <DetailRow label="訂金紀錄" value={`
            1: $${formatMoney(data.deposit1 || 0)} (${data.deposit1Received ? '已收' : '未收'}) [${data.deposit1Date || '-'}]
            2: $${formatMoney(data.deposit2 || 0)} (${data.deposit2Received ? '已收' : '未收'}) [${data.deposit2Date || '-'}]
            3: $${formatMoney(data.deposit3 || 0)} (${data.deposit3Received ? '已收' : '未收'}) [${data.deposit3Date || '-'}]
          `} fullWidth />
          <DetailRow label="餘額" value={`$${formatMoney(Number(data.totalAmount) - Number(data.deposit1 || 0) - Number(data.deposit2 || 0) - Number(data.deposit3 || 0))}`} />
        </Section>
      </div>

      <div className="break-after-page"></div>

      {/* PAGE 2: 廚房單 (KITCHEN COPY) */}
      <div className="print-page relative p-8 h-[297mm]">
        {/* Header */}
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase">廚房出品單</h1>
            <p className="text-xl font-bold mt-2 text-slate-700">{data.venueLocation}</p>
          </div>
          <div className="text-right">
             <div className="inline-block bg-slate-900 text-white px-4 py-2 text-lg font-bold rounded mb-2">
               KITCHEN COPY
             </div>
             <div className="text-3xl font-mono font-bold">{data.date}</div>
             <div className="text-xl font-bold text-red-600 mt-1">{data.startTime} 開席</div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 bg-slate-100 p-4 rounded-lg border-l-8 border-slate-800">
            <span className="block text-slate-500 text-sm font-bold uppercase">活動名稱</span>
            <span className="block text-2xl font-bold">{data.eventName}</span>
          </div>
          <div className="flex-1 bg-slate-100 p-4 rounded-lg border-l-8 border-blue-600">
            <span className="block text-slate-500 text-sm font-bold uppercase">席數 (Table Count)</span>
            <span className="block text-3xl font-bold text-blue-700">{data.tableCount || '-'} 席</span>
          </div>
          <div className="flex-1 bg-slate-100 p-4 rounded-lg border-l-8 border-orange-500">
            <span className="block text-slate-500 text-sm font-bold uppercase">人數 (Pax)</span>
            <span className="block text-3xl font-bold text-orange-600">{data.guestCount || '-'} 人</span>
          </div>
        </div>

        {/* Menu Details - Large Font for Kitchen */}
        <div className="mb-8 p-6 border-2 border-slate-800 rounded-lg">
          <div className="flex justify-between items-center mb-4 border-b border-slate-300 pb-2">
            <h3 className="text-2xl font-bold">餐單內容 (Menu)</h3>
            <span className="text-xl font-bold bg-slate-200 px-3 py-1 rounded">
              {data.servingStyle}
            </span>
          </div>
          
          <div className="space-y-4">
            <p className="text-lg font-medium whitespace-pre-wrap">{data.menuType || '未輸入餐單'}</p>

             {data.specialMenuReq ? (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                  <span className="text-red-600 font-bold block mb-1">⚠️ 特殊餐單要求 (SPECIAL REQUESTS):</span>
                  <p className="text-lg font-medium whitespace-pre-wrap">{data.specialMenuReq}</p>
                </div>
             ) : null}
             
             {data.allergies && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 animate-pulse-slow mt-4">
                  <span className="text-red-700 font-black text-xl block mb-1">⛔️ 食物過敏 (ALLERGIES):</span>
                  <p className="text-2xl font-bold text-red-800 whitespace-pre-wrap">{data.allergies}</p>
                </div>
             )}
          </div>
        </div>

        <Section title="其他餐飲安排">
           <DetailRow label="席前小食" value={data.preDinnerSnacks} fullWidth />
           <DetailRow label="員工餐" value={data.staffMeals} fullWidth />
           <DetailRow label="送貨/食材備註" value={data.deliveryNotes} fullWidth />
        </Section>
      </div>
    </div>
  );
};

// --- Login Component ---
const LoginView = ({ onLogin, onGuestLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl shadow-lg mb-4">
            <MapPin size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">VenueMgr</h1>
          <p className="text-blue-200 text-sm mt-1">Venue & Event Management System</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6 flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20">
              登入 (Login)
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <button 
              onClick={onGuestLogin}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2 rounded-lg transition-colors text-sm"
            >
              使用訪客身份登入 (Guest Access)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [aiApplyAction, setAiApplyAction] = useState(null);

  // EO Form State
  const initialFormState = {
    orderId: '',
    eventName: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '23:00',
    venueLocation: '大禮堂',
    eventType: '婚宴 (Wedding)',
    status: 'tentative',
    guestCount: '',
    tableCount: '',
    
    clientName: '',
    companyName: '',
    clientPhone: '',
    clientEmail: '',
    secondaryContact: '',
    secondaryPhone: '',
    salesRep: '',
    address: '',

    menuType: '', 
    specialMenuReq: '',
    staffMeals: '',
    drinksPackage: '',
    preDinnerSnacks: '',
    allergies: '',
    servingStyle: '圍餐',
    
    totalAmount: '',
    deposit1: '',
    deposit1Received: false,
    deposit1Proof: '',
    deposit1Date: '', // Due Date
    deposit2: '',
    deposit2Received: false,
    deposit2Proof: '',
    deposit2Date: '',
    deposit3: '',
    deposit3Received: false,
    deposit3Proof: '',
    deposit3Date: '',
    balance: '',
    paymentMethod: '現金',
    discount: '',
    serviceCharge: '10%',
    
    tableClothColor: '',
    chairCoverColor: '',
    stageDecor: '',
    avRequirements: {
      ledWallBig: false,
      ledWallSmall: false,
      projector: false,
      mics: false,
      lighting: false,
    },
    avNotes: '',
    deliveryNotes: '',
    parkingPlates: '', 
    otherNotes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formTab, setFormTab] = useState('basic'); 
  // New State for Drinks Logic
  const [drinkPackageType, setDrinkPackageType] = useState('');

  // --- Auth Logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid);
        const userSnap = await getDoc(userRef);
        
        let profileData = {
          uid: u.uid,
          lastLogin: serverTimestamp(),
          role: 'staff',
          displayName: u.displayName || u.email || `User ${u.uid.slice(0,4)}`,
          email: u.email || 'anonymous'
        };

        if (userSnap.exists()) {
          const existingData = userSnap.data();
          profileData = { ...profileData, role: existingData.role }; 
          if (existingData.role === 'admin') setIsAdmin(true);
        } else {
          await setDoc(userRef, profileData);
        }
        setUserProfile(profileData);
        setAuthError("");
      } else {
        setIsAdmin(false);
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      setAuthLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setAuthError("登入失敗：密碼錯誤或找不到用戶。");
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setAuthLoading(true);
      await signInAnonymously(auth);
    } catch (err) {
      setAuthError("訪客登入失敗。");
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Fetch Events
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(data);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch All Users
  useEffect(() => {
    if (!user || !isAdmin) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(data);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  // --- Handlers ---

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    if (name.startsWith('av_')) {
      const field = name.replace('av_', '');
      setFormData(prev => ({
        ...prev,
        avRequirements: { ...prev.avRequirements, [field]: checked }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle Drink Package Selection
  const handleDrinkTypeChange = (e) => {
    const val = e.target.value;
    setDrinkPackageType(val);
    if (val !== 'Other') {
      setFormData(prev => ({ ...prev, drinksPackage: val }));
    } else {
      setFormData(prev => ({ ...prev, drinksPackage: '' })); // Clear for manual input
    }
  };

  const openNewEventModal = () => {
    setEditingEvent(null);
    const today = new Date();
    const dateStr = today.toISOString().slice(0,10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    
    setFormData({
      ...initialFormState,
      orderId: `EO-${dateStr}-${randomSuffix}`,
      salesRep: userProfile?.displayName || user?.email || '',
      date: today.toISOString().split('T')[0]
    });
    setDrinkPackageType('');
    setFormTab('basic');
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setFormData({ ...initialFormState, ...event }); 
    // Logic to set drink selector
    if (DRINK_PACKAGES.includes(event.drinksPackage)) {
      setDrinkPackageType(event.drinksPackage);
    } else if (event.drinksPackage) {
      setDrinkPackageType('Other');
    } else {
      setDrinkPackageType('');
    }
    setFormTab('basic');
    setIsModalOpen(true);
  };

  const handleUploadProof = async (file) => {
    if (!user) throw new Error("Not logged in");
    const storageRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'events');
    const payload = {
      ...formData,
      totalAmount: Number(formData.totalAmount) || 0,
      updatedAt: serverTimestamp(),
      lastEditor: userProfile?.displayName || user.uid
    };

    try {
      if (editingEvent) {
        await updateDoc(doc(ref, editingEvent.id), payload);
      } else {
        await addDoc(ref, { ...payload, createdAt: serverTimestamp(), creatorId: user.uid });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("儲存失敗: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!user || !window.confirm("確定要刪除此訂單嗎？ (Are you sure?)")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBackup = () => {
    const backupData = {
      system: "VenueMgr CRM",
      exportedAt: new Date().toISOString(),
      exportedBy: userProfile?.displayName,
      events: events,
      users: allUsers
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `venue_crm_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (adminPasscode === "admin888") {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
      await updateDoc(userRef, { role: 'admin' });
      setIsAdmin(true);
      setIsAdminLoginOpen(false);
      alert("管理員登入成功！");
    } else {
      alert("密碼錯誤");
    }
  };

  // --- AI Actions ---
  const handleAIEmailDraft = async () => {
    setAiTitle("AI 郵件助理 (Email Drafter)");
    setAiLoading(true);
    setAiModalOpen(true);
    setAiApplyAction(null); 
    const prompt = `撰寫給客戶的郵件：客戶:${formData.clientName} 活動:${formData.eventName} 時間:${formData.date}`;
    const result = await generateAIContent(prompt);
    setAiContent(result);
    setAiLoading(false);
  };

  const handleAIMenuSuggest = async () => {
    setAiTitle("AI 菜單顧問");
    setAiLoading(true);
    setAiModalOpen(true);
    const prompt = `建議菜單：類型:${formData.eventType} 風格:${formData.servingStyle} 人數:${formData.guestCount} 要求:${formData.specialMenuReq}`;
    const result = await generateAIContent(prompt);
    setAiContent(result);
    setAiLoading(false);
    setAiApplyAction(() => () => {
      setFormData(prev => ({ ...prev, menuType: (prev.menuType ? prev.menuType + "\n\n" : "") + result }));
      setAiModalOpen(false);
    });
  };

  const handleAILogistics = async () => {
    setAiTitle("AI 物流整理");
    setAiLoading(true);
    setAiModalOpen(true);
    const prompt = `整理物流清單：${formData.deliveryNotes} ${formData.otherNotes}`;
    const result = await generateAIContent(prompt);
    setAiContent(result);
    setAiLoading(false);
    setAiApplyAction(() => () => {
      setFormData(prev => ({ ...prev, otherNotes: (prev.otherNotes ? prev.otherNotes + "\n\n" : "") + result }));
      setAiModalOpen(false);
    });
  };

  // --- Computed Stats & Logic ---
  const stats = useMemo(() => {
    const totalRevenue = events.reduce((sum, e) => e.status !== 'cancelled' ? sum + (Number(e.totalAmount) || 0) : sum, 0);
    const confirmedCount = events.filter(e => e.status === 'confirmed').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingCount = events.filter(e => new Date(e.date) >= today && e.status !== 'cancelled').length;
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthRevenue = events
      .filter(e => e.date.startsWith(currentMonthStr) && e.status !== 'cancelled')
      .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
    return { totalRevenue, confirmedCount, upcomingCount, monthRevenue };
  }, [events]);

  const overdueDeposits = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const list = [];
    events.forEach(e => {
      if(e.status === 'cancelled' || e.status === 'completed') return;
      if(e.deposit1 && !e.deposit1Received && e.deposit1Date && e.deposit1Date < today) 
         list.push({ id: e.id, name: e.eventName, type: '訂金 1', date: e.deposit1Date, amount: e.deposit1 });
      if(e.deposit2 && !e.deposit2Received && e.deposit2Date && e.deposit2Date < today) 
         list.push({ id: e.id, name: e.eventName, type: '訂金 2', date: e.deposit2Date, amount: e.deposit2 });
      if(e.deposit3 && !e.deposit3Received && e.deposit3Date && e.deposit3Date < today) 
         list.push({ id: e.id, name: e.eventName, type: '訂金 3', date: e.deposit3Date, amount: e.deposit3 });
    });
    return list;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return events
      .filter(e => new Date(e.date) >= today && e.status !== 'cancelled')
      .slice(0, 5);
  }, [events]);

  // --- Views ---

  const DashboardView = () => (
    <div className="space-y-6 animate-in fade-in">
      {/* Overdue Alerts */}
      {overdueDeposits.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in slide-in-from-top-2">
           <h3 className="text-red-800 font-bold flex items-center mb-3">
             <AlertTriangle size={20} className="mr-2"/> 逾期訂金提醒 (Overdue Payments)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
             {overdueDeposits.map((item, idx) => (
               <div key={idx} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center" onClick={() => openEditModal(events.find(e => e.id === item.id))}>
                 <div>
                   <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                   <div className="text-xs text-red-600 font-medium">{item.type} • 應付: {item.date}</div>
                 </div>
                 <div className="text-red-700 font-bold font-mono">${formatMoney(item.amount)}</div>
               </div>
             ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '總營業額 (Total)', value: `$${formatMoney(stats.totalRevenue)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '即將舉辦 (Upcoming)', value: stats.upcomingCount, icon: CalendarIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '已確認訂單 (Confirmed)', value: stats.confirmedCount, icon: CheckCircle, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: '本月營收 (Month)', value: `$${formatMoney(stats.monthRevenue)}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-5 flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">近期活動日程 (Upcoming Schedule)</h3>
              <button onClick={() => setActiveTab('events')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">查看全部</button>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-500">暫無近期活動</div>
              ) : upcomingEvents.map(event => (
                <div key={event.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer" onClick={() => openEditModal(event)}>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-blue-50 rounded-lg flex flex-col items-center justify-center text-blue-600 border border-blue-100">
                      <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleString('zh-HK', { month: 'short' })}</span>
                      <span className="text-xl font-bold leading-none">{new Date(event.date).getDate()}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{event.eventName || event.title}</h4>
                      <p className="text-sm text-slate-500 flex items-center mt-1">
                        <Clock size={14} className="mr-1" /> {event.startTime} - {event.endTime}
                        <span className="mx-2 text-slate-300">|</span>
                        <MapPin size={14} className="mr-1" /> {event.venueLocation}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge status={event.status} />
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const EventsListView = () => {
    const [filter, setFilter] = useState('');
    const filtered = events.filter(e => 
      (e.eventName || '').toLowerCase().includes(filter.toLowerCase()) || 
      (e.clientName || '').toLowerCase().includes(filter.toLowerCase()) ||
      (e.orderId || '').toLowerCase().includes(filter.toLowerCase())
    );

    return (
      <Card className="animate-in fade-in">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜尋訂單編號、活動名稱或客戶..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button onClick={openNewEventModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium">
            <Plus size={18} className="mr-2" /> 新增訂單 (New EO)
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">活動詳情 (Event)</th>
                <th className="px-6 py-4">客戶 (Client)</th>
                <th className="px-6 py-4">席數/人數 (Pax)</th>
                <th className="px-6 py-4">狀態 (Status)</th>
                <th className="px-6 py-4 text-right">總費用 (Total)</th>
                <th className="px-6 py-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(event => (
                <tr key={event.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{event.eventName}</span>
                      <span className="text-xs text-blue-600 font-mono mt-1">{event.orderId}</span>
                      <div className="text-xs text-slate-500 mt-1 flex items-center">
                        <CalendarIcon size={12} className="mr-1"/> {event.date}
                        <span className="mx-1">•</span>
                        {event.startTime}-{event.endTime}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{event.clientName}</p>
                    <p className="text-xs text-slate-500">{event.clientPhone}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>{event.tableCount ? `${event.tableCount} 席` : '-'}</div>
                    <div className="text-xs text-slate-400">{event.guestCount ? `${event.guestCount} 人` : '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge status={event.status} />
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700">
                    ${formatMoney(event.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => openEditModal(event)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md" title="編輯">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-md" title="刪除">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const CalendarView = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); 
    const monthName = currentDate.toLocaleString('zh-HK', { month: 'long', year: 'numeric' });
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const eventsByDate = useMemo(() => {
      const map = {};
      events.forEach(e => {
        if (e.status === 'cancelled') return;
        if (!map[e.date]) map[e.date] = [];
        map[e.date].push(e);
      });
      return map;
    }, [events]);

    const renderCalendarDays = () => {
      const days = [];
      const totalSlots = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7;
      for (let i = 0; i < totalSlots; i++) {
        const dayNum = i - firstDayOfMonth + 1;
        const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
        let dateKey = isCurrentMonth ? 
          `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}` : null;
        const dayEvents = dateKey ? eventsByDate[dateKey] : [];

        days.push(
          <div key={i} className={`min-h-[100px] border-b border-r border-slate-100 p-2 ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/50'}`}>
            {isCurrentMonth && (
              <>
                <div className="text-sm font-medium mb-1 text-right text-slate-400">{dayNum}</div>
                <div className="space-y-1">
                  {dayEvents?.map(ev => (
                    <button key={ev.id} onClick={() => openEditModal(ev)} className={`w-full text-left text-xs truncate px-1.5 py-1 rounded border-l-2 mb-1 ${
                      ev.status === 'confirmed' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' :
                      'bg-amber-50 border-amber-500 text-amber-700'
                    }`}>
                      {ev.startTime} {ev.eventName}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      }
      return days;
    };

    return (
      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-slate-800">{monthName}</h2>
            <div className="flex space-x-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded"><ChevronLeft size={20}/></button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded"><ChevronRight size={20}/></button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="py-2 text-center text-xs font-bold text-slate-500">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 flex-1 overflow-auto">{renderCalendarDays()}</div>
      </Card>
    );
  };

  const AdminView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-slate-800 text-white p-6 rounded-xl shadow-lg">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><Shield className="mr-2" /> 超級管理員控制台 (Super Admin)</h2>
          <p className="text-slate-300 mt-1">管理系統備份與用戶權限</p>
        </div>
        <button 
          onClick={handleBackup}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold flex items-center shadow-lg transition-all active:scale-95"
        >
          <Download size={20} className="mr-2" /> 系統備份 (Backup Data)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <div className="p-5 border-b border-slate-100 flex items-center space-x-2">
              <Users size={20} className="text-blue-600" />
              <h3 className="font-bold text-slate-800">用戶名冊 (User Directory)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">用戶 (User)</th>
                    <th className="px-6 py-4">角色 (Role)</th>
                    <th className="px-6 py-4">最後登入 (Last Seen)</th>
                    <th className="px-6 py-4 text-center">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {u.displayName?.slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{u.displayName}</p>
                            <p className="text-xs text-slate-500 font-mono">{u.uid?.slice(0,8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                          {u.role || 'Staff'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {u.lastLogin?.seconds ? new Date(u.lastLogin.seconds * 1000).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  // --- Render Logic ---

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500"><Loader2 className="animate-spin mr-2" /> 載入中 (Loading)...</div>;

  if (!user) {
    return <LoginView onLogin={handleLogin} onGuestLogin={handleGuestLogin} error={authError} />;
  }

  return (
    <>
      {/* Main App */}
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex no-print">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col flex-shrink-0 transition-all">
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3 text-white">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50"><MapPin size={20} /></div>
            <span className="text-lg font-bold">VenueMgr</span>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {[
              { id: 'dashboard', label: '儀表板 (Dashboard)', icon: LayoutDashboard },
              { id: 'events', label: '訂單管理 (EOs)', icon: FileText },
              { id: 'calendar', label: '活動日曆 (Calendar)', icon: CalendarIcon },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
            
            {isAdmin && (
              <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mt-6 ${activeTab === 'admin' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-purple-300 hover:bg-slate-800'}`}>
                <Shield size={20} />
                <span>超級管理員</span>
              </button>
            )}
          </nav>
          
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center space-x-3 px-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white border-2 border-slate-600">
                {userProfile?.displayName?.slice(0,2).toUpperCase() || user?.uid?.slice(0,2)}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-medium text-white truncate">{userProfile?.displayName || 'Staff'}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{userProfile?.role || 'User'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
               {!isAdmin && (
                  <button onClick={() => setIsAdminLoginOpen(true)} className="flex items-center justify-center px-2 py-2 text-xs font-medium text-slate-400 bg-slate-800 rounded hover:bg-slate-700 transition-colors" title="管理員登入">
                    <Lock size={14} className="mr-1" /> Admin
                  </button>
               )}
               <button onClick={handleSignOut} className={`flex items-center justify-center px-2 py-2 text-xs font-medium text-white bg-rose-600 rounded hover:bg-rose-700 transition-colors ${isAdmin ? 'col-span-2' : ''}`} title="登出">
                 <LogOut size={14} className="mr-1" /> 登出
               </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen bg-slate-50">
          <header className="md:hidden bg-white border-b p-4 flex justify-between items-center flex-shrink-0 shadow-sm z-20">
            <span className="font-bold text-slate-900 flex items-center"><MapPin size={18} className="mr-2 text-blue-600"/> VenueMgr</span>
            <div className="space-x-4 text-sm font-medium">
              <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'}>Home</button>
              <button onClick={() => setActiveTab('events')} className={activeTab === 'events' ? 'text-blue-600' : 'text-slate-500'}>EOs</button>
              <button onClick={() => setActiveTab('calendar')} className={activeTab === 'calendar' ? 'text-blue-600' : 'text-slate-500'}>Cal</button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'events' && <EventsListView />}
              {activeTab === 'calendar' && <CalendarView />}
              {activeTab === 'admin' && isAdmin && <AdminView />}
            </div>
          </div>
        </main>

        {/* Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? "編輯訂單" : "新增訂單"}>
          <form 
            onSubmit={handleSubmit} 
            className="flex flex-col h-full min-h-[60vh]"
            onKeyDown={(e) => {
               // PREVENT ENTER KEY SUBMISSION GLOBALLY
               if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                 e.preventDefault();
               }
            }}
          >
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 overflow-x-auto no-scrollbar">
              {[
                { id: 'basic', label: '基本資料', icon: FileText },
                { id: 'fnb', label: '餐飲詳情', icon: Utensils },
                { id: 'billing', label: '費用付款', icon: CreditCard },
                { id: 'venue', label: '場地佈置', icon: Monitor },
                { id: 'logistics', label: '物流備註', icon: Truck },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFormTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    formTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-8 space-y-8 bg-slate-50/50 flex-1">
              
              {/* TAB 1: BASIC */}
              {formTab === 'basic' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormInput label="訂單編號 (Order ID)" name="orderId" required value={formData.orderId} onChange={handleInputChange} />
                    <FormSelect label="活動狀態" name="status" options={['tentative', 'confirmed', 'completed', 'cancelled']} value={formData.status} onChange={handleInputChange} />
                    <FormSelect label="活動類型" name="eventType" options={EVENT_TYPES} value={formData.eventType} onChange={handleInputChange} />
                  </div>
                  
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">活動詳情</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="活動名稱" name="eventName" required placeholder="例如：陳李聯婚" value={formData.eventName} onChange={handleInputChange} />
                      <FormSelect label="活動位置" name="venueLocation" options={LOCATIONS} value={formData.venueLocation} onChange={handleInputChange} />
                      <div className="grid grid-cols-3 gap-4">
                        <FormInput label="活動日期" name="date" type="date" required className="col-span-1" value={formData.date} onChange={handleInputChange} />
                        <FormInput label="開始時間" name="startTime" type="time" required className="col-span-1" value={formData.startTime} onChange={handleInputChange} />
                        <FormInput label="結束時間" name="endTime" type="time" required className="col-span-1" value={formData.endTime} onChange={handleInputChange} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormInput label="席數" name="tableCount" placeholder="20" value={formData.tableCount} onChange={handleInputChange} />
                        <FormInput label="人數" name="guestCount" placeholder="240" value={formData.guestCount} onChange={handleInputChange} />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800">聯絡人資訊</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="客戶姓名" name="clientName" required value={formData.clientName} onChange={handleInputChange} />
                      <FormInput label="電話" name="clientPhone" value={formData.clientPhone} onChange={handleInputChange} />
                      <FormInput label="公司" name="companyName" value={formData.companyName} onChange={handleInputChange} />
                      <FormInput label="銷售人員" name="salesRep" value={formData.salesRep} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: F&B */}
              {formTab === 'fnb' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-800">餐單設定</h4>
                      <button type="button" onClick={handleAIMenuSuggest} className="text-xs flex items-center bg-violet-100 text-violet-700 px-2 py-1 rounded-full"><Sparkles size={12} className="mr-1" /> AI 建議</button>
                    </div>
                    <FormTextArea label="菜單內容 (Menu Details)" name="menuType" rows={8} placeholder="請在此輸入詳細菜單..." value={formData.menuType} onChange={handleInputChange} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormSelect label="上菜方式" name="servingStyle" options={SERVING_STYLES} value={formData.servingStyle} onChange={handleInputChange} />
                      {/* Updated Drinks Package Logic */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">酒水安排</label>
                        <select 
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white mb-2"
                          value={drinkPackageType}
                          onChange={handleDrinkTypeChange}
                        >
                          <option value="">請選擇套餐</option>
                          {DRINK_PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                          <option value="Other">其他 (手動輸入)</option>
                        </select>
                        {(drinkPackageType === 'Other' || (drinkPackageType === '' && formData.drinksPackage)) && (
                          <input
                            type="text"
                            name="drinksPackage"
                            value={formData.drinksPackage}
                            onChange={handleInputChange}
                            placeholder="請輸入其他酒水安排..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        )}
                      </div>
                    </div>
                    <FormTextArea label="特殊餐單需求" name="specialMenuReq" value={formData.specialMenuReq} onChange={handleInputChange} />
                    <FormTextArea label="食物過敏 (Allergies)" name="allergies" rows={2} className="bg-red-50 p-2 rounded-lg" value={formData.allergies} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              {/* TAB 3: BILLING */}
              {formTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">費用與訂金</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <MoneyInput label="總費用 (Total)" name="totalAmount" required className="text-lg font-bold" value={formData.totalAmount} onChange={handleInputChange} />
                      <FormSelect label="付款方式" name="paymentMethod" options={['現金', '信用卡', '支票', '轉數快']} value={formData.paymentMethod} onChange={handleInputChange} />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <DepositField label="訂金一 (Deposit 1)" prefix="deposit1" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} />
                      <DepositField label="訂金二 (Deposit 2)" prefix="deposit2" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} />
                      <DepositField label="訂金三 (Deposit 3)" prefix="deposit3" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                      <FormInput label="折扣 (Discount)" name="discount" value={formData.discount} onChange={handleInputChange} />
                      <FormInput label="加一服務費" name="serviceCharge" value={formData.serviceCharge} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: VENUE */}
              {formTab === 'venue' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">場地佈置</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="檯布顏色" name="tableClothColor" value={formData.tableClothColor} onChange={handleInputChange} />
                      <FormInput label="椅套顏色" name="chairCoverColor" value={formData.chairCoverColor} onChange={handleInputChange} />
                    </div>
                    <FormTextArea label="舞台/花藝佈置" name="stageDecor" value={formData.stageDecor} onChange={handleInputChange} />
                  </div>
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800">AV 設備</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <FormCheckbox label="大禮堂 LED" name="av_ledWallBig" checked={formData.avRequirements.ledWallBig} onChange={handleInputChange} />
                      <FormCheckbox label="小禮堂 LED" name="av_ledWallSmall" checked={formData.avRequirements.ledWallSmall} onChange={handleInputChange} />
                      <FormCheckbox label="投影機" name="av_projector" checked={formData.avRequirements.projector} onChange={handleInputChange} />
                      <FormCheckbox label="無線咪" name="av_mics" checked={formData.avRequirements.mics} onChange={handleInputChange} />
                    </div>
                    <FormTextArea label="AV 備註" name="avNotes" value={formData.avNotes} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              {/* TAB 5: LOGISTICS */}
              {formTab === 'logistics' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800">物流與備註</h4>
                    <FormTextArea label="送貨/物資清單" name="deliveryNotes" rows={4} value={formData.deliveryNotes} onChange={handleInputChange} />
                    <FormTextArea label="泊車登記" name="parkingPlates" rows={3} value={formData.parkingPlates} onChange={handleInputChange} />
                    <FormTextArea label="其他備註" name="otherNotes" rows={3} value={formData.otherNotes} onChange={handleInputChange} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center sticky bottom-0 z-10">
              <div className="flex items-center space-x-3">
                 {editingEvent && (
                  <button type="button" onClick={handlePrint} className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium flex items-center border border-slate-200"><Printer size={18} className="mr-2" /> 列印 EO</button>
                 )}
              </div>
              <div className="flex items-center space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">取消</button>
                <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg">儲存訂單</button>
              </div>
            </div>
          </form>
        </Modal>

        {/* Other Modals (AI, Admin) - Same as before */}
        <AIResultModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} isLoading={aiLoading} content={aiContent} title={aiTitle} onApply={aiApplyAction} />
        {isAdminLoginOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                <h3 className="text-xl font-bold mb-4">管理員登入</h3>
                <form onSubmit={handleAdminLogin}>
                  <input type="password" className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-center tracking-widest font-mono" placeholder="••••••••" value={adminPasscode} onChange={e => setAdminPasscode(e.target.value)} autoFocus />
                  <div className="flex justify-end space-x-3">
                     <button type="button" onClick={() => setIsAdminLoginOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                     <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold">登入</button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </div>

      <div className="print-only">
         <PrintableEO data={formData} />
      </div>
    </>
  );
}