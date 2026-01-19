import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  LayoutDashboard,
  Plus, 
  Search, 
  MapPin, 
  DollarSign, 
  AlertCircle, 
  X, 
  Trash2, 
  Edit2, 
  FileText, 
  Utensils, 
  Truck, 
  Monitor, 
  CreditCard, 
  Loader2, 
  Printer, 
  LogOut, 
  Mail, 
  Key, 
  Upload, 
  Image as ImageIcon, 
  AlertTriangle, 
  Settings, 
  Save, 
  Info, 
  Coffee,
  Bell,
  CheckCircle,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  signInWithCustomToken, 
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

// ==========================================
// SECTION 1: CONFIGURATION & CONSTANTS
// ==========================================

const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined') {
    return JSON.parse(__firebase_config);
  }
  return {
    apiKey: "AIzaSyCNJ-TZcqTres8fXcZr3rLaH5x2xLsk3Os",
    authDomain: "event-management-system-9f764.firebaseapp.com",
    projectId: "event-management-system-9f764",
    storageBucket: "event-management-system-9f764.firebasestorage.app",
    messagingSenderId: "281238143424",
    appId: "1:281238143424:web:b463511f0b3c4d68f84825",
    measurementId: "G-WK60NDKPT0"
  };
};

const app = initializeApp(getFirebaseConfig());
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : "my-venue-crm"; 

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

const INDIVIDUAL_ZONES = ['紅區', '黃區', '綠區', '藍區'];
const LOCATION_CHECKBOXES = [...INDIVIDUAL_ZONES, '全場'];
const SERVING_STYLES = ['位上', '圍餐', '分菜', '自助餐'];
const DEFAULT_DRINK_PACKAGES = []; // Default packages removed as requested
const DECOR_COLORS = ['白 (White)', '金 (Gold)'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS = { Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六', Sun: '日' };

// ==========================================
// SECTION 2: HELPER FUNCTIONS
// ==========================================

const formatMoney = (val) => {
  if (!val) return '0';
  const clean = val.toString().replace(/,/g, '');
  const number = parseFloat(clean);
  if (isNaN(number)) return '0';
  return number.toLocaleString('en-US');
};

const parseMoney = (val) => {
  return val.replace(/,/g, '');
};

const calculateTotalAmount = (data) => {
    const tables = parseFloat(data.tableCount) || 0;
    const guests = parseFloat(data.guestCount) || 0;

    let m = parseFloat(data.menuPrice) || 0;
    if (data.menuPriceType === 'perTable') m = m * tables;
    if (data.menuPriceType === 'perPerson') m = m * guests; 

    let d = parseFloat(data.drinksPrice) || 0;
    if (data.drinksPriceType === 'perTable') d = d * tables;
    if (data.drinksPriceType === 'perPerson') d = d * guests; 

    const base = m + d;
    let sc = 0;
    const scStr = (data.serviceCharge || '').toString();
    if (scStr.includes('%')) {
        const pct = parseFloat(scStr) || 0;
        sc = base * (pct / 100);
    } else {
        sc = parseFloat(scStr) || 0;
    }
    const disc = parseFloat(data.discount) || 0;
    return Math.round(base + sc - disc);
};

// ==========================================
// SECTION 3: BASIC UI COMPONENTS
// ==========================================

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'error' ? 'bg-red-500' : 'bg-slate-800';

  return (
    <div className={`fixed bottom-4 right-4 ${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-[100] animate-in slide-in-from-right-10 fade-in`}>
      <span>{message}</span>
      <button onClick={onClose} className="hover:opacity-75"><X size={14} /></button>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">確認</button>
        </div>
      </div>
    </div>
  );
};

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

const MoneyInput = ({ label, name, value, onChange, required, className = "" }) => {
  const handleChange = (e) => {
    const rawValue = parseMoney(e.target.value);
    if (rawValue && isNaN(rawValue)) return; 
    onChange({ target: { name, value: rawValue } });
  };
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
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
      <option value="">請選擇 (Please Select)</option>
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

// ==========================================
// SECTION 4: COMPLEX COMPONENTS
// ==========================================

const LocationSelector = ({ formData, setFormData, className = "" }) => {
  const selectedLocs = formData.selectedLocations || [];

  const handleCheckboxChange = (loc) => {
    let newLocs = [...selectedLocs];
    
    if (loc === '全場') {
      if (newLocs.includes('全場')) {
        newLocs = newLocs.filter(l => l !== '全場' && !INDIVIDUAL_ZONES.includes(l));
      } else {
        newLocs = Array.from(new Set([...newLocs, '全場', ...INDIVIDUAL_ZONES]));
      }
    } else {
      if (newLocs.includes(loc)) {
        newLocs = newLocs.filter(l => l !== loc);
        newLocs = newLocs.filter(l => l !== '全場');
      } else {
        newLocs.push(loc);
        const allSelected = INDIVIDUAL_ZONES.every(z => newLocs.includes(z));
        if (allSelected && !newLocs.includes('全場')) {
          newLocs.push('全場');
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      selectedLocations: newLocs,
      venueLocation: newLocs.join(', ') + (prev.locationOther ? `, ${prev.locationOther}` : '')
    }));
  };

  const handleOtherChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      locationOther: val,
      venueLocation: prev.selectedLocations.join(', ') + (val ? `, ${val}` : '')
    }));
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-2">活動位置 (Venue Location)</label>
      <div className="flex flex-wrap gap-3 mb-2">
        {LOCATION_CHECKBOXES.map(loc => (
          <label key={loc} className={`flex items-center space-x-2 px-3 py-2 rounded border cursor-pointer transition-colors ${selectedLocs.includes(loc) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
            <input 
              type="checkbox" 
              checked={selectedLocs.includes(loc)} 
              onChange={() => handleCheckboxChange(loc)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${selectedLocs.includes(loc) ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>{loc}</span>
          </label>
        ))}
      </div>
      <input 
        type="text" 
        placeholder="其他位置 (Other)" 
        value={formData.locationOther || ''}
        onChange={handleOtherChange}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
      />
    </div>
  );
};

const DepositField = ({ label, prefix, formData, setFormData, onUpload, addToast, onRemoveProof }) => {
  const amountKey = `${prefix}`;
  const dateKey = `${prefix}Date`;
  const receivedKey = `${prefix}Received`;
  const proofKey = `${prefix}Proof`;
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const isOverdue = formData[amountKey] && !formData[receivedKey] && formData[dateKey] && new Date(formData[dateKey]) < new Date().setHours(0,0,0,0);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await onUpload(file);
      setFormData(prev => ({ ...prev, [proofKey]: url }));
      addToast("收據上傳成功", "success");
    } catch (error) {
      addToast("上傳失敗: " + error.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all ${isOverdue ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-bold text-slate-700 flex items-center">
          {label}
          {isOverdue && <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">OVERDUE</span>}
        </label>
        <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={formData[receivedKey] || false} 
            onChange={e => setFormData(prev => ({...prev, [receivedKey]: e.target.checked}))}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className={formData[receivedKey] ? "text-emerald-600 font-bold" : "text-slate-500"}>
            {formData[receivedKey] ? "已收款" : "未收款"}
          </span>
        </label>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
         <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              value={formatMoney(formData[amountKey])}
              onChange={e => {
                const val = parseMoney(e.target.value);
                if(!isNaN(val)) setFormData(prev => ({ ...prev, [amountKey]: val }));
              }}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-white"
              placeholder="0.00"
            />
         </div>
         <input 
           type="date"
           value={formData[dateKey] || ''}
           onChange={e => setFormData(prev => ({...prev, [dateKey]: e.target.value}))}
           className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
         />
      </div>

      <div className="flex justify-end items-center border-t border-slate-200/50 pt-2">
        <div className="flex items-center">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          {formData[proofKey] ? (
             <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
               <a href={formData[proofKey]} target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-600 hover:underline">
                 <ImageIcon size={14} className="mr-1"/> 收據
               </a>
               <button 
                 type="button" 
                 onClick={() => onRemoveProof(proofKey)} 
                 className="text-slate-400 hover:text-red-500"
                >
                 <X size={14}/>
               </button>
             </div>
          ) : (
             <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-xs flex items-center text-slate-500 hover:text-blue-600 bg-white px-2 py-1 rounded border border-transparent hover:border-slate-200 transition-all">
               {isUploading ? <Loader2 size={12} className="animate-spin mr-1"/> : <Upload size={12} className="mr-1"/>} 上傳收據
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SECTION 5: PRINTABLE VIEWS
// ==========================================

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

  const renderCheckList = (obj, labelMap) => {
    if (!obj) return '無';
    const checked = Object.entries(obj)
      .filter(([k, v]) => v)
      .map(([k]) => labelMap[k] || k);
    return checked.length > 0 ? checked.join(', ') : '無';
  };

  const equipmentMap = { podium: '講台', mic: '咪', micStand: '咪架', cake: '蛋糕', nameSign: '禮堂字牌' };
  const decorationMap = { ceremonyService: '證婚服務', ceremonyChairs: '證婚椅子', flowerPillars: '花柱佈置', guestBook: '簽名冊', easel: '畫架', mahjong: '麻雀枱', invites: '喜帖', wreaths: '花圈' };
  const avMap = { 
    ledBig: '大禮堂LED', projBig: '大禮堂Projector', ledSmall: '小禮堂LED', projSmall: '小禮堂Projector',
    spotlight: '聚光燈', movingHead: '電腦燈', entranceLight: '進場燈', tv60v: '60寸電視(直)', tv60h: '60寸電視(橫)',
    mic: '咪', speaker: '喇叭'
  };

  return (
    <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white">
      <style>
        {`
          @media print {
            body, html { height: auto !important; overflow: visible !important; }
            .no-print, aside, nav, button, .modal-overlay { display: none !important; }
            .print-only { 
              display: block !important; 
              position: absolute; 
              top: 0; 
              left: 0; 
              width: 100%; 
              height: auto !important; 
              min-height: 100%; 
              z-index: 9999; 
              background: white; 
            }
            @page { margin: 0; size: auto; }
            .break-after-page { page-break-after: always; break-after: page; display: block; height: 1px; width: 100%; margin: 0; }
            .print-page { page-break-inside: avoid; min-height: 290mm; padding-bottom: 20px; }
          }
        `}
      </style>

      {/* PAGE 1: 廳面經理單 (FLOOR COPY) */}
      <div className="print-page relative p-8">
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

        <Section title="活動概覽 (Event Info)">
          <DetailRow label="活動名稱" value={data.eventName} />
          <DetailRow label="活動類型" value={data.eventType} />
          <DetailRow label="活動日期" value={data.date} />
          <DetailRow label="時間" value={`${data.startTime} - ${data.endTime}`} />
          <DetailRow label="活動位置" value={data.venueLocation || '-'} fullWidth />
          <DetailRow label="席數/人數" value={`${data.tableCount || 0} 席 / ${data.guestCount || 0} 人`} />
        </Section>

        <Section title="客戶資料 (Client)">
           <DetailRow label="客戶姓名" value={data.clientName} />
           <DetailRow label="電話" value={data.clientPhone} />
           <DetailRow label="公司/機構" value={data.companyName} />
           <DetailRow label="銷售負責人" value={data.salesRep} />
        </Section>

        <Section title="餐飲安排 (F&B)">
          <div className="w-full mb-3">
            <span className="text-slate-500 text-xs block uppercase tracking-wider mb-1">餐單內容 (Menu)</span>
            {data.menus && data.menus.length > 0 ? (
              data.menus.map((menu, idx) => (
                <div key={menu.id || idx} className="mb-4 pl-2 border-l-2 border-slate-300">
                  {menu.title && <h4 className="font-bold underline mb-1 text-sm">{menu.title}</h4>}
                  <p className="text-slate-900 font-semibold text-sm whitespace-pre-wrap">{menu.content}</p>
                </div>
              ))
            ) : (
              <span className="text-slate-900 font-semibold text-sm whitespace-pre-wrap">{data.menuType || '未輸入餐單'}</span>
            )}
          </div>
          
          <DetailRow label="上菜方式" value={data.servingStyle} />
          <DetailRow label="酒水安排" value={data.drinksPackage} fullWidth />
          <DetailRow label="席前小食" value={data.preDinnerSnacks} />
          <DetailRow label="員工餐" value={data.staffMeals} />
          <DetailRow label="特殊飲食/過敏" value={data.specialMenuReq + (data.allergies ? `\n過敏: ${data.allergies}` : '')} fullWidth />
        </Section>

        <Section title="物流與場地 (Logistics & Venue)">
          <div className="w-full mb-3 flex flex-wrap gap-4 p-2 bg-slate-50 rounded border border-slate-100">
             <div className="w-full font-bold text-slate-700 text-sm border-b border-slate-200 pb-1 mb-2">場地佈置 (Decor)</div>
             <DetailRow label="檯布顏色" value={data.tableClothColor} />
             <DetailRow label="椅套顏色" value={data.chairCoverColor} />
             <DetailRow label="主家席" value={data.headTableColorType === 'custom' ? `自訂: ${data.headTableCustomColor}` : '同客席 (Same as Guest)'} fullWidth/>
          </div>

          <div className="w-full mb-3 p-2 bg-pink-50 rounded border border-pink-100">
             <DetailRow label="新娘房 / 更衣室" value={data.bridalRoom ? `✅ 需要 (Need)` : '❌ 不需要'} />
             {data.bridalRoom && <DetailRow label="使用時間" value={data.bridalRoomHours || '未定'} fullWidth />}
          </div>

          <DetailRow label="一般物資" value={renderCheckList(data.equipment, equipmentMap)} fullWidth />
          
          <DetailRow label="佈置" value={
            `${renderCheckList(data.decoration, decorationMap)} 
             ${data.decoration?.ceremonyChairs ? `(證婚椅: ${data.decorationChairsQty || 0}張)` : ''} 
             ${data.decorationOther ? `[其他: ${data.decorationOther}]` : ''}`
          } fullWidth />

          <DetailRow label="AV 設備" value={
            `${renderCheckList(data.avRequirements, avMap)}
             ${data.avOther ? `[其他: ${data.avOther}]` : ''}`
          } fullWidth />
          
          <DetailRow label="AV 備註" value={data.avNotes} fullWidth />
          <DetailRow label="泊車登記" value={data.parkingPlates} fullWidth />
          <DetailRow label="送貨/備註" value={data.deliveryNotes} fullWidth />
        </Section>
        
        <Section title="費用摘要 (Billing)" className="border-none">
          <DetailRow label="總費用" value={`$${formatMoney(data.totalAmount)}`} />
          <DetailRow label="付款方式" value={data.paymentMethod} />
          <DetailRow label="訂金紀錄" value={`
            1: $${formatMoney(data.deposit1 || 0)} (${data.deposit1Received ? '已收' : '未收'}) [${data.deposit1Date || '-'}]
            2: $${formatMoney(data.deposit2 || 0)} (${data.deposit2Received ? '已收' : '未收'}) [${data.deposit2Date || '-'}]
            3: $${formatMoney(data.deposit3 || 0)} (${data.deposit3Received ? '已收' : '未收'}) [${data.deposit3Date || '-'}]
          `} fullWidth />
          <DetailRow label="餘額" value={`$${formatMoney(Number(data.totalAmount) - Number(data.deposit1 || 0) - Number(data.deposit2 || 0) - Number(data.deposit3 || 0))}`} />
          <DetailRow label="尾數付款期" value={data.balanceDueDateType === '10daysPrior' ? '10 日前 (10 Days Prior)' : '宴會當日 (Event Day)'} />
        </Section>
      </div>

      <div className="break-after-page"></div>

      {/* PAGE 2: 廚房單 (KITCHEN COPY) */}
      <div className="print-page relative p-8">
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase">廚房出品單</h1>
            <p className="text-xl font-bold mt-2 text-slate-700">{data.venueLocation || '未定位置'}</p>
          </div>
          <div className="text-right">
             <div className="inline-block bg-slate-900 text-white px-4 py-2 text-lg font-bold rounded mb-2">
               KITCHEN COPY
             </div>
             <div className="text-3xl font-mono font-bold">{data.date}</div>
             <div className="text-xl font-bold text-red-600 mt-1">{data.startTime} 開席</div>
          </div>
        </div>

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

        <div className="mb-8 p-6 border-2 border-slate-800 rounded-lg">
          <div className="flex justify-between items-center mb-4 border-b border-slate-300 pb-2">
            <h3 className="text-2xl font-bold">餐單內容 (Menu)</h3>
            <span className="text-xl font-bold bg-slate-200 px-3 py-1 rounded">
              {data.servingStyle}
            </span>
          </div>
          
          <div className="space-y-4">
            {data.menus && data.menus.length > 0 ? (
              data.menus.map((menu, idx) => (
                <div key={menu.id || idx} className="mb-6">
                  {menu.title && <h4 className="text-xl font-bold underline mb-2">{menu.title}</h4>}
                  <p className="text-lg font-medium whitespace-pre-wrap">{menu.content}</p>
                </div>
              ))
            ) : (
              <p className="text-lg font-medium whitespace-pre-wrap">{data.menuType || '未輸入餐單'}</p>
            )}

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

// ==========================================
// SECTION 6: VIEW COMPONENTS (LOGIN, SETTINGS)
// ==========================================

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

const SettingsView = ({ settings, onSave, addToast }) => {
  const [localSettings, setLocalSettings] = useState({
    minSpendRules: [], 
    defaultMenus: [], 
    ...settings 
  });
  
  const [activeSubTab, setActiveSubTab] = useState('minSpend'); 

  const [editingRule, setEditingRule] = useState({
    id: null,
    locations: [],
    prices: { Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '' }
  });

  const [editingMenu, setEditingMenu] = useState({ 
    id: null, 
    title: '', 
    content: '', 
    type: 'food', 
    price: '' 
  });

  const handleLocationToggle = (loc) => {
    setEditingRule(prev => {
      const exists = prev.locations.includes(loc);
      return {
        ...prev,
        locations: exists ? prev.locations.filter(l => l !== loc) : [...prev.locations, loc]
      };
    });
  };

  const handlePriceChange = (day, value) => {
    setEditingRule(prev => ({
      ...prev,
      prices: { ...prev.prices, [day]: value }
    }));
  };

  const handleSaveRule = () => {
    if (editingRule.locations.length === 0) {
      addToast("請至少選擇一個區域 (Please select at least one location)", "error");
      return;
    }

    setLocalSettings(prev => {
      const newRules = [...(prev.minSpendRules || [])];
      if (editingRule.id) {
        const idx = newRules.findIndex(r => r.id === editingRule.id);
        if (idx !== -1) newRules[idx] = editingRule;
      } else {
        newRules.push({ ...editingRule, id: Date.now() });
      }
      return { ...prev, minSpendRules: newRules };
    });

    setEditingRule({ id: null, locations: [], prices: { Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '' } });
    addToast("規則已暫存 (Rule Cached)", "success");
  };

  const handleDeleteRule = (id) => {
    setLocalSettings(prev => ({
      ...prev,
      minSpendRules: prev.minSpendRules.filter(r => r.id !== id)
    }));
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
  };

  const handleSaveMenu = () => {
    if (!editingMenu.title) return addToast("請輸入標題 (Title required)", "error");
    
    setLocalSettings(prev => {
      const newMenus = [...(prev.defaultMenus || [])];
      if (editingMenu.id) {
         const idx = newMenus.findIndex(m => m.id === editingMenu.id);
         if (idx !== -1) newMenus[idx] = editingMenu;
      } else {
         newMenus.push({ ...editingMenu, id: Date.now() });
      }
      return { ...prev, defaultMenus: newMenus };
    });
    setEditingMenu({ id: null, title: '', content: '', type: 'food', price: '' });
    addToast("菜單已儲存", "success");
  };

  const handleDeleteMenu = (id) => {
    setLocalSettings(prev => ({ ...prev, defaultMenus: prev.defaultMenus.filter(m => m.id !== id) }));
  };

  const handleEditMenu = (menu) => {
    setEditingMenu(menu);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">系統設定 (Settings)</h2>
          <p className="text-slate-500">管理場地規則與預設餐單</p>
        </div>
        <button 
          onClick={() => onSave(localSettings)} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all flex items-center"
        >
          <Save size={18} className="mr-2" /> 儲存所有變更 (Save All)
        </button>
      </div>

      <div className="flex space-x-1 border-b border-slate-200">
        <button 
          onClick={() => setActiveSubTab('minSpend')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSubTab === 'minSpend' ? 'bg-white border-x border-t border-slate-200 text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          場地低消設定 (Min Spend)
        </button>
        <button 
          onClick={() => setActiveSubTab('menus')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSubTab === 'menus' ? 'bg-white border-x border-t border-slate-200 text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          餐飲預設 (F&B Presets)
        </button>
      </div>

      {activeSubTab === 'minSpend' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 space-y-4">
              <Card className="p-5 border-l-4 border-l-blue-500">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
                  {editingRule.id ? <Edit2 size={18} className="mr-2"/> : <Plus size={18} className="mr-2"/>}
                  {editingRule.id ? "編輯規則 (Edit Rule)" : "新增規則 (New Rule)"}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">1. 選擇區域組合 (Select Locations)</label>
                  <div className="flex flex-wrap gap-2">
                    {LOCATION_CHECKBOXES.map(loc => (
                      <button
                        key={loc}
                        onClick={() => handleLocationToggle(loc)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                          editingRule.locations.includes(loc) 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    目前選擇: {editingRule.locations.length > 0 ? editingRule.locations.join(' + ') : '無 (None)'}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">2. 設定每日低消 (Set Minimum Spend)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="flex items-center">
                        <span className="w-12 text-xs font-bold text-slate-500 uppercase">{day} ({DAY_LABELS[day]})</span>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                          <input 
                            type="number"
                            value={editingRule.prices[day]}
                            onChange={(e) => handlePriceChange(day, e.target.value)}
                            className="w-full pl-5 pr-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveRule} 
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    {editingRule.id ? "更新規則 (Update)" : "新增規則 (Add)"}
                  </button>
                  {editingRule.id && (
                    <button 
                      onClick={() => setEditingRule({ id: null, locations: [], prices: { Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '' } })} 
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                    >
                      取消
                    </button>
                  )}
                </div>
              </Card>
            </div>

            <div className="md:col-span-7">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700">現有規則列表 ({localSettings.minSpendRules?.length || 0})</h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {(!localSettings.minSpendRules || localSettings.minSpendRules.length === 0) ? (
                    <div className="p-8 text-center text-slate-400">尚無設定任何低消規則</div>
                  ) : (
                    localSettings.minSpendRules.map((rule) => (
                      <div key={rule.id} className="p-4 hover:bg-blue-50/50 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-wrap gap-1">
                            {rule.locations.map(l => (
                              <span key={l} className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded font-bold">{l}</span>
                            ))}
                          </div>
                          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditRule(rule)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14}/></button>
                            <button onClick={() => handleDeleteRule(rule.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14}/></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-y-1 gap-x-2 text-xs text-slate-600">
                          {DAYS_OF_WEEK.map(day => (
                            <div key={day} className={`flex justify-between ${rule.prices[day] ? 'font-medium' : 'text-slate-300'}`}>
                              <span>{day}:</span>
                              <span>{rule.prices[day] ? `$${parseInt(rule.prices[day]).toLocaleString()}` : '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'menus' && (
        <div className="space-y-6 animate-in fade-in">
           <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
             <div className="md:col-span-5 space-y-4">
                <Card className="p-5 border-l-4 border-l-emerald-500">
                   <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
                     {editingMenu.id ? <Edit2 size={18} className="mr-2"/> : <Plus size={18} className="mr-2"/>}
                     {editingMenu.id ? "編輯預設 (Edit)" : "新增預設 (New Preset)"}
                   </h3>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-bold text-slate-700 mb-1">類型 (Type)</label>
                       <div className="flex space-x-2">
                          <button 
                            onClick={() => setEditingMenu(p => ({...p, type: 'food'}))}
                            className={`flex-1 py-2 rounded border text-sm font-medium ${editingMenu.type === 'food' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-slate-300 text-slate-600'}`}
                          >
                            <Utensils size={14} className="inline mr-1"/> 菜單 (Menu)
                          </button>
                          <button 
                            onClick={() => setEditingMenu(p => ({...p, type: 'drink'}))}
                            className={`flex-1 py-2 rounded border text-sm font-medium ${editingMenu.type === 'drink' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-slate-300 text-slate-600'}`}
                          >
                            <Coffee size={14} className="inline mr-1"/> 酒水 (Drink)
                          </button>
                       </div>
                     </div>
                     <FormInput 
                       label="標題 (Title)" 
                       value={editingMenu.title} 
                       onChange={e => setEditingMenu(p => ({...p, title: e.target.value}))} 
                       placeholder="例如: 2024 春季菜單"
                     />
                     <MoneyInput
                       label="預設價格 (Default Price)"
                       name="price"
                       value={editingMenu.price}
                       onChange={e => setEditingMenu(p => ({...p, price: e.target.value}))}
                     />
                     {editingMenu.type === 'food' ? (
                       <FormTextArea 
                         label="內容 (Content)" 
                         value={editingMenu.content} 
                         onChange={e => setEditingMenu(p => ({...p, content: e.target.value}))} 
                         rows={8}
                         placeholder="輸入詳細菜色..."
                       />
                     ) : (
                       <FormInput
                         label="酒水內容 (Content)"
                         value={editingMenu.content}
                         onChange={e => setEditingMenu(p => ({...p, content: e.target.value}))}
                         placeholder="例如: 紅白酒 + 汽水任飲"
                       />
                     )}
                     
                     <div className="flex gap-2">
                       <button onClick={handleSaveMenu} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors">儲存</button>
                       {editingMenu.id && <button onClick={() => setEditingMenu({id:null, title:'', content:'', type:'food', price: ''})} className="px-4 bg-slate-100 rounded-lg text-slate-600 font-bold hover:bg-slate-200">取消</button>}
                     </div>
                   </div>
                </Card>
             </div>

             <div className="md:col-span-7">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-700">預設列表 ({localSettings.defaultMenus?.length || 0})</h3>
                   </div>
                   <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                     {(!localSettings.defaultMenus || localSettings.defaultMenus.length === 0) ? (
                       <div className="p-8 text-center text-slate-400">尚無預設項目</div>
                     ) : (
                       localSettings.defaultMenus.map(m => (
                           <div key={m.id} className="p-4 hover:bg-emerald-50/50 transition-colors group">
                             <div className="flex justify-between items-start mb-1">
                                 <div className="flex items-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase mr-2 ${m.type === 'food' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                       {m.type === 'food' ? 'MENU' : 'DRINK'}
                                    </span>
                                    <span className="font-bold text-slate-800">{m.title}</span>
                                    {m.price && <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">${formatMoney(m.price)}</span>}
                                 </div>
                                 <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditMenu(m)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14}/></button>
                                    <button onClick={() => handleDeleteMenu(m.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14}/></button>
                                 </div>
                             </div>
                             <p className="text-xs text-slate-500 whitespace-pre-wrap line-clamp-2">{m.content}</p>
                           </div>
                       ))
                     )}
                   </div>
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SECTION 7: DASHBOARD COMPONENTS
// ==========================================

const DashboardView = ({ events, openEditModal }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let monthRevenue = 0;
    let annualRevenue = 0;
    let confirmedCount = 0;

    events.forEach(e => {
      if (e.status === 'cancelled') return;
      
      const eventDate = new Date(e.date);
      const amount = Number(e.totalAmount) || 0;

      if (e.status === 'confirmed') confirmedCount++;

      // Monthly Revenue (Current Month)
      if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
        monthRevenue += amount;
      }

      // Annual Revenue (Current Year)
      if (eventDate.getFullYear() === currentYear) {
        annualRevenue += amount;
      }
    });

    return { monthRevenue, annualRevenue, confirmedCount };
  }, [events]);

  // --- OVERDUE PAYMENTS ---
  const overduePayments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const list = [];

    events.forEach(e => {
      if (e.status === 'cancelled' || e.status === 'completed') return;

      const check = (amount, received, date, type) => {
        if (amount && !received && date && date < todayStr) {
          list.push({ id: e.id, name: e.eventName, type, date, amount });
        }
      };

      check(e.deposit1, e.deposit1Received, e.deposit1Date, '訂金 1');
      check(e.deposit2, e.deposit2Received, e.deposit2Date, '訂金 2');
      check(e.deposit3, e.deposit3Received, e.deposit3Date, '訂金 3');

      // Balance check
      let balanceDate = e.date;
      if (e.balanceDueDateType === '10daysPrior' && e.date) {
         const d = new Date(e.date);
         d.setDate(d.getDate() - 10);
         balanceDate = d.toISOString().split('T')[0];
      }
      const balanceVal = Number(e.totalAmount) - Number(e.deposit1||0) - Number(e.deposit2||0) - Number(e.deposit3||0);
      if (balanceVal > 0 && !e.balanceReceived && balanceDate < todayStr) {
         list.push({ id: e.id, name: e.eventName, type: '尾數 (Balance)', date: balanceDate, amount: balanceVal });
      }
    });
    return list;
  }, [events]);

  // --- UPCOMING PAYMENTS (14 DAYS) ---
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const next14Days = new Date();
    next14Days.setDate(today.getDate() + 14);
    
    const todayStr = today.toISOString().split('T')[0];
    const next14DaysStr = next14Days.toISOString().split('T')[0];
    const list = [];

    events.forEach(e => {
      if (e.status === 'cancelled' || e.status === 'completed') return;

      const check = (amount, received, date, type) => {
        if (amount && !received && date && date >= todayStr && date <= next14DaysStr) {
          list.push({ id: e.id, name: e.eventName, type, date, amount });
        }
      };

      check(e.deposit1, e.deposit1Received, e.deposit1Date, '訂金 1');
      check(e.deposit2, e.deposit2Received, e.deposit2Date, '訂金 2');
      check(e.deposit3, e.deposit3Received, e.deposit3Date, '訂金 3');

      // Balance check
      let balanceDate = e.date;
      if (e.balanceDueDateType === '10daysPrior' && e.date) {
         const d = new Date(e.date);
         d.setDate(d.getDate() - 10);
         balanceDate = d.toISOString().split('T')[0];
      }
      const balanceVal = Number(e.totalAmount) - Number(e.deposit1||0) - Number(e.deposit2||0) - Number(e.deposit3||0);
      if (balanceVal > 0 && !e.balanceReceived) {
         // Only add if balance date is within window. 
         // If it's effectively the event date, use event date.
         const checkDate = balanceDate || e.date; 
         if (checkDate >= todayStr && checkDate <= next14DaysStr) {
            list.push({ id: e.id, name: e.eventName, type: '尾數 (Balance)', date: checkDate, amount: balanceVal });
         }
      }
    });
    return list.sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [events]);

  // --- UPCOMING EVENTS ---
  const upcomingEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return events
      .filter(e => e.date >= todayStr && e.status !== 'cancelled')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [events]);

  // --- CALENDAR LOGIC ---
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

  const currentMonthEvents = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return events
      .filter(e => {
        if (e.status === 'cancelled') return false;
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events, currentDate]);

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* 0. Payment Alerts Section (Moved to Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Payments */}
        {overduePayments.length > 0 && (
             <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-pulse-slow">
               <h3 className="text-red-800 font-bold flex items-center mb-3">
                 <AlertTriangle size={20} className="mr-2"/> 逾期款項 (Overdue Payments)
               </h3>
               <div className="space-y-2">
                 {overduePayments.map((item, idx) => (
                   <div key={idx} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-red-50 transition-colors" onClick={() => openEditModal(events.find(e => e.id === item.id))}>
                     <div>
                       <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                       <div className="text-xs text-red-600 font-medium">{item.type} • 應付日期: {item.date}</div>
                     </div>
                     <div className="text-red-700 font-bold font-mono">${formatMoney(item.amount)}</div>
                   </div>
                 ))}
               </div>
             </div>
        )}

        {/* Upcoming Payments (14 Days) */}
        <Card className={`border-t-4 border-t-amber-400 ${overduePayments.length === 0 ? 'lg:col-span-2' : ''}`}>
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
               <h3 className="font-bold text-slate-800 flex items-center">
                 <Bell size={18} className="mr-2 text-amber-500"/> 即將到期款項 (14 Days)
               </h3>
               <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">{upcomingPayments.length} 筆</span>
             </div>
             <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
               {upcomingPayments.length === 0 ? (
                 <div className="text-center text-slate-400 py-4 text-sm">未來 14 天無到期款項</div>
               ) : (
                 upcomingPayments.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors cursor-pointer" onClick={() => openEditModal(events.find(e => e.id === item.id))}>
                      <div>
                        <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.type} • 到期: <span className="text-amber-600 font-bold">{item.date}</span></div>
                      </div>
                      <div className="font-mono font-bold text-slate-700">${formatMoney(item.amount)}</div>
                   </div>
                 ))
               )}
             </div>
        </Card>
      </div>

      {/* 1. Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center space-x-4 border-l-4 border-l-blue-500">
           <div className="p-3 bg-blue-50 rounded-full text-blue-600">
             <CheckCircle size={24} />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-bold">已確認單數量 (Confirmed)</p>
             <h3 className="text-2xl font-black text-slate-800">{stats.confirmedCount}</h3>
           </div>
        </Card>
        <Card className="p-5 flex items-center space-x-4 border-l-4 border-l-emerald-500">
           <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
             <DollarSign size={24} />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-bold">本月預計營收 (Monthly)</p>
             <h3 className="text-2xl font-black text-slate-800">${formatMoney(stats.monthRevenue)}</h3>
           </div>
        </Card>
        <Card className="p-5 flex items-center space-x-4 border-l-4 border-l-violet-500">
           <div className="p-3 bg-violet-50 rounded-full text-violet-600">
             <TrendingUp size={24} />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-bold">年度營業額 (Annual)</p>
             <h3 className="text-2xl font-black text-slate-800">${formatMoney(stats.annualRevenue)}</h3>
           </div>
        </Card>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Upcoming Events Only */}
        <div className="lg:col-span-2 space-y-6">
           {/* Upcoming Events List */}
           <Card className="border-t-4 border-t-blue-500">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50">
               <h3 className="font-bold text-slate-800 flex items-center">
                 <CalendarIcon size={18} className="mr-2 text-blue-500"/> 近期活動 (Upcoming Events)
               </h3>
             </div>
             <div className="divide-y divide-slate-100">
               {upcomingEvents.length === 0 ? (
                 <div className="text-center text-slate-400 py-8 text-sm">暫無近期活動</div>
               ) : (
                 upcomingEvents.map(event => (
                   <div key={event.id} className="p-4 hover:bg-slate-50 flex items-center space-x-4 cursor-pointer group transition-colors" onClick={() => openEditModal(event)}>
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex flex-col items-center justify-center text-blue-600 border border-blue-100 group-hover:border-blue-300 transition-colors">
                        <span className="text-[10px] font-bold uppercase">{new Date(event.date).toLocaleString('en-US', { month: 'short' })}</span>
                        <span className="text-lg font-bold leading-none">{new Date(event.date).getDate()}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{event.eventName}</h4>
                        <div className="text-xs text-slate-500 flex items-center mt-1">
                          <Clock size={12} className="mr-1"/> {event.startTime} - {event.endTime}
                          <span className="mx-2 text-slate-300">|</span>
                          <MapPin size={12} className="mr-1"/> {event.venueLocation || '未定'}
                        </div>
                      </div>
                      <Badge status={event.status} />
                   </div>
                 ))
               )}
             </div>
           </Card>
        </div>

        {/* Right Column: Calendar Widget */}
        <div className="lg:col-span-1">
           <Card className="h-full flex flex-col">
             <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
               <h3 className="font-bold text-slate-700">{monthName}</h3>
               <div className="flex space-x-1">
                 <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><ChevronLeft size={16}/></button>
                 <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><ChevronRight size={16}/></button>
               </div>
             </div>
             <div className="p-2">
               <div className="grid grid-cols-7 mb-2">
                 {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                   <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                 ))}
               </div>
               <div className="grid grid-cols-7 gap-1">
                 {Array.from({ length: Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7 }).map((_, i) => {
                    const dayNum = i - firstDayOfMonth + 1;
                    const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
                    
                    if (!isCurrentMonth) return <div key={i} className="h-10 bg-slate-50/30 rounded"></div>;

                    const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                    const dayEvents = eventsByDate[dateKey] || [];
                    const hasEvent = dayEvents.length > 0;

                    return (
                      <div key={i} className={`h-10 rounded border border-slate-100 flex flex-col items-center justify-center relative transition-all cursor-default ${hasEvent ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-white'}`}>
                        <span className={`text-xs font-medium ${hasEvent ? 'text-blue-700' : 'text-slate-600'}`}>{dayNum}</span>
                        {hasEvent && (
                          <div className="flex space-x-0.5 mt-1">
                            {dayEvents.slice(0, 3).map((_, idx) => (
                              <div key={idx} className="w-1 h-1 rounded-full bg-blue-500"></div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                 })}
               </div>
             </div>
             
             {/* List of Events for the Month */}
             <div className="flex-1 border-t border-slate-100 bg-slate-50/30 overflow-hidden flex flex-col">
                <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <span>本月活動 (Events)</span>
                  <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full">{currentMonthEvents.length}</span>
                </div>
                <div className="overflow-y-auto flex-1 max-h-[300px]">
                  {currentMonthEvents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">本月暫無活動安排</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {currentMonthEvents.map(event => (
                        <div key={event.id} className="p-3 hover:bg-white transition-colors cursor-pointer group" onClick={() => openEditModal(event)}>
                          <div className="flex items-center space-x-3">
                             <div className="flex-shrink-0 w-8 h-8 bg-white rounded border border-slate-200 flex flex-col items-center justify-center text-slate-600 group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                               <span className="text-[9px] font-bold uppercase leading-none">{new Date(event.date).toLocaleString('en-US', { weekday: 'short' })}</span>
                               <span className="text-xs font-bold leading-none">{new Date(event.date).getDate()}</span>
                             </div>
                             <div className="min-w-0 flex-1">
                               <p className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-600">{event.eventName}</p>
                               <div className="flex items-center text-[10px] text-slate-400 mt-0.5">
                                 <Clock size={10} className="mr-1"/> {event.startTime}-{event.endTime}
                                 {event.venueLocation && (
                                   <>
                                     <span className="mx-1">•</span>
                                     <span className="truncate">{event.venueLocation}</span>
                                   </>
                                 )}
                               </div>
                             </div>
                             {/* Small Badge */}
                             <span className={`w-2 h-2 rounded-full ${
                                event.status === 'confirmed' ? 'bg-emerald-500' : 
                                event.status === 'completed' ? 'bg-slate-400' : 'bg-amber-500'
                             }`} title={event.status}></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             </div>
           </Card>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// SECTION 8: MAIN APP LOGIC
// ==========================================

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  
  // UI State for Toast & Modals
  const [toasts, setToasts] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to Dashboard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Printing State
  const [printMode, setPrintMode] = useState('EO'); 

  // Settings State
  const [appSettings, setAppSettings] = useState({
    minSpendRules: [], 
    defaultMenus: [] 
  }); 

  // User Management State
  const [userProfile, setUserProfile] = useState(null);

  // EO Form State
  const initialFormState = {
    // 1. Basic Info & Contact
    orderId: '',
    eventName: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '18:00', // 24H default
    endTime: '23:00',   // 24H default
    selectedLocations: [], 
    locationOther: '',
    venueLocation: '', 
    
    eventType: '婚宴 (Wedding)',
    status: 'tentative',
    guestCount: '',
    tableCount: '',
    
    // Client Info
    clientName: '',
    companyName: '',
    clientPhone: '',
    clientEmail: '',
    secondaryContact: '',
    secondaryPhone: '',
    salesRep: '', 
    address: '',

    // 2. F&B (Menu)
    menuType: '', 
    menus: [],     
    specialMenuReq: '',
    staffMeals: '',
    drinksPackage: '',
    preDinnerSnacks: '',
    allergies: '',
    servingStyle: '圍餐',
    
    // 3. Billing
    menuPrice: '', 
    menuPriceType: 'perTable', 
    drinksPrice: '', 
    drinksPriceType: 'perTable', 
    totalAmount: '',
    deposit1: '',
    deposit1Received: false,
    deposit1Proof: '',
    deposit1Date: '', 
    deposit2: '',
    deposit2Received: false,
    deposit2Proof: '',
    deposit2Date: '',
    deposit3: '',
    deposit3Received: false,
    deposit3Proof: '',
    deposit3Date: '',
    balance: '',
    balanceReceived: false, 
    paymentMethod: '現金',
    discount: '',
    serviceCharge: '10%',
    balanceDueDateType: 'eventDay', 
    
    // 4. Venue & AV
    tableClothColor: '',
    chairCoverColor: '',
    headTableColorType: 'same', 
    headTableCustomColor: '',
    bridalRoom: false,
    bridalRoomHours: '',
    stageDecor: '',
    equipment: {
      podium: false, mic: false, micStand: false, cake: false, nameSign: false
    },
    decoration: {
      ceremonyService: false, ceremonyChairs: false, flowerPillars: false, guestBook: false,
      easel: false, mahjong: false, invites: false, wreaths: false
    },
    decorationChairsQty: '',
    decorationOther: '',
    avRequirements: {
      ledBig: false, projBig: false,
      ledSmall: false, projSmall: false,
      spotlight: false, movingHead: false, entranceLight: false,
      tv60v: false, tv60h: false,
      mic: false, speaker: false
    },
    avOther: '',
    avNotes: '',

    // 5. Logistics
    deliveryNotes: '',
    parkingPlates: '', 
    otherNotes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formTab, setFormTab] = useState('basic'); 
  // New State for Drinks Logic
  const [drinkPackageType, setDrinkPackageType] = useState('');

  // --- Toast Helpers ---
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Auth Logic ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (e) {
          console.error("Auth token failed", e);
        }
      }
    };
    initAuth();

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
        } else {
          await setDoc(userRef, profileData);
        }
        setUserProfile(profileData);
        setAuthError("");
      } else {
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

  const handleSaveSettings = async (newSettings) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
      await setDoc(docRef, newSettings); // Saves to Firebase
      setAppSettings(newSettings); // Updates local state
      addToast("Settings Saved Successfully!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to save settings", "error");
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
    }, (err) => {
      console.error("Firestore Error:", err);
      addToast("Failed to sync events", "error");
    });
    return () => unsubscribe();
  }, [user]);

// Fetch Settings
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const savedData = snap.data();
          setAppSettings(prev => ({
            ...prev,
            ...savedData,
            minSpendRules: savedData.minSpendRules || [],
            defaultMenus: savedData.defaultMenus || [] 
          }));
        }
      } catch (e) {
        console.error("Fetch settings error", e);
      }
    };
    fetchSettings();
  }, [user]);
  
  // --- Handlers ---

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    if (name.startsWith('av_')) {
      const field = name.replace('av_', '');
      setFormData(prev => ({ ...prev, avRequirements: { ...prev.avRequirements, [field]: checked } }));
    } else if (name.startsWith('eq_')) {
      const field = name.replace('eq_', '');
      setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, [field]: checked } }));
    } else if (name.startsWith('dec_')) {
      const field = name.replace('dec_', '');
      setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, [field]: checked } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // --- PRICE HANDLER & CALCULATION ---
  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      return { ...newData, totalAmount: calculateTotalAmount(newData) };
    });
  };

  // --- MENU HANDLERS ---
  const handleMenuChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      menus: prev.menus.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  // Apply a preset to a specific menu
  const handleApplyMenuPreset = (menuId, presetId) => {
    if (!presetId) return;
    const preset = appSettings.defaultMenus.find(m => m.id.toString() === presetId.toString());
    if (preset) {
       setFormData(prev => {
         const newData = {
            ...prev,
            menus: prev.menus.map(m => m.id === menuId ? { ...m, title: preset.title, content: preset.content } : m),
            menuPrice: preset.price || prev.menuPrice 
         };
         return { ...newData, totalAmount: calculateTotalAmount(newData) }; 
       });
       addToast(`已載入: ${preset.title}`, "success");
    }
  };

  const addMenu = () => {
    setFormData(prev => ({
      ...prev,
      menus: [...(prev.menus || []), { id: Date.now(), title: '', content: '' }]
    }));
  };

  const removeMenu = (id) => {
    setFormData(prev => ({
      ...prev,
      menus: prev.menus.filter(m => m.id !== id)
    }));
  };

  // Handle Drink Package Selection
  const handleDrinkTypeChange = (e) => {
    const val = e.target.value;
    setDrinkPackageType(val);
    
    const preset = appSettings.defaultMenus.find(m => m.type === 'drink' && m.title === val);
    
    if (preset) {
        setFormData(prev => {
          const newData = { 
            ...prev, 
            drinksPackage: preset.content,
            drinksPrice: preset.price || prev.drinksPrice 
          };
          return { ...newData, totalAmount: calculateTotalAmount(newData) };
        }); 
    } else if (val !== 'Other') {
        setFormData(prev => ({ ...prev, drinksPackage: val }));
    } else {
        setFormData(prev => ({ ...prev, drinksPackage: '' })); 
    }
  };

  // --- Auto Payment Schedule Handler ---
  const applyStandardPaymentTerms = () => {
    const total = parseFloat(formData.totalAmount);
    if (!total) {
        addToast("請先輸入總金額", "error");
        return;
    }
    
    if (!formData.date) {
        addToast("請先輸入活動日期", "error");
        return;
    }

    const eventDate = new Date(formData.date);
    const orderDate = editingEvent?.createdAt ? new Date(editingEvent.createdAt.seconds * 1000) : new Date();
    
    const monthsDiff = (eventDate.getFullYear() - orderDate.getFullYear()) * 12 + (eventDate.getMonth() - orderDate.getMonth());
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    const addMonths = (date, months) => {
        const d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return formatDate(d);
    };

    if (monthsDiff >= 6) {
        const depositVal = Math.round(total * 0.3);
        setFormData(prev => ({
            ...prev,
            deposit1: depositVal,
            deposit1Date: addMonths(orderDate, 0),
            deposit2: depositVal,
            deposit2Date: addMonths(orderDate, 3),
            deposit3: depositVal,
            deposit3Date: addMonths(orderDate, 6),
        }));
        addToast("已套用 6 個月以上付款計劃 (30%/30%/30%)", "success");
    } else if (monthsDiff >= 4) {
        const depositVal = Math.round(total * 0.3);
        setFormData(prev => ({
            ...prev,
            deposit1: depositVal,
            deposit1Date: addMonths(orderDate, 0),
            deposit2: depositVal,
            deposit2Date: addMonths(orderDate, 2),
            deposit3: depositVal,
            deposit3Date: addMonths(orderDate, 4),
        }));
        addToast("已套用 4-6 個月付款計劃 (30%/30%/30%)", "success");
    } else if (monthsDiff >= 1) {
        const deposit1Val = Math.round(total * 0.5);
        const deposit2Val = Math.round(total * 0.4);
        
        setFormData(prev => ({
            ...prev,
            deposit1: deposit1Val,
            deposit1Date: addMonths(orderDate, 0),
            deposit2: deposit2Val,
            deposit2Date: addMonths(eventDate, -1), // 1 month before event
            deposit3: '',
            deposit3Date: '',
        }));
        addToast("已套用 1-3 個月付款計劃 (50%/40%)", "success");
    } else {
        addToast("活動日期少於 1 個月，請手動設定付款期", "info");
    }
  };

  // --- MIN SPEND CALCULATION ---
  const minSpendInfo = useMemo(() => {
    if (!formData.date || formData.selectedLocations.length === 0 || !appSettings.minSpendRules) return null;
    
    const date = new Date(formData.date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStr = days[date.getDay()];
    
    const selectedSorted = [...formData.selectedLocations].sort();
    
    const exactRule = appSettings.minSpendRules.find(r => {
      const ruleSorted = [...r.locations].sort();
      return JSON.stringify(ruleSorted) === JSON.stringify(selectedSorted);
    });
    
    if (exactRule) {
      return { 
        amount: parseInt(exactRule.prices[dayStr] || 0), 
        ruleName: `精確符合 (Exact Match): ${selectedSorted.join('+')}` 
      };
    }

    let sum = 0;
    let applicableRules = [];
    
    formData.selectedLocations.forEach(loc => {
       const rule = appSettings.minSpendRules.find(r => r.locations.length === 1 && r.locations[0] === loc);
       if (rule) {
         const price = parseInt(rule.prices[dayStr] || 0);
         sum += price;
         applicableRules.push(`${loc} ($${price.toLocaleString()})`);
       }
    });
    
    if (applicableRules.length > 0) {
      return { 
        amount: sum, 
        ruleName: `組合加總 (Sum): ${applicableRules.join(' + ')}` 
      };
    }
    
    return null;
  }, [formData.date, formData.selectedLocations, appSettings.minSpendRules]);

  const openNewEventModal = () => {
    setEditingEvent(null);
    const today = new Date();
    const dateStr = today.toISOString().slice(0,10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    
    setFormData({
      ...initialFormState,
      menus: [{ id: Date.now(), title: '主菜單 (Main Menu)', content: '' }],
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
    const safeData = {
      ...initialFormState, 
      ...event, 
      selectedLocations: event.selectedLocations || (event.venueLocation ? [event.venueLocation] : []),
      menus: (event.menus && event.menus.length > 0) 
              ? event.menus 
              : [{ id: 'default', title: '主菜單 (Main Menu)', content: event.menuType || '' }],
      menuPrice: event.menuPrice || '',
      menuPriceType: event.menuPriceType || 'perTable',
      drinksPrice: event.drinksPrice || '',
      drinksPriceType: event.drinksPriceType || 'perTable',
    };
    setFormData(safeData); 
    
    if (DEFAULT_DRINK_PACKAGES.includes(event.drinksPackage)) {
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
  
  const handleRemoveProof = (key) => {
      setConfirmConfig({
        isOpen: true,
        title: "移除收據",
        message: "確定要移除此收據嗎？此操作無法還原。",
        onConfirm: () => {
          setFormData(prev => ({...prev, [key]: ''}));
          setConfirmConfig({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'events');
    const menuString = formData.menus.map(m => m.content).join('\n\n');

    const payload = {
      ...formData,
      menuType: menuString,
      totalAmount: Number(formData.totalAmount) || 0,
      updatedAt: serverTimestamp(),
      lastEditor: userProfile?.displayName || user.uid
    };

    try {
      if (editingEvent) {
        await updateDoc(doc(ref, editingEvent.id), payload);
        addToast("訂單已更新", "success");
      } else {
        await addDoc(ref, { ...payload, createdAt: serverTimestamp(), creatorId: user.uid });
        addToast("新訂單已建立", "success");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast("儲存失敗: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    setConfirmConfig({
      isOpen: true,
      title: "刪除訂單",
      message: "確定要刪除此訂單嗎？此操作無法還原。",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
          addToast("訂單已刪除", "success");
        } catch (error) {
           addToast("刪除失敗", "error");
        } finally {
           setConfirmConfig({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // --- Printing Handlers ---
  const handlePrintEO = () => {
    setPrintMode('EO');
    setTimeout(() => window.print(), 100);
  };

  // --- Views ---

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

  // --- Render Logic ---

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500"><Loader2 className="animate-spin mr-2" /> 載入中 (Loading)...</div>;

  if (!user) {
    return <LoginView onLogin={handleLogin} onGuestLogin={handleGuestLogin} error={authError} />;
  }

  return (
    <>
      {/* Modals & Toasts */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
      
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

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
              { id: 'settings', label: '設定 (Settings)', icon: Settings },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
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
            <div className="grid grid-cols-1 gap-2">
               <button onClick={handleSignOut} className="flex items-center justify-center px-2 py-2 text-xs font-medium text-white bg-rose-600 rounded hover:bg-rose-700 transition-colors" title="登出">
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
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
              {activeTab === 'dashboard' && <DashboardView events={events} openEditModal={openEditModal} />}
              {activeTab === 'events' && <EventsListView />}
              {activeTab === 'settings' && (<SettingsView 
                settings={appSettings} 
                onSave={handleSaveSettings} 
                addToast={addToast}
              />
)}
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
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className="md:col-span-12">
                        <FormInput label="活動名稱" name="eventName" required placeholder="例如：陳李聯婚" value={formData.eventName} onChange={handleInputChange} />
                      </div>
                      
                      <div className="md:col-span-4">
                        <FormInput label="活動日期" name="date" type="date" required value={formData.date} onChange={handleInputChange} />
                      </div>
                      <div className="md:col-span-4">
                        <FormInput label="開始時間" name="startTime" type="time" required value={formData.startTime} onChange={handleInputChange} />
                      </div>
                      <div className="md:col-span-4">
                        <FormInput label="結束時間" name="endTime" type="time" required value={formData.endTime} onChange={handleInputChange} />
                      </div>

                      {/* Location (6 cols) + Tables (3 cols) + Guests (3 cols) */}
                      <div className="md:col-span-6">
                        <LocationSelector formData={formData} setFormData={setFormData} />
                      </div>
                      <div className="md:col-span-3">
                        <FormInput label="席數" name="tableCount" placeholder="20" value={formData.tableCount} onChange={handleInputChange} />
                      </div>
                      <div className="md:col-span-3">
                        <FormInput label="人數" name="guestCount" placeholder="240" value={formData.guestCount} onChange={handleInputChange} />
                      </div>

                      {/* Min Spend Reminder for Basic Tab */}
                      {minSpendInfo && (
                        <div className="md:col-span-12 bg-amber-50 text-amber-800 text-sm p-3 rounded-lg border border-amber-200 flex items-start animate-in fade-in">
                           <Info size={18} className="mr-2 flex-shrink-0 mt-0.5"/>
                           <div>
                             <p className="font-bold">
                               {new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long' })} 最低消費 (Min Spend): 
                               <span className="font-mono text-base ml-2">${minSpendInfo.amount.toLocaleString()}</span>
                             </p>
                             <p className="text-xs opacity-75 mt-0.5">適用規則: {minSpendInfo.ruleName}</p>
                           </div>
                        </div>
                      )}
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
                      <h4 className="font-bold text-slate-800">餐單設定 (Menus)</h4>
                      <div className="flex space-x-2">
                        <button 
                          type="button" 
                          onClick={addMenu}
                          className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-bold flex items-center transition-colors"
                        >
                          <Plus size={16} className="mr-1"/> 新增菜單 (Add Menu)
                        </button>
                      </div>
                    </div>
                    
                    {/* Dynamic Menus */}
                    <div className="space-y-4">
                      {formData.menus && formData.menus.map((menu, index) => (
                        <div key={menu.id || index} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative group transition-all hover:border-blue-200 hover:shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center flex-1 gap-2">
                                <input 
                                  type="text" 
                                  placeholder="菜單標題 (例如: Main Menu / Vegetarian)"
                                  value={menu.title}
                                  onChange={(e) => handleMenuChange(menu.id, 'title', e.target.value)}
                                  className="font-bold text-slate-700 bg-transparent border-b border-dashed border-slate-400 focus:border-blue-500 focus:outline-none flex-1"
                                />
                                {/* LOAD PRESET BUTTON */}
                                <select 
                                   className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-600 focus:ring-1 focus:ring-emerald-500 outline-none w-32"
                                   onChange={(e) => handleApplyMenuPreset(menu.id, e.target.value)}
                                   value=""
                                >
                                   <option value="" disabled>📂 載入預設...</option>
                                   {appSettings.defaultMenus && appSettings.defaultMenus.filter(m => m.type === 'food').map(m => (
                                     <option key={m.id} value={m.id}>{m.title}</option>
                                   ))}
                                </select>
                            </div>
                            
                            {formData.menus.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeMenu(menu.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors ml-2"
                                title="移除此菜單"
                              >
                                <Trash2 size={16}/>
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={6}
                            placeholder="請在此輸入詳細菜單內容..."
                            value={menu.content}
                            onChange={(e) => handleMenuChange(menu.id, 'content', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
                          {DEFAULT_DRINK_PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                          {/* Dynamic Drink Presets */}
                          {appSettings.defaultMenus && appSettings.defaultMenus.filter(m => m.type === 'drink').map(m => (
                            <option key={m.id} value={m.title}>📂 {m.title}</option>
                          ))}
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

              {/* TAB 3: BILLING (UPDATED WITH REMINDER) */}
              {formTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">費用與訂金</h4>
                    
                    {/* MIN SPEND REMINDER */}
                    {minSpendInfo && (
                      <div className={`p-4 rounded-lg border flex items-start gap-3 ${
                        (Number(formData.totalAmount) < minSpendInfo.amount) 
                          ? 'bg-amber-50 border-amber-200 text-amber-800' 
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}>
                        {(Number(formData.totalAmount) < minSpendInfo.amount) ? <AlertTriangle size={20} className="shrink-0 mt-0.5"/> : <Info size={20} className="shrink-0 mt-0.5"/>}
                        <div className="flex-1">
                          <p className="font-bold text-sm">最低消費提醒 (Min Spend Reminder)</p>
                          <p className="text-xs mt-1">
                            根據所選日期 ({new Date(formData.date).toLocaleDateString('en-US', { weekday: 'short' })}) 與區域，建議低消為 
                            <span className="font-bold font-mono text-base mx-1">${minSpendInfo.amount.toLocaleString()}</span>
                            ({minSpendInfo.ruleName})
                          </p>
                          {(Number(formData.totalAmount) < minSpendInfo.amount) && (
                            <p className="text-xs font-bold mt-1 text-amber-700">⚠️ 目前總金額低於建議低消</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* New Price Breakdown Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      
                      {/* Menu Price with Type Selector */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">菜單價格 (Menu Price)</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <MoneyInput name="menuPrice" value={formData.menuPrice} onChange={handlePriceChange} />
                          </div>
                          <select 
                            name="menuPriceType" 
                            value={formData.menuPriceType} 
                            onChange={handlePriceChange}
                            className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-28"
                          >
                            <option value="perTable">每席 (Per Table)</option>
                            <option value="perPerson">每位 (Per Person)</option>
                            <option value="total">總計 (Total)</option>
                          </select>
                        </div>
                      </div>

                      {/* Drinks Price with Type Selector */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">酒水套餐價格 (Drinks Price)</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <MoneyInput name="drinksPrice" value={formData.drinksPrice} onChange={handlePriceChange} />
                          </div>
                          <select 
                            name="drinksPriceType" 
                            value={formData.drinksPriceType} 
                            onChange={handlePriceChange}
                            className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-28"
                          >
                            <option value="perTable">每席 (Per Table)</option>
                            <option value="perPerson">每位 (Per Person)</option>
                            <option value="total">總計 (Total)</option>
                          </select>
                        </div>
                      </div>
                      
                      <FormInput label="加一服務費 (Service Charge)" name="serviceCharge" value={formData.serviceCharge} onChange={handlePriceChange} placeholder="10% or amount" />
                      <MoneyInput label="折扣 (Discount)" name="discount" value={formData.discount} onChange={handlePriceChange} />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 border-t border-slate-100">
                      <div className="w-full md:w-1/2">
                        <MoneyInput label="總費用 (Total Amount - Auto Calculated)" name="totalAmount" required className="text-xl font-bold text-blue-700" value={formData.totalAmount} onChange={handleInputChange} />
                        <button 
                          type="button" 
                          onClick={applyStandardPaymentTerms}
                          className="mt-2 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors border border-blue-100"
                        >
                          ✨ 套用標準付款期 (Auto-Schedule)
                        </button>
                      </div>
                      {/* Payment Method Moved Below */}
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-4">
                      <DepositField label="訂金一 (Deposit 1)" prefix="deposit1" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} addToast={addToast} onRemoveProof={handleRemoveProof}/>
                      <DepositField label="訂金二 (Deposit 2)" prefix="deposit2" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} addToast={addToast} onRemoveProof={handleRemoveProof}/>
                      <DepositField label="訂金三 (Deposit 3)" prefix="deposit3" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} addToast={addToast} onRemoveProof={handleRemoveProof}/>
                    </div>

                    {/* Balance & Payment Method Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 mt-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-slate-700">尾數付款期限 (Balance Due Date)</label>
                            {/* Balance Received Checkbox */}
                            <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={formData.balanceReceived || false} 
                                onChange={e => setFormData(prev => ({...prev, balanceReceived: e.target.checked}))}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className={formData.balanceReceived ? "text-emerald-600 font-bold" : "text-slate-500"}>
                                {formData.balanceReceived ? "尾數已收款 (Paid)" : "尾數未付 (Unpaid)"}
                              </span>
                            </label>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <div className="flex space-x-2">
                              <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 flex-1">
                                <input 
                                  type="radio" 
                                  name="balanceDueDateType" 
                                  value="eventDay" 
                                  checked={formData.balanceDueDateType === 'eventDay'} 
                                  onChange={handleInputChange}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-medium">宴會當日 (Event Day)</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 flex-1">
                                <input 
                                  type="radio" 
                                  name="balanceDueDateType" 
                                  value="10daysPrior" 
                                  checked={formData.balanceDueDateType === '10daysPrior'} 
                                  onChange={handleInputChange}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-medium">10 日前 (10 Days Prior)</span>
                              </label>
                            </div>
                            {/* Calculated Date Display */}
                            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded flex items-center">
                              <CalendarIcon size={12} className="mr-1.5 text-slate-400"/>
                              預計付款日期: <span className="font-bold text-slate-700 ml-1">
                                {formData.date ? (
                                  formData.balanceDueDateType === '10daysPrior' 
                                    ? new Date(new Date(formData.date).getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                                    : formData.date
                                ) : '請先設定活動日期'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <FormSelect label="付款方式 (Payment Method)" name="paymentMethod" options={['現金', '信用卡', '支票', '轉數快']} value={formData.paymentMethod} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: VENUE */}
              {formTab === 'venue' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">場地佈置</h4>
                    <div className="flex justify-between items-start">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                          <FormSelect label="檯布顏色 (Table Cloth)" name="tableClothColor" options={DECOR_COLORS} value={formData.tableClothColor} onChange={handleInputChange} />
                          <FormSelect label="椅套顏色 (Chair Cover)" name="chairCoverColor" options={DECOR_COLORS} value={formData.chairCoverColor} onChange={handleInputChange} />
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 pt-4 border-t border-slate-100">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">主家席顏色 (Head Table Color)</label>
                          <div className="flex gap-4 mb-2">
                            <label className="flex items-center space-x-2 text-sm cursor-pointer">
                              <input type="radio" name="headTableColorType" value="same" checked={formData.headTableColorType === 'same'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500"/>
                              <span>同客席 (Same as Guest)</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm cursor-pointer">
                              <input type="radio" name="headTableColorType" value="custom" checked={formData.headTableColorType === 'custom'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500"/>
                              <span>自訂 (Custom)</span>
                            </label>
                          </div>
                          {formData.headTableColorType === 'custom' && (
                            <input 
                              type="text" 
                              name="headTableCustomColor" 
                              value={formData.headTableCustomColor} 
                              onChange={handleInputChange} 
                              placeholder="請輸入主家席顏色"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          )}
                      </div>

                      {/* Bridal Room */}
                      <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                          <div className="flex justify-between items-center mb-2">
                             <label className="font-bold text-slate-700 text-sm">新娘房 / 更衣室 (Bridal Room)</label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                               <input type="checkbox" name="bridalRoom" checked={formData.bridalRoom} onChange={e => setFormData(prev => ({...prev, bridalRoom: e.target.checked}))} className="rounded text-pink-500 focus:ring-pink-500"/>
                               <span className="text-xs text-slate-500">需要使用</span>
                             </label>
                          </div>
                          {formData.bridalRoom && (
                            <input 
                              type="text"
                              name="bridalRoomHours"
                              value={formData.bridalRoomHours}
                              onChange={handleInputChange}
                              placeholder="使用時間 (Usage Hours) e.g. 17:00 - 23:00"
                              className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none bg-white"
                            />
                          )}
                      </div>
                    </div>
                    
                    <FormTextArea label="舞台/花藝佈置" name="stageDecor" value={formData.stageDecor} onChange={handleInputChange} />
                  </div>
                  
                  {/* NEW: Equipment & Decor Section */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">物資與佈置 (Equipment & Decor)</h4>
                    
                    {/* Equipment */}
                    <div className="mb-4">
                      <label className="text-sm font-bold text-slate-600 block mb-2">一般物資</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['podium', 'mic', 'micStand', 'cake', 'nameSign'].map(key => (
                          <FormCheckbox 
                            key={key} 
                            label={{podium:'講台', mic:'咪', micStand:'咪架', cake:'蛋糕', nameSign:'禮堂字牌'}[key]} 
                            name={`eq_${key}`} 
                            checked={formData.equipment?.[key]} 
                            onChange={handleInputChange} 
                          />
                        ))}
                      </div>
                    </div>

                    {/* Decoration */}
                    <div>
                      <label className="text-sm font-bold text-slate-600 block mb-2">婚宴/佈置</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                        {['ceremonyService', 'flowerPillars', 'guestBook', 'easel', 'mahjong', 'invites', 'wreaths'].map(key => (
                          <FormCheckbox 
                            key={key} 
                            label={{ceremonyService:'證婚服務', flowerPillars:'花柱佈置', guestBook:'簽名冊', easel:'畫架', mahjong:'麻雀枱', invites:'喜帖', wreaths:'花圈'}[key]} 
                            name={`dec_${key}`} 
                            checked={formData.decoration?.[key]} 
                            onChange={handleInputChange} 
                          />
                        ))}
                        {/* Special Case: Ceremony Chairs */}
                        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded">
                           <FormCheckbox label="證婚椅子" name="dec_ceremonyChairs" checked={formData.decoration?.ceremonyChairs} onChange={handleInputChange} />
                           {formData.decoration?.ceremonyChairs && (
                             <input 
                               type="text" 
                               placeholder="數量" 
                               className="w-16 border border-slate-300 rounded px-1 py-0.5 text-sm"
                               value={formData.decorationChairsQty || ''}
                               onChange={(e) => setFormData(prev => ({...prev, decorationChairsQty: e.target.value}))}
                             />
                           )}
                        </div>
                      </div>
                      <input 
                        type="text" 
                        placeholder="其他補充 (Other Decoration Notes)" 
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm mt-2"
                        value={formData.decorationOther || ''}
                        onChange={(e) => setFormData(prev => ({...prev, decorationOther: e.target.value}))}
                      />
                    </div>
                  </div>

                  {/* Updated AV Section */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">AV 設備 (Audio Visual)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        {k:'ledBig', l:'大禮堂LED'}, {k:'projBig', l:'大禮堂Projector'},
                        {k:'ledSmall', l:'小禮堂LED'}, {k:'projSmall', l:'小禮堂Projector'},
                        {k:'spotlight', l:'聚光燈'}, {k:'movingHead', l:'電腦燈'}, {k:'entranceLight', l:'進場燈'},
                        {k:'tv60v', l:'60寸電視(直)'}, {k:'tv60h', l:'60寸電視(橫)'},
                        {k:'mic', l:'咪'}, {k:'speaker', l:'喇叭'}
                      ].map(item => (
                        <FormCheckbox 
                          key={item.k} 
                          label={item.l} 
                          name={`av_${item.k}`} 
                          checked={formData.avRequirements?.[item.k]} 
                          onChange={handleInputChange} 
                        />
                      ))}
                    </div>
                    <input 
                        type="text" 
                        placeholder="其他 AV 補充" 
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm mt-2"
                        value={formData.avOther || ''}
                        onChange={(e) => setFormData(prev => ({...prev, avOther: e.target.value}))}
                    />
                    <FormTextArea label="AV 系統備註 (AV Notes)" name="avNotes" value={formData.avNotes} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              {/* TAB 5: LOGISTICS */}
              {formTab === 'logistics' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                       <h4 className="font-bold text-slate-800">物流與備註</h4>
                    </div>
                    <FormTextArea label="送貨/物資清單" name="deliveryNotes" rows={4} value={formData.deliveryNotes} onChange={handleInputChange} />
                    <FormTextArea label="泊車登記" name="parkingPlates" rows={3} value={formData.parkingPlates} onChange={handleInputChange} />
                    <FormTextArea label="其他備註" name="otherNotes" rows={3} value={formData.otherNotes} onChange={handleInputChange} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center sticky bottom-0 z-10">
              <div className="flex items-center space-x-2">
                 {editingEvent && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrintEO}
                      className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium flex items-center border border-slate-200 text-sm"
                    >
                      <Printer size={16} className="mr-2" /> 列印 EO
                    </button>
                  </>
                 )}
              </div>
              <div className="flex items-center space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">取消</button>
                <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg">儲存訂單</button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
      
      <div className="print-only">
        {printMode === 'EO' && <PrintableEO data={formData} />}
      </div>
    </>
  );
}
