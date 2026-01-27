import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth, storage } from './firebase';
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
  Users,
  Edit2, 
  FileText, 
  Utensils, 
  Truck, 
  Monitor, 
  CreditCard, 
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
  ChevronRight, 
  PieChart,
  Sparkles,
  MessageCircle,
  Loader2,
  Languages,
  Send // Added for AI
} from 'lucide-react';

// Firebase Imports
import { 
  signInWithEmailAndPassword, 
  signInWithCustomToken, 
  onAuthStateChanged, 
  signOut
} from "firebase/auth";
import { 
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
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";

// ==========================================
// SECTION 1: CONFIGURATION & CONSTANTS
// ==========================================

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
const DEFAULT_DRINK_PACKAGES = []; 
const DECOR_COLORS = ['白 (White)', '金 (Gold)', '紅 (Red)']; 
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS = { Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六', Sun: '日' };

// NEW: Revenue Allocation Departments
const DEPARTMENTS = [
  { key: 'kitchen', label: '廚房 (Kitchen)' },
  { key: 'dimsum', label: '點心 (Dim Sum)' },
  { key: 'roast', label: '燒味 (Roast)' },
  { key: 'bar', label: '水吧 (Bar)' },
  { key: 'liquor', label: '洋酒 (Liquor)' },
  { key: 'floor', label: '樓面 (Floor/Venue)' },
  { key: 'other', label: '其他 (Other)' }
];

const calculateDepartmentSplit = (data) => {
  const split = {
    kitchen: 0, dimsum: 0, roast: 0, bar: 0, liquor: 0, floor: 0, other: 0
  };

  // 1. Process Menus
  (data.menus || []).forEach(m => {
    const qty = parseFloat(m.qty) || 1;
    const allocation = m.allocation || {};
    
    // If allocation exists, use it
    let hasAllocation = false;
    Object.keys(allocation).forEach(deptKey => {
       const amount = parseFloat(allocation[deptKey]) || 0;
       if (amount > 0 && split[deptKey] !== undefined) {
          split[deptKey] += amount * qty;
          hasAllocation = true;
       }
    });

    // If NO allocation defined, dump strictly into Kitchen (Food) or Floor (if price > 0)
    // You can customize this fallback logic
    if (!hasAllocation) {
       split.kitchen += (parseFloat(m.price) || 0) * qty; 
    }
  });

  // 2. Process Drinks
  const dQty = parseFloat(data.drinksQty) || 1;
  const dAllocation = data.drinkAllocation || {};
  let dHasAllocation = false;
  
  Object.keys(dAllocation).forEach(deptKey => {
     const amount = parseFloat(dAllocation[deptKey]) || 0;
     if (amount > 0 && split[deptKey] !== undefined) {
        split[deptKey] += amount * dQty;
        dHasAllocation = true;
     }
  });
  
  if (!dHasAllocation) {
     // Default drinks to Bar
     split.bar += (parseFloat(data.drinksPrice) || 0) * dQty;
  }

  // 3. Process Custom Items
  (data.customItems || []).forEach(item => {
     const qty = parseFloat(item.qty) || 1;
     const total = (parseFloat(item.price) || 0) * qty;
     const cat = item.category || 'other';
     if (split[cat] !== undefined) {
        split[cat] += total;
     } else {
        split.other += total;
     }
  });

  // 4. Service Charge -> Usually goes to Floor/Company, but let's keep it separate or put in Floor
  // For this accounting view, we usually track Service Charge separately, but if you want to book it:
  // split.floor += calculateServiceCharge(data); <--- Optional

  return split;
};

// ==========================================
// SECTION 2: HELPER FUNCTIONS
// ==========================================

const formatMoney = (val) => {
  if (!val) return '0';
  // Remove existing commas to parse correctly
  const clean = val.toString().replace(/,/g, '');
  const number = parseFloat(clean);
  
  if (isNaN(number)) return '0';
  
  // ✅ UPDATED: Round to nearest integer to remove decimals
  return Math.round(number).toLocaleString('en-US');
};

const parseMoney = (val) => {
  return val.replace(/,/g, '');
};

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dateStr} (${day})`;
};

const calculateTotalAmount = (data) => {
  let baseForSC = 0;

  // 1. Menus
  let menusTotal = 0;
  (data.menus || []).forEach(m => {
    const p = parseFloat(m.price) || 0;
    const q = parseFloat(m.qty) || 1; 
    const line = p * q;
    menusTotal += line;
    if (m.applySC !== false) baseForSC += line; 
  });

  // NEW: Plating Fee Calculation (位上服務費)
  let platingTotal = 0;
  if (data.servingStyle === '位上') {
      const pFee = parseFloat(data.platingFee) || 0;
      const tables = parseFloat(data.tableCount) || 0;
      platingTotal = pFee * tables;
      
      // CHECK TOGGLE: Only add to base if applySC is true (or undefined/default)
      if (data.platingFeeApplySC !== false) {
          baseForSC += platingTotal;
      }
  }

  // 2. Drinks
  const dPrice = parseFloat(data.drinksPrice) || 0;
  const dQty = parseFloat(data.drinksQty) || 1; 
  const drinksTotal = dPrice * dQty;
  if (data.drinksApplySC !== false) baseForSC += drinksTotal;

  // 3. Custom Items
  let customTotal = 0;
  (data.customItems || []).forEach(item => {
    const p = parseFloat(item.price) || 0;
    const q = parseFloat(item.qty) || 1;
    const amt = p * q;
    customTotal += amt;
    if (item.applySC) baseForSC += amt;
  });

  // 4. Service Charge
  let sc = 0;
  if (data.enableServiceCharge !== false) {
      const scStr = (data.serviceCharge || '10%').toString().trim();
      const val = parseFloat(scStr.replace(/[^0-9.]/g, '')) || 0;
      const isExplicitPercent = scStr.includes('%');

      if (isExplicitPercent) {
          sc = baseForSC * (val / 100);
      } else {
          if (val > 0 && val <= 100) {
             sc = baseForSC * (val / 100);
          } else {
             sc = val;
          }
      }
  }
  const disc = parseFloat(data.discount) || 0;
  
  // Add platingTotal to the final sum
  return Math.round(menusTotal + platingTotal + drinksTotal + customTotal + sc - disc);
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
      {options.map(opt => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const lab = typeof opt === 'object' ? opt.label : opt;
        return <option key={val} value={val}>{lab}</option>
      })}
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

  // --- BULLETPROOF STRING BUILDER ---
  // 1. Combine checkboxes and manual input into one array
  // 2. .filter(Boolean) REMOVES all empty strings, nulls, and undefined values
  // 3. .join(', ') combines them. 
  // Result: No leading commas, ever.
  const buildVenueString = (checkboxes, manualInput) => {
    const allParts = [
      ...(checkboxes || []), 
      manualInput ? manualInput.trim() : null
    ];
    
    // This filter is the magic fix:
    return allParts.filter(part => part && part.length > 0).join(', ');
  };

  const handleCheckboxChange = (loc) => {
    let newLocs = [...selectedLocs];
    
    // Logic: Toggle '全場' vs Individual Zones
    if (loc === '全場') {
      if (newLocs.includes('全場')) {
        // Uncheck All
        newLocs = newLocs.filter(l => l !== '全場' && !INDIVIDUAL_ZONES.includes(l));
      } else {
        // Check All
        newLocs = Array.from(new Set([...newLocs, '全場', ...INDIVIDUAL_ZONES]));
      }
    } else {
      // Individual Zone Logic
      if (newLocs.includes(loc)) {
        newLocs = newLocs.filter(l => l !== loc);
        newLocs = newLocs.filter(l => l !== '全場'); // Uncheck All if one removed
      } else {
        newLocs.push(loc);
        const allSelected = INDIVIDUAL_ZONES.every(z => newLocs.includes(z));
        if (allSelected && !newLocs.includes('全場')) {
          newLocs.push('全場'); // Check All if all zones selected
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      selectedLocations: newLocs,
      venueLocation: buildVenueString(newLocs, prev.locationOther) // ✅ Use Bulletproof Builder
    }));
  };

  const handleOtherChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      locationOther: val,
      venueLocation: buildVenueString(prev.selectedLocations, val) // ✅ Use Bulletproof Builder
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
      {/* Debug: confirm the string is clean */}
      {/* <p className="text-[10px] text-slate-400 mt-1">Preview: {formData.venueLocation}</p> */}
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
// SECTION 5: PRINTABLE VIEWS (UPDATED REVENUE DETAIL)
// ==========================================

const PrintableEO = ({ data, printMode }) => {
  if (!data) return null;

  // ==========================================
  // 1. HELPER COMPONENTS & FUNCTIONS
  // ==========================================
  // --- HELPER: Strip English Lines (Keep only lines with Chinese) ---
  const onlyChinese = (text) => {
    if (!text) return '';
    return text
      .split('\n') // Split into lines
      .filter(line => /[\u4e00-\u9fa5]/.test(line)) // Keep ONLY lines with Chinese characters
      .join('\n'); // Join back together
  };
  
  const DetailRow = ({ label, value, widthClass = "w-1/4", highlight = false }) => {
    if (!value) return null;
    return (
      <div className={`mb-3 ${widthClass} px-2 inline-block align-top`}>
        <span className="text-slate-500 text-[10px] block uppercase tracking-wider font-bold mb-1">{label}</span>
        <span className={`text-slate-900 font-semibold text-sm whitespace-pre-wrap leading-snug block ${highlight ? 'text-red-600' : ''}`}>{value}</span>
      </div>
    );
  };

  const Section = ({ title, children, className = "", color = "slate" }) => (
    <div className={`mb-4 border-b border-${color}-200 pb-3 ${className}`}>
      <h3 className={`font-bold text-${color}-800 text-sm mb-3 border-l-4 border-${color}-800 pl-2 bg-${color}-50 py-1 uppercase`}>{title}</h3>
      <div className="flex flex-wrap -mx-2">
        {children}
      </div>
    </div>
  );

  const CheckItem = ({ label, checked }) => (
    <div className={`flex items-center w-1/4 mb-2 px-2 ${checked ? 'opacity-100' : 'opacity-30 grayscale'}`}>
      <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${checked ? 'bg-black border-black text-white' : 'border-slate-300'}`}>
        {checked && "✓"}
      </div>
      <span className={`text-xs font-bold ${checked ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
    </div>
  );

  // Mappings
  const equipmentMap = { podium: '講台', mic: '咪', micStand: '咪架', cake: '蛋糕', nameSign: '禮堂字牌' };
  const decorationMap = { ceremonyService: '證婚桌', ceremonyChairs: '證婚椅子', flowerPillars: '花柱佈置', guestBook: '簽名冊', easel: '畫架', mahjong: '麻雀枱', invites: '喜帖', wreaths: '花圈' };
  const avMap = { ledBig: '大禮堂LED', projBig: '大禮堂Projector', ledSmall: '小禮堂LED', projSmall: '小禮堂Projector', spotlight: '聚光燈', movingHead: '電腦燈', entranceLight: '進場燈', tv60v: '60"TV(直)', tv60h: '60"TV(橫)', mic: '咪', speaker: '喇叭' };

  // Helper: Date
  const formatDateWithDay = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  };
  const formatShortDate = (dateStr) => {
     if (!dateStr) return '--/--';
     const date = new Date(dateStr);
     return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // --- HELPER: Clean Location String (Remove leading commas) ---
  const cleanLocation = (loc) => {
    if (!loc) return '';
    // Removes leading comma and whitespace (e.g. ", A" -> "A")
    return loc.replace(/^,\s*/, ''); 
  };
  // --- Financial Logic (Unified) ---
  const platingTotal = (data.servingStyle === '位上') ? (parseFloat(data.platingFee) || 0) * (parseFloat(data.tableCount) || 0) : 0;

  const subtotal = (data.menus || []).reduce((acc, m) => acc + ((m.price||0)*(m.qty||1)), 0) 
                 + platingTotal 
                 + ((data.drinksPrice||0)*(data.drinksQty||1)) 
                 + (data.customItems||[]).reduce((acc, i) => acc + ((i.price||0)*(i.qty||1)), 0);
  
  let scBase = 0;
  (data.menus || []).forEach(m => { if(m.applySC !== false) scBase += (m.price || 0) * (m.qty || 1); });
  if (platingTotal > 0 && data.platingFeeApplySC !== false) {
      scBase += platingTotal;
  }
  if(data.drinksApplySC !== false) scBase += (data.drinksPrice || 0) * (data.drinksQty || 1);
  (data.customItems || []).forEach(i => { if(i.applySC) scBase += (i.price || 0) * (i.qty || 1); });
  
  let serviceChargeVal = 0;
  let scLabel = 'Fixed';

  if (data.enableServiceCharge !== false) {
      const scStr = (data.serviceCharge || '10%').toString().trim();
      const val = parseFloat(scStr.replace(/[^0-9.]/g, '')) || 0;
      const isExplicitPercent = scStr.includes('%');

      if (isExplicitPercent) {
          serviceChargeVal = scBase * (val / 100);
          scLabel = scStr;
      } else {
          if (val > 0 && val <= 100) {
             serviceChargeVal = scBase * (val / 100);
             scLabel = `${val}%`; 
          } else {
             serviceChargeVal = val;
             scLabel = 'Fixed';
          }
      }
  }

  const discountVal = parseFloat(data.discount) || 0;
  const grandTotal = subtotal + serviceChargeVal - discountVal;

  // --- Allocation Logic ---
  const getDetailedAllocation = () => {
    const allocation = {};
    DEPARTMENTS.forEach(dept => {
        allocation[dept.key] = { label: dept.label, total: 0, items: [] };
    });
    if(!allocation['other']) allocation['other'] = { label: '其他 (Other)', total: 0, items: [] };

    const addItem = (key, name, subLabel, qty, unitPrice, totalAmount) => {
        if(totalAmount === 0) return;
        let group = allocation[key] ? key : 'other';
        allocation[group].total += totalAmount;
        allocation[group].items.push({ name, subLabel, qty: parseFloat(qty), unit: parseFloat(unitPrice), amount: totalAmount });
    };

    // 1. Menus
    (data.menus || []).forEach(m => {
        const qty = parseFloat(m.qty) || 1;
        const price = parseFloat(m.price) || 0;
        const totalLineAmount = price * qty;

        if (m.allocation && Object.keys(m.allocation).length > 0) {
            let nonKitchenAllocated = 0;
            Object.entries(m.allocation).forEach(([dept, unitVal]) => {
                if (dept !== 'kitchen') {
                    const val = parseFloat(unitVal) || 0;
                    if (val !== 0) {
                        const lineAmt = val * qty;
                        nonKitchenAllocated += lineAmt;
                        const deptLabel = DEPARTMENTS.find(d=>d.key===dept)?.label.split(' ')[0];
                        addItem(dept, m.title, deptLabel, qty, val, lineAmt);
                    }
                }
            });
            const kitchenTotal = totalLineAmount - nonKitchenAllocated;
            if (kitchenTotal !== 0) {
                const unitKitchen = price - (nonKitchenAllocated / qty);
                addItem('kitchen', m.title, 'Balance', qty, unitKitchen, kitchenTotal);
            }
        } else {
            addItem('kitchen', m.title, '', qty, price, totalLineAmount);
        }
    });

    // 2. Plating Fee
    if (platingTotal > 0) {
        addItem('kitchen', '位上服務費', `${data.tableCount}席 @ $${data.platingFee}`, data.tableCount, data.platingFee, platingTotal);
    }

    // 3. Drinks
    const dQty = parseFloat(data.drinksQty) || 1;
    const dPrice = parseFloat(data.drinksPrice) || 0;
    const dTotal = dPrice * dQty;
    const dName = data.drinksPackage || 'Drinks Package';
    
    if (data.drinkAllocation && Object.keys(data.drinkAllocation).length > 0) {
         let nonBarAllocated = 0;
         Object.entries(data.drinkAllocation).forEach(([dept, unitVal]) => {
             if (dept !== 'bar') {
                 const val = parseFloat(unitVal) || 0;
                 if (val !== 0) {
                     const lineAmt = val * dQty;
                     nonBarAllocated += lineAmt;
                     addItem(dept, dName, dept, dQty, val, lineAmt);
                 }
             }
         });
         const barTotal = dTotal - nonBarAllocated;
         if (barTotal !== 0) {
             const unitBar = dPrice - (nonBarAllocated / dQty);
             addItem('bar', dName, 'Water Bar', dQty, unitBar, barTotal);
         }
    } else {
         addItem('bar', dName, '', dQty, dPrice, dTotal);
    }

    // 4. Custom Items
    (data.customItems || []).forEach(i => {
        const qty = parseFloat(i.qty) || 1;
        const price = parseFloat(i.price) || 0;
        const total = price * qty;
        addItem(i.category || 'other', i.name, '', qty, price, total);
    });

    return allocation;
  };

  const detailedAlloc = getDetailedAllocation();

  const Header = ({ title, copyType, badgeColor = "bg-slate-900" }) => (
    <div className="flex justify-between items-end border-b-4 border-slate-900 pb-2 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight leading-none uppercase">{title}</h1>
        <p className="text-slate-500 text-xs mt-1">Order ID: {data.orderId}</p>
      </div>
      <div className="text-right">
         <div className={`inline-block ${badgeColor} text-white px-3 py-1 text-sm font-bold rounded mb-1 uppercase`}>{copyType}</div>
         <div className="text-sm font-bold text-slate-800">{formatDateWithDay(data.date)}</div>
      </div>
    </div>
  );

  const EventSummary = () => (
    <div className="flex flex-wrap bg-slate-50 p-2 rounded mb-6 border border-slate-100">
        <DetailRow label="日期 (Date)" value={formatDateWithDay(data.date)} widthClass="w-1/4" highlight={true} />
        <DetailRow label="活動名稱" value={data.eventName} widthClass="w-1/4" />
        <DetailRow label="位置" value={cleanLocation(data.venueLocation)} widthClass="w-1/4" />
        <DetailRow label="時間" value={`${data.startTime} - ${data.endTime}`} widthClass="w-1/4" />
        <DetailRow label="起菜時間" value={data.servingTime} widthClass="w-1/4" highlight={true} />
        <DetailRow label="席數" value={`${data.tableCount || 0} 席`} widthClass="w-1/4" />
        <DetailRow label="人數" value={`${data.guestCount || 0} 人`} widthClass="w-1/4" />
        <DetailRow label="類型" value={data.eventType} widthClass="w-1/4" />
    </div>
  );

  // ==========================================
  // VIEW 1: BRIEFING MODE
  // ==========================================
  if (printMode === 'BRIEFING') {
    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white text-sm p-4">
        <style>{`@media print { @page { margin: 5mm; size: A4; } }`}</style>
        <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-4">
           <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">FLOOR STAFF BRIEFING</div>
              <h1 className="text-3xl font-black mt-1">{data.eventName}</h1>
              <div className="flex gap-4 mt-2 text-sm font-bold">
                 <span className="bg-black text-white px-2 py-1 rounded">{formatDateWithDay(data.date)}</span>
                 <span className="border border-black px-2 py-1 rounded">{data.startTime} - {data.endTime}</span>
                 <span className="text-red-600 border border-red-600 px-2 py-1 rounded">{data.servingTime ? `${data.servingTime} 起菜` : '起菜時間待定'}</span>
              </div>
           </div>
           <div className="text-right"><div className="text-4xl font-black text-slate-200">BRIEF</div></div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
           <div className="border-2 border-slate-300 border-dashed rounded-xl h-32 flex flex-col items-center justify-center bg-slate-50"><span className="text-slate-400 text-xs font-bold uppercase mb-2">負責檯號 (Table Numbers)</span><div className="text-4xl font-black text-slate-200">寫在此處</div></div>
           <div className="border-2 border-slate-300 border-dashed rounded-xl h-32 flex flex-col items-center justify-center bg-slate-50"><span className="text-slate-400 text-xs font-bold uppercase mb-2">員工姓名/編號 (Staff Name)</span><div className="text-4xl font-black text-slate-200">寫在此處</div></div>
        </div>
        <div className="mb-6"><div className="flex gap-4"><div className="flex-1 border-2 border-red-500 rounded-lg p-3 bg-red-50"><div className="flex justify-between items-start mb-2"><span className="text-red-700 font-bold flex items-center"><AlertTriangle size={16} className="mr-1"/> 過敏 / 特別餐 (Allergies)</span><span className="text-[10px] text-red-400">請填寫檯號</span></div><div className="min-h-[80px]"><p className="text-lg font-bold text-red-900 whitespace-pre-wrap">{data.allergies || data.specialMenuReq || '暫無特別記錄'}</p></div><div className="border-b border-red-200 mt-6"></div><div className="border-b border-red-200 mt-6"></div></div><div className="w-1/3 border-2 border-blue-200 rounded-lg p-3 bg-blue-50"><span className="text-blue-700 font-bold block mb-2"><Coffee size={16} className="inline mr-1"/> 酒水 (Drinks)</span><p className="text-sm font-bold text-blue-900 whitespace-pre-wrap">{data.drinksPackage || '未定'}</p></div></div></div>
        <div className="border-2 border-slate-800 rounded-xl overflow-hidden"><div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center"><span className="font-bold">餐單 (Menu Reference)</span><span className="text-xs bg-slate-600 px-2 py-1 rounded">{data.servingStyle}</span></div><div className="p-4 bg-white min-h-[300px]"><div className="space-y-6">{data.menus && data.menus.length > 0 ? (data.menus.map((menu, idx) => (<div key={idx}>{menu.title && <h4 className="font-bold underline mb-2 text-lg">{menu.title}</h4>}<p className="text-base font-medium leading-relaxed whitespace-pre-wrap text-slate-800">{onlyChinese(menu.content)}</p></div>))) : (<p className="text-lg font-medium leading-relaxed">{data.menuType}</p>)}</div></div></div>
        <div className="mt-4 text-xs text-slate-500"><div><span className="font-bold block text-slate-700">其他備註:</span> {data.otherNotes || '無'}</div></div>
      </div>
    );
  }

// ==========================================
  // VIEW 2: QUOTATION MODE (EN)
  // ==========================================
  if (printMode === 'QUOTATION') {
    const BRAND_COLOR = '#A57C00'; 
    
    // Recalculate totals to ensure accuracy
    const platingTotal = (data.servingStyle === '位上') ? (parseFloat(data.platingFee) || 0) * (parseFloat(data.tableCount) || 0) : 0;
    const subtotal = (data.menus || []).reduce((acc, m) => acc + ((m.price||0)*(m.qty||1)), 0) 
                   + platingTotal 
                   + ((data.drinksPrice||0)*(data.drinksQty||1)) 
                   + (data.customItems||[]).reduce((acc, i) => acc + ((i.price||0)*(i.qty||1)), 0);
    
    let scBase = 0;
    (data.menus || []).forEach(m => { if(m.applySC !== false) scBase += (m.price || 0) * (m.qty || 1); });
    if (platingTotal > 0 && data.platingFeeApplySC !== false) scBase += platingTotal;
    if(data.drinksApplySC !== false) scBase += (data.drinksPrice || 0) * (data.drinksQty || 1);
    (data.customItems || []).forEach(i => { if(i.applySC) scBase += (i.price || 0) * (i.qty || 1); });

    let serviceChargeVal = 0;
    let scLabel = 'Fixed';
    if (data.enableServiceCharge !== false) {
       const scStr = (data.serviceCharge || '10%').toString().trim();
       const val = parseFloat(scStr.replace(/[^0-9.]/g, '')) || 0;
       if (scStr.includes('%') || (val > 0 && val <= 100)) {
           serviceChargeVal = scBase * (val / 100);
           scLabel = `${val}%`; 
       } else {
           serviceChargeVal = val;
       }
    }
    const discountVal = parseFloat(data.discount) || 0;
    const grandTotal = subtotal + serviceChargeVal - discountVal;
    const totalDeposits = (Number(data.deposit1)||0) + (Number(data.deposit2)||0) + (Number(data.deposit3)||0);

    // --- DATE LOGIC ---
    let balanceDueDateDisplay = '';
    if (data.balanceDueDateType === 'manual' && data.balanceDueDateOverride) {
        balanceDueDateDisplay = data.balanceDueDateOverride;
    } else if (data.balanceDueDateType === '10daysPrior' && data.date) {
        const d = new Date(data.date);
        d.setDate(d.getDate() - 10);
        balanceDueDateDisplay = d.toLocaleDateString('en-CA'); 
    } else {
        balanceDueDateDisplay = data.date || 'Event Day';
    }

    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white p-6 min-h-screen relative flex flex-col">
        <style>{`@media print { @page { margin: 10mm; size: A4; } body { -webkit-print-color-adjust: exact; } }`}</style>
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-4 pb-4 mb-6" style={{ borderColor: BRAND_COLOR }}>
            <div className="max-w-[70%]">
                <div className="mb-1" style={{ color: BRAND_COLOR }}>
                    <span className="text-3xl font-black tracking-tight block leading-none">璟瓏軒</span>
                    <span className="text-xs font-bold tracking-widest uppercase block mt-1">King Lung Heen</span>
                </div>
                <div className="text-[10px] text-slate-500 space-y-0.5 font-medium leading-tight mt-2">
                    <p>尖沙咀西九文化區博物館道8號香港故宮文化博物館4樓</p>
                    <p>4/F, Hong Kong Palace Museum, 8 Museum Drive, West Kowloon, TST</p>
                    <div className="flex gap-3 mt-1 text-slate-600 font-bold">
                        <span>Tel: +852 2788 3939</span>
                        <span>Banquet Hotline: +852 5222 6066</span>
                    </div>
                    <p className="font-bold underline" style={{ color: BRAND_COLOR }}>Email: banquet@kinglungheen.com</p>
                </div>
            </div>
            <div className="text-right">
                <h1 className="text-3xl font-light text-slate-300 uppercase tracking-widest mb-1">Quotation</h1>
                <div className="inline-block text-right">
                    <p className="text-xs font-bold text-slate-700">NO: {data.orderId}</p>
                    <p className="text-xs text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
            </div>
        </div>

        {/* Client & Event Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-1 border-b border-slate-200 pb-0.5">Client Info</h3>
                
                {data.printSettings?.quotation?.showClientInfo !== false ? (
                    <div className="space-y-0.5">
                        <p className="font-bold text-sm text-slate-900">{data.clientName}</p>
                        {data.companyName && <p className="text-xs text-slate-600 font-medium">{data.companyName}</p>}
                        <p className="text-xs text-slate-500">{data.clientPhone}</p>
                        <p className="text-xs text-slate-500">{data.clientEmail}</p>
                    </div>
                ) : (
                    <div className="py-4 text-xs text-slate-400 italic">
                        (Client details hidden)
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-1 border-b border-slate-200 pb-0.5">Event Details</h3>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                    <span className="text-slate-500">Event:</span>
                    <span className="font-bold text-slate-900">{data.eventName}</span>
                    <span className="text-slate-500">Date:</span>
                    <span className="font-bold text-slate-900">{formatDateWithDay(data.date)}</span>
                    <span className="text-slate-500">Time:</span>
                    <span className="font-bold text-slate-900">{data.startTime} - {data.endTime}</span>
                    <span className="text-slate-500">Venue:</span>
                    <span className="font-bold text-slate-900">{cleanLocation(data.venueLocation)}</span>
                    <span className="text-slate-500">Guests:</span>
                    <span className="font-bold text-slate-900">{data.guestCount} Pax / {data.tableCount} Tables</span>
                </div>
            </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 flex-1">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b-2 border-slate-800 text-slate-600">
                        <th className="text-left py-1 w-[55%] uppercase tracking-wider">Description</th>
                        <th className="text-right py-1 w-[15%] uppercase tracking-wider">Unit Price</th>
                        <th className="text-center py-1 w-[10%] uppercase tracking-wider">Qty</th>
                        <th className="text-right py-1 w-[20%] uppercase tracking-wider">Amount (HKD)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(data.menus || []).map((m, i) => (
                        <tr key={`m-${i}`}>
                            <td className="py-2 pr-4 align-top">
                                <p className="font-bold text-slate-900 mb-0.5">{m.title}</p>
                                <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">{m.content}</p>
                            </td>
                            <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(m.price)}</td>
                            <td className="py-2 text-center align-top text-slate-600">{m.qty}</td>
                            <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney((m.price||0)*(m.qty||1))}</td>
                        </tr>
                    ))}
                    
                    {data.servingStyle === '位上' && parseFloat(data.platingFee) > 0 && (
                        <tr>
                            <td className="py-2 pr-4 align-top">
                                <p className="font-bold text-slate-900">Plating Service Fee (位上服務費)</p>
                            </td>
                            <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(data.platingFee)}</td>
                            <td className="py-2 text-center align-top text-slate-600">{data.tableCount}</td>
                            <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(platingTotal)}</td>
                        </tr>
                    )}

                    {data.drinksPackage && (
                        <tr>
                            <td className="py-2 pr-4 align-top">
                                <p className="font-bold text-slate-900 mb-0.5">Beverage Package</p>
                                <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">{data.drinksPackage}</p>
                            </td>
                            <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(data.drinksPrice)}</td>
                            <td className="py-2 text-center align-top text-slate-600">{data.drinksQty}</td>
                            <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney((data.drinksPrice||0)*(data.drinksQty||1))}</td>
                        </tr>
                    )}

                    {(data.customItems || []).map((item, i) => (
                        <tr key={`c-${i}`}>
                            <td className="py-2 pr-4 align-top">
                                <p className="font-bold text-slate-900">{item.name}</p>
                            </td>
                            <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(item.price)}</td>
                            <td className="py-2 text-center align-top text-slate-600">{item.qty}</td>
                            <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney((item.price||0)*(item.qty||1))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-6">
            <div className="w-1/2 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">${formatMoney(subtotal)}</span>
                </div>
                {serviceChargeVal > 0 && (
                    <div className="flex justify-between text-xs text-slate-600">
                        <span>Service Charge ({scLabel})</span>
                        <span className="font-mono">+${formatMoney(serviceChargeVal)}</span>
                    </div>
                )}
                {discountVal > 0 && (
                    <div className="flex justify-between text-xs font-bold" style={{ color: BRAND_COLOR }}>
                        <span>Discount</span>
                        <span className="font-mono">-${formatMoney(discountVal)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="font-bold text-sm">Grand Total (HKD)</span>
                    <span className="font-black text-xl font-mono">${formatMoney(grandTotal)}</span>
                </div>

                {/* Payment Schedule (Optional for Quote) */}
                {Number(data.totalAmount) > 0 && (
                    <div className="mt-4 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Schedule</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Due Date</span>
                        </div>
                        <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-100">
                            {[
                                { label: '1st Deposit', date: data.deposit1Date,amount: data.deposit1, },
                                { label: '2nd Deposit', date: data.deposit2Date,amount: data.deposit2, },
                                { label: '3rd Deposit', date: data.deposit3Date,amount: data.deposit3, },
                            ].map((item, idx) => (
                                Number(item.amount) > 0 && (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-600 font-medium">{item.label}</span>
                                        <div className="text-right">
                                            <span className="font-mono font-bold mr-4 text-slate-700">${formatMoney(item.amount)}</span>
                                            <span className="text-[10px] text-slate-500 min-w-[70px] inline-block text-right tabular-nums">
                                                {item.date || 'TBC'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            ))}

                            {/* ✅ FINAL BALANCE ROW (UPDATED WITH DATE) */}
                            <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1">
                                <span className="text-slate-600 font-bold">Final Balance</span>
                                <div className="text-right">
                                    <span className="font-mono font-bold mr-4 text-slate-700">
                                        ${formatMoney(Number(data.totalAmount) - totalDeposits)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 min-w-[70px] inline-block text-right tabular-nums">
                                        {balanceDueDateDisplay}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-12 flex justify-between items-end">
             <div className="text-[9px] text-slate-400 leading-tight">
                <p className="mb-1 font-bold text-slate-500">Terms & Conditions:</p>
                1. This quotation is valid for 14 days.<br/>
                2. Cheques should be made payable to "best wish investment limited".<br/>
                3. This document is computer generated. No signature is required.
             </div>
             <div className="w-1/3">
                <div className="border-b border-slate-800 mb-2"></div>
                <p className="font-bold text-xs">Confirmed & Accepted by</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{data.clientName}</p>
             </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 4: CONTRACT MODE (EN) - FULL CONTENT
  // ==========================================
  if (printMode === 'CONTRACT') {
    const BRAND_COLOR = '#A57C00'; 
    const totalDeposits = (Number(data.deposit1)||0) + (Number(data.deposit2)||0) + (Number(data.deposit3)||0);
    const minSpendInfo = data.minSpendInfo || null;

    // Calculate Breakdown for Charges Summary
    const platingTotal = (data.servingStyle === '位上') ? (parseFloat(data.platingFee) || 0) * (parseFloat(data.tableCount) || 0) : 0;
    const subtotal = (data.menus || []).reduce((acc, m) => acc + ((m.price||0)*(m.qty||1)), 0) 
                   + platingTotal 
                   + ((data.drinksPrice||0)*(data.drinksQty||1)) 
                   + (data.customItems||[]).reduce((acc, i) => acc + ((i.price||0)*(i.qty||1)), 0);

    // Re-calculate Service Charge for Contract View
    let scBase = 0;
    (data.menus || []).forEach(m => { if(m.applySC !== false) scBase += (m.price || 0) * (m.qty || 1); });
    if (platingTotal > 0 && data.platingFeeApplySC !== false) scBase += platingTotal;
    if(data.drinksApplySC !== false) scBase += (data.drinksPrice || 0) * (data.drinksQty || 1);
    (data.customItems || []).forEach(i => { if(i.applySC) scBase += (i.price || 0) * (i.qty || 1); });

    let serviceChargeVal = 0;
    let scLabel = 'Fixed';
    if (data.enableServiceCharge !== false) {
       const scStr = (data.serviceCharge || '10%').toString().trim();
       const val = parseFloat(scStr.replace(/[^0-9.]/g, '')) || 0;
       if (scStr.includes('%') || (val > 0 && val <= 100)) {
           serviceChargeVal = scBase * (val / 100);
           scLabel = `${val}%`;
       } else {
           serviceChargeVal = val;
       }
    }
    const discountVal = parseFloat(data.discount) || 0;
    const grandTotal = subtotal + serviceChargeVal - discountVal;

    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white min-h-screen relative flex flex-col text-xs leading-tight">
        <style>{`
          @media print { 
            @page { margin: 15mm; size: A4; } 
            body { -webkit-print-color-adjust: exact; } 
            .page-break { page-break-before: always; }
            .legal-text { font-size: 8px; text-align: justify; line-height: 1.3; }
            .legal-header { font-weight: bold; margin-top: 8px; margin-bottom: 2px; text-transform: uppercase; font-size: 9px; }
          }
        `}</style>

        {/* --- PAGE 1: PARTICULARS & DETAILS --- */}
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-4 pb-4 mb-6" style={{ borderColor: BRAND_COLOR }}>
            <div className="max-w-[70%]">
                <div className="mb-1" style={{ color: BRAND_COLOR }}>
                    <span className="text-2xl font-black tracking-tight block leading-none">璟瓏軒</span>
                    <span className="text-xs font-bold tracking-widest uppercase block mt-1">King Lung Heen</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-2">
                    <p>4/F, Hong Kong Palace Museum, 8 Museum Drive, West Kowloon, TST</p>
                    <p className="mt-1">Tel: +852 2788 3939 | Hotline: +852 5222 6066 | Email: banquet@kinglungheen.com</p>
                </div>
            </div>
            <div className="text-right">
                <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-widest mb-1">Banquet Agreement</h1>
                <p className="text-xs font-bold text-slate-700">Agreement No: {data.orderId}</p>
                <p className="text-xs text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
        </div>

        {/* Section 1: Event Particulars */}
        <div className="mb-6 border border-slate-300">
            <div className="bg-slate-100 px-2 py-1 font-bold border-b border-slate-300 text-slate-700">EVENT PARTICULARS</div>
            <div className="grid grid-cols-2">
                <div className="p-2 border-r border-slate-300 border-b">
                    <span className="block text-[9px] text-slate-500 uppercase">Client Name</span>
                    <span className="font-bold text-sm">{data.clientName}</span>
                </div>
                <div className="p-2 border-b border-slate-300">
                    <span className="block text-[9px] text-slate-500 uppercase">Company</span>
                    <span className="font-bold text-sm">{data.companyName || '-'}</span>
                </div>
                <div className="p-2 border-r border-slate-300 border-b">
                    <span className="block text-[9px] text-slate-500 uppercase">Contact / Email</span>
                    <span className="font-bold text-sm">{data.clientPhone} / {data.clientEmail}</span>
                </div>
                <div className="p-2 border-b border-slate-300">
                    <span className="block text-[9px] text-slate-500 uppercase">Event Name</span>
                    <span className="font-bold text-sm">{data.eventName}</span>
                </div>
                <div className="p-2 border-r border-slate-300 border-b">
                    <span className="block text-[9px] text-slate-500 uppercase">Date & Time</span>
                    <span className="font-bold text-sm">
                        {formatDateWithDay(data.date)} | {data.startTime} - {data.endTime}
                    </span>
                </div>
                <div className="p-2 border-b border-slate-300">
                    <span className="block text-[9px] text-slate-500 uppercase">Venue & Attendance</span>
                    <span className="font-bold text-sm">{cleanLocation(data.venueLocation)} | {data.tableCount} Tables / {data.guestCount} Pax</span>
                </div>
            </div>
        </div>

        {/* Section 2: Financials & Payment Schedule */}
        <div className="mb-6 flex gap-6">
            
            {/* LEFT: Charges Detail */}
            <div className="w-1/2 border border-slate-300 flex flex-col">
                <div className="bg-slate-100 px-2 py-1 font-bold border-b border-slate-300 text-slate-700">CHARGES DETAIL</div>
                <div className="p-2 flex flex-col flex-1">
                    <div className="flex text-[9px] font-bold text-slate-400 border-b border-slate-200 pb-1 mb-1">
                        <div className="flex-1">ITEM</div>
                        <div className="w-14 text-right">UNIT ($)</div>
                        <div className="w-8 text-center">QTY</div>
                        <div className="w-16 text-right">TOTAL ($)</div>
                    </div>

                    {(data.menus || []).map((m, i) => (
                        <div key={`m-${i}`} className="flex text-xs mb-1.5 items-baseline">
                            <div className="flex-1 pr-1 font-medium text-slate-800 leading-tight">{m.title}</div>
                            <div className="w-14 text-right font-mono text-[10px] text-slate-500">${formatMoney(m.price)}</div>
                            <div className="w-8 text-center text-[10px] text-slate-500">{m.qty}</div>
                            <div className="w-16 text-right font-mono font-bold text-slate-700">${formatMoney((m.price||0)*(m.qty||1))}</div>
                        </div>
                    ))}

                    {data.servingStyle === '位上' && parseFloat(data.platingFee) > 0 && (
                        <div className="flex text-xs mb-1.5 items-baseline text-blue-800">
                            <div className="flex-1 pr-1 font-medium leading-tight">Plating Fee</div>
                            <div className="w-14 text-right font-mono text-[10px]">${formatMoney(data.platingFee)}</div>
                            <div className="w-8 text-center text-[10px]">{data.tableCount}</div>
                            <div className="w-16 text-right font-mono font-bold">${formatMoney(platingTotal)}</div>
                        </div>
                    )}

                    <div className="flex text-xs mb-1.5 items-baseline">
                        <div className="flex-1 pr-1 font-medium text-slate-800 leading-tight">{data.drinksPackage || 'Beverage Package'}</div>
                        <div className="w-14 text-right font-mono text-[10px] text-slate-500">${formatMoney(data.drinksPrice)}</div>
                        <div className="w-8 text-center text-[10px] text-slate-500">{data.drinksQty}</div>
                        <div className="w-16 text-right font-mono font-bold text-slate-700">${formatMoney((data.drinksPrice||0)*(data.drinksQty||1))}</div>
                    </div>

                    {(data.customItems || []).map((item, i) => (
                        <div key={`c-${i}`} className="flex text-xs mb-1.5 items-baseline">
                            <div className="flex-1 pr-1 font-medium text-slate-800 leading-tight">{item.name}</div>
                            <div className="w-14 text-right font-mono text-[10px] text-slate-500">${formatMoney(item.price)}</div>
                            <div className="w-8 text-center text-[10px] text-slate-500">{item.qty}</div>
                            <div className="w-16 text-right font-mono font-bold text-slate-700">${formatMoney((item.price||0)*(item.qty||1))}</div>
                        </div>
                    ))}

                    <div className="flex-1 min-h-[10px]"></div>

                    <div className="mt-2 border-t border-slate-300 pt-2 space-y-1 bg-slate-50/50 -mx-2 px-2 pb-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Subtotal:</span>
                            <span className="font-mono">${formatMoney(subtotal)}</span>
                        </div>
                        {serviceChargeVal > 0 && (
                            <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Service Charge ({scLabel}):</span>
                                <span className="font-mono">${formatMoney(serviceChargeVal)}</span>
                            </div>
                        )}
                        {discountVal > 0 && (
                            <div className="flex justify-between text-[10px] text-red-600 font-bold">
                                <span>Discount:</span>
                                <span className="font-mono">-${formatMoney(discountVal)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-1 mt-1 text-slate-900">
                            <span>TOTAL ESTIMATED:</span>
                            <span className="font-mono">${formatMoney(grandTotal)}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 text-right italic">
                            * Min. Spend: ${minSpendInfo ? formatMoney(minSpendInfo.amount) : 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* RIGHT: Payment Schedule */}
            <div className="w-1/2 border border-slate-300 flex flex-col">
                <div className="bg-slate-100 px-2 py-1 font-bold border-b border-slate-300 text-slate-700">PAYMENT SCHEDULE</div>
                <div className="p-2 space-y-1 flex-1 flex flex-col">
                    {[
                        { l: '1st Deposit', a: data.deposit1, d: data.deposit1Date },
                        { l: '2nd Deposit', a: data.deposit2, d: data.deposit2Date },
                        { l: '3rd Deposit', a: data.deposit3, d: data.deposit3Date },
                    ].map((item, i) => Number(item.a) > 0 && (
                        <div key={i} className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">{item.l} <span className="text-[9px] text-slate-400">({item.d || 'TBC'})</span>:</span>
                            <span className="font-mono font-bold">${formatMoney(item.a)}</span>
                        </div>
                    ))}
                    
                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-1 mb-4">
                        <span className="font-bold text-slate-900 text-xs">
                            Balance Due <span className="text-[9px] font-normal text-slate-500 block">({data.balanceDueDateType === '10daysPrior' ? '10 Days Prior' : 'Event Day'})</span>
                        </span>
                        <span className="font-mono font-black text-sm">${formatMoney(Number(data.totalAmount) - totalDeposits)}</span>
                    </div>

                    <div className="mt-auto">
                        <div className="bg-blue-50/50 border border-blue-100 rounded p-2 text-[10px] text-slate-600">
                            <p className="font-bold text-blue-800 mb-1 uppercase text-[9px] tracking-wider border-b border-blue-100 pb-0.5">Bank Transfer Info</p>
                            <div className="grid grid-cols-[50px_1fr] gap-x-1 gap-y-0.5 leading-tight">
                                <span className="text-slate-400">Bank:</span>
                                <span>Bank of China (HK)</span>
                                <span className="text-slate-400">Name:</span>
                                <span className="font-bold text-slate-800">King Lung Heen</span>
                                <span className="text-slate-400">Acc No:</span>
                                <span className="font-mono font-bold text-slate-900 text-sm">012-875-2-082180-1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Section 3: Menu & Arrangements */}
        <div className="mb-6 border border-slate-300">
             <div className="bg-slate-100 px-2 py-1 font-bold border-b border-slate-300 text-slate-700">MENU & ARRANGEMENTS</div>
             <div className="p-4 grid grid-cols-2 gap-8">
                <div>
                    <h4 className="font-bold underline mb-2 text-xs uppercase">Food & Beverage</h4>
                    {data.menus && data.menus.map((m, i) => (
                        <div key={i} className="mb-2">
                            <p className="font-bold text-sm">{m.title}</p>
                            <p className="text-[10px] text-slate-600 whitespace-pre-wrap">{m.content}</p>
                        </div>
                    ))}
                    {data.drinksPackage && (
                        <div className="mt-2">
                            <p className="font-bold text-sm">Beverage Package</p>
                            <p className="text-[10px] text-slate-600 whitespace-pre-wrap">{data.drinksPackage}</p>
                        </div>
                    )}
                </div>
                <div>
                    <h4 className="font-bold underline mb-2 text-xs uppercase">Setup & Logistics</h4>
                    <div className="space-y-2 text-[10px] text-slate-700">
                        <div className="border-b border-slate-100 pb-1 mb-1">
                            <p><span className="font-bold">Table Cloth:</span> {data.tableClothColor || 'Standard'} | <span className="font-bold">Chair Cover:</span> {data.chairCoverColor || 'Standard'}</p>
                            {data.venueDecor && <p><span className="font-bold">Venue Decor:</span> {data.venueDecor}</p>}
                        </div>
                        <div className="border-b border-slate-100 pb-1 mb-1">
                            <p>
                                <span className="font-bold">Bridal Room: </span> 
                                {data.bridalRoom ? <span className="font-semibold text-slate-900">Used {data.bridalRoomHours ? `(${data.bridalRoomHours})` : ''}</span> : <span className="text-slate-400">Not Required</span>}
                            </p>
                        </div>
                        <div className="border-b border-slate-100 pb-1 mb-1">
                            <span className="font-bold block">Equipment & Decor:</span>
                            <p className="leading-tight text-slate-600">
                                {(() => {
                                    const items = [];
                                    Object.keys(equipmentMap).forEach(k => { if(data.equipment?.[k]) items.push(equipmentMap[k]); });
                                    if(data.equipment?.nameSign && data.nameSignText) items.push(`Sign: ${data.nameSignText}`);
                                    Object.keys(decorationMap).forEach(k => { if(data.decoration?.[k]) items.push(decorationMap[k]); });
                                    return items.length > 0 ? items.join(', ') : 'Standard Setup';
                                })()}
                            </p>
                        </div>
                        <div>
                            <p><span className="font-bold">Free Parking:</span> {data.parkingInfo?.ticketQty || 0} tickets x {data.parkingInfo?.ticketHours || 0} hrs</p>
                            {data.parkingInfo?.plates && <p><span className="font-bold">License Plates:</span> {data.parkingInfo.plates}</p>}
                            {data.otherNotes && <p className="mt-1"><span className="font-bold">Remarks:</span> {data.otherNotes}</p>}
                        </div>
                    </div>
                </div>
             </div>
        </div>

        <div className="page-break"></div>
        
        {/* --- PAGE 2: TERMS & CONDITIONS (EN) --- */}
        <div className="mt-8">
            <h3 className="text-center font-bold uppercase text-sm mb-6 underline tracking-widest">Terms and Conditions</h3>
            
            <div className="columns-2 gap-8 legal-text text-slate-700">
                
                <div className="legal-header">1. Payment Terms</div>
                <p className="mb-3">
                    <strong>Payment Methods:</strong> Cash, Credit Card, Bank Draft, or Bank Transfer.<br/>
                    <strong>Bank Details:</strong> Bank of China (HK) | King Lung Heen | 012-875-2-082180-1<br/>
                    <strong>Deadlines:</strong> Deposits must be paid by the due dates specified. The final balance must be settled immediately upon the conclusion of the event. <u>No personal cheques are accepted for final payment on the event day.</u>
                </p>

                <div className="legal-header">2. Cancellation & Postponement Policy</div>
                <p className="mb-3">
                    <strong>Postponement:</strong> Events may be postponed <u>one time</u> due to unforeseen circumstances. If rescheduled &gt;3 months prior, deposits are transferred. If &lt;3 months, fees may apply. Rescheduled dates must be within 3 months of original date.<br/>
                    <strong>Cancellation Fees:</strong> Fees are based on the notice period given:<br/>
                    • Outside confirmed period: Forfeit 1st Deposit<br/>
                    • Within confirmation period: Forfeit 1st & 2nd Deposit<br/>
                    • Within 1 month of Event: 90% of Minimum Charge<br/>
                    • Within 1 week of Event: 100% of Minimum Charge
                </p>

                <div className="legal-header">3. Weather Contingency (Typhoons)</div>
                <p className="mb-3">
                    <strong>Signal 8 / Black Rain:</strong> If hoisted on the event day, the Client may reschedule the event to a new date within 3 months (subject to availability) without penalty. Pre-ordered perishable items (flowers, fresh food) may still be charged.<br/>
                    <strong>Signal 3 / Red Rain:</strong> The event will proceed as scheduled. Cancellation under these signals will be treated as a standard cancellation.
                </p>

                <div className="legal-header">4. House Rules & Logistics</div>
                <p className="mb-3">
                    <strong>F&B:</strong> No outside food or beverages allowed without prior consent. Corkage/Cake cutting fees may apply.<br/>
                    <strong>Decorations:</strong> "Blu-tack" only for walls. No nails, staples, or strong tape. No open flames (candles) in dressing rooms.<br/>
                    <strong>Storage:</strong> Limited to 4 boxes (max 24hrs prior). The Venue is not responsible for loss or damage to stored items.<br/>
                    <strong>Conduct:</strong> No smoking. Gambling requires a valid license (Cap. 148A). The Venue reserves the right to stop unsafe activities.
                </p>

                <div className="legal-header">5. Liability & Indemnity</div>
                <p className="mb-3">
                    <strong>Damages:</strong> The Client is fully responsible for any damage to the Venue's property caused by their guests or contractors.<br/>
                    <strong>Safety:</strong> The Client agrees to indemnify King Lung Heen against any claims, injuries, or losses arising from the event, except where caused by the Venue's gross negligence.
                </p>

                <div className="legal-header">6. Force Majeure</div>
                <p className="mb-3">
                    If the event cannot proceed due to Government Restrictions (e.g., Pandemic Bans), Acts of God, or circumstances beyond control, the Venue will allow a <strong>full refund of deposits</strong> or free rescheduling.
                </p>

                <div className="legal-header">7. General</div>
                <p className="mb-3">
                    This Agreement is governed by the laws of Hong Kong. Rates and terms are confidential. Failure to return this signed agreement by the Option Date may result in the release of the venue booking.
                </p>
            </div>
        </div>
        
        {/* --- SIGNATURE SECTION --- */}
        <div className="mt-8 border-t-2 border-slate-800 pt-6 break-inside-avoid">
            <p className="text-xs font-bold mb-4">ACKNOWLEDGEMENT OF TERMS AND CONDITIONS:</p>
            <p className="text-[10px] mb-6">Please indicate your acceptance of the terms and conditions of this Agreement by endorsing the bottom right corner of each page, signing this Agreement, and returning it in its entirety to King Lung Heen.</p>
            
            <div className="grid grid-cols-2 gap-16">
                <div>
                    <div className="border-b border-slate-800 h-20 mb-2"></div>
                    <p className="font-bold text-xs">For and on behalf of<br/>
                        <span className="text-slate-900">KING LUNG HEEN</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Authorized Signature & Chop</p>
                </div>
                <div>
                    <div className="border-b border-slate-800 h-20 mb-2"></div>
                    <p className="font-bold text-xs">Confirmed & Accepted by<br/><span>{data.clientName}</span></p>
                    <p className="text-[10px] text-slate-500 mt-1">Client Signature / Company Chop</p>
                    <p className="text-[10px] text-slate-500 mt-4">Date: ________________________</p>
                </div>
            </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // VIEW 5: CONTRACT MODE (CHINESE) - FULL CONTENT
  // ==========================================
  if (printMode === 'CONTRACT_CN') {
    const BRAND_COLOR = '#A57C00'; 
    const totalDeposits = (Number(data.deposit1)||0) + (Number(data.deposit2)||0) + (Number(data.deposit3)||0);
    const minSpendInfo = data.minSpendInfo || null;

    // 1. Calculate Breakdown
    const platingTotal = (data.servingStyle === '位上') ? (parseFloat(data.platingFee) || 0) * (parseFloat(data.tableCount) || 0) : 0;
    const subtotal = (data.menus || []).reduce((acc, m) => acc + ((m.price||0)*(m.qty||1)), 0) 
                   + platingTotal
                   + ((data.drinksPrice||0)*(data.drinksQty||1))
                   + (data.customItems||[]).reduce((acc, i) => acc + ((i.price||0)*(i.qty||1)), 0);

    // 2. Re-calculate Service Charge
    let scBase = 0;
    (data.menus || []).forEach(m => { if(m.applySC !== false) scBase += (m.price || 0) * (m.qty || 1); });
    if (platingTotal > 0 && data.platingFeeApplySC !== false) scBase += platingTotal;
    if(data.drinksApplySC !== false) scBase += (data.drinksPrice || 0) * (data.drinksQty || 1);
    (data.customItems || []).forEach(i => { if(i.applySC) scBase += (i.price || 0) * (i.qty || 1); });

    let serviceChargeVal = 0;
    let scLabel = '固定';
    if (data.enableServiceCharge !== false) {
       const scStr = (data.serviceCharge || '10%').toString().trim();
       const val = parseFloat(scStr.replace(/[^0-9.]/g, '')) || 0;
       if (scStr.includes('%') || (val > 0 && val <= 100)) {
           serviceChargeVal = scBase * (val / 100);
           scLabel = `${val}%`;
       } else {
           serviceChargeVal = val;
       }
    }
    const discountVal = parseFloat(data.discount) || 0;
    const grandTotal = subtotal + serviceChargeVal - discountVal;

    // 3. Render
    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white min-h-screen relative flex flex-col text-xs leading-tight">
        <style>{`
          @media print { 
            @page { margin: 15mm; size: A4; } 
            body { -webkit-print-color-adjust: exact; } 
            .page-break { page-break-before: always; }
            .legal-text { font-size: 9px; text-align: justify; line-height: 1.4; }
            .legal-header { font-weight: bold; margin-top: 10px; margin-bottom: 2px; font-size: 10px; }
          }
        `}</style>

        {/* --- PAGE 1: PARTICULARS & DETAILS --- */}
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-4 pb-4 mb-6" style={{ borderColor: BRAND_COLOR }}>
            <div className="max-w-[70%]">
                <div className="mb-1" style={{ color: BRAND_COLOR }}>
                    <span className="text-2xl font-black tracking-tight block leading-none">璟瓏軒</span>
                    <span className="text-xs font-bold tracking-widest uppercase block mt-1">King Lung Heen</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-2">
                    <p>尖沙咀西九文化區博物館道8號香港故宮文化博物館4樓</p>
                    <p className="mt-1">Tel: +852 2788 3939 | Hotline: +852 5222 6066 | Email: banquet@kinglungheen.com</p>
                </div>
            </div>
            <div className="text-right">
                <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-widest mb-1">宴會合約</h1>
                <p className="text-xs font-bold text-slate-700">合約編號: {data.orderId}</p>
                <p className="text-xs text-slate-500">日期: {new Date().toLocaleDateString('zh-HK')}</p>
            </div>
        </div>

        {/* Section 1: Event Particulars */}
        <div className="mb-6 border border-slate-300">
            <div className="bg-slate-100 px-2 py-1 font-bold border-b border-slate-300 text-slate-700">活動資料 (EVENT PARTICULARS)</div>
            <div className="grid grid-cols-2">
                <div className="p-2 border-r border-slate-300 border-b">
                    <span className="block text-[9px] text-slate-500">客戶名稱 (Client Name)</span>
                    <span className="font-bold text-sm">{data.clientName}</span>
                </div>
                <div className="p-2 border-b border-slate-300">
                    <span className="block text-[9px] text-slate-500">公司/機構 (Company)</span>
                    <span className="font-bold text-sm">{data.companyName || '-'}</span>
                </div>
                <div className="p-2 border-r border-slate-300 border-b">
                    <span className="block text-[9px] text-slate-500">聯絡電話 / 電郵 (Contact)</span>
                    <span className="font-bold text-sm">{data.clientPhone} / {data.clientEmail}</span>
                </div>
                <div className="p-2 border-b border-slate-300">
                    <span className="block text-[9px] text-slate-500">活動名稱 (Event Name)</span>
                    <span className="font-bold text-sm">{data.eventName}</span>
                </div>
                <div className="p-2 border-r border-slate-300 border-b">
                    <span className="block text-[9px] text-slate-500">日期及時間 (Date & Time)</span>
                    <span className="font-bold text-sm">
                        {formatDateWithDay(data.date)} | {data.startTime} - {data.endTime}
                    </span>
                </div>
                <div className="p-2 border-b border-slate-300">
                    <span className="block text-[9px] text-slate-500">場地及人數 (Venue & Attendance)</span>
                    <span className="font-bold text-sm">{cleanLocation(data.venueLocation)} | {data.tableCount} 席 / {data.guestCount} 人</span>
                </div>
            </div>
        </div>

        {/* Section 2: Financials & Payment Schedule */}
        <div className="mb-6 flex gap-6">
            
            {/* LEFT: Charges Detail */}
            <div className="w-1/2 border border-slate-300 flex flex-col">
                <div className="bg-slate-100 px-2 py-1 font-bold border-b border-slate-300 text-slate-700">費用明細 (CHARGES DETAIL)</div>
                <div className="p-2 flex flex-col flex-1">
                    <div className="flex text-[9px] font-bold text-slate-400 border-b border-slate-200 pb-1 mb-1">
                        <div className="flex-1">項目 (ITEM)</div>
                        <div className="w-14 text-right">單價</div>
                        <div className="w-8 text-center">數量</div>
                        <div className="w-16 text-right">金額 ($)</div>
                    </div>

                    {/* Items Loop */}
                    {(data.menus || []).map((m, i) => (
                        <div key={`m-${i}`} className="flex text-xs mb-1.5 items-baseline">
                            <div className="flex-1 pr-1 font-medium text-slate-800 leading-tight">{m.title}</div>
                            <div className="w-14 text-right font-mono text-[10px] text-slate-500">${formatMoney(m.price)}</div>
                            <div className="w-8 text-center text-[10px] text-slate-500">{m.qty}</div>
                            <div className="w-16 text-right font-mono font-bold text-slate-700">${formatMoney((m.price||0)*(m.qty||1))}</div>
                        </div>
                    ))}
                    
                    {data.servingStyle === '位上' && parseFloat(data.platingFee) > 0 && (
                        <div className="flex text-xs mb-1.5 items-baseline text-blue-800">
                            <div className="flex-1 pr-1 font-medium leading-tight">位上服務費 (Plating Fee)</div>
                            <div className="w-14 text-right font-mono text-[10px]">${formatMoney(data.platingFee)}</div>
                            <div className="w-8 text-center text-[10px]">{data.tableCount}</div>
                            <div className="w-16 text-right font-mono font-bold">${formatMoney((parseFloat(data.platingFee)||0)*(parseFloat(data.tableCount)||0))}</div>
                        </div>
                    )}

                    <div className="flex text-xs mb-1.5 items-baseline">
                        <div className="flex-1 pr-1 font-medium text-slate-800 leading-tight">酒水套餐 ({data.drinksPackage || 'Standard'})</div>
                        <div className="w-14 text-right font-mono text-[10px] text-slate-500">${formatMoney(data.drinksPrice)}</div>
                        <div className="w-8 text-center text-[10px] text-slate-500">{data.drinksQty}</div>
                        <div className="w-16 text-right font-mono font-bold text-slate-700">${formatMoney((data.drinksPrice||0)*(data.drinksQty||1))}</div>
                    </div>

                    {(data.customItems || []).map((item, i) => (
                        <div key={`c-${i}`} className="flex text-xs mb-1.5 items-baseline">
                            <div className="flex-1 pr-1 font-medium text-slate-800 leading-tight">{item.name}</div>
                            <div className="w-14 text-right font-mono text-[10px] text-slate-500">${formatMoney(item.price)}</div>
                            <div className="w-8 text-center text-[10px] text-slate-500">{item.qty}</div>
                            <div className="w-16 text-right font-mono font-bold text-slate-700">${formatMoney((item.price||0)*(item.qty||1))}</div>
                        </div>
                    ))}

                    <div className="flex-1 min-h-[10px]"></div>

                    {/* Totals */}
                    <div className="mt-2 border-t border-slate-300 pt-2 space-y-1 bg-slate-50/50 -mx-2 px-2 pb-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                            <span>小計 (Subtotal):</span>
                            <span className="font-mono">${formatMoney(subtotal)}</span>
                        </div>
                        {serviceChargeVal > 0 && (
                            <div className="flex justify-between text-[10px] text-slate-500">
                                <span>服務費 ({scLabel}):</span>
                                <span className="font-mono">+${formatMoney(serviceChargeVal)}</span>
                            </div>
                        )}
                        {discountVal > 0 && (
                            <div className="flex justify-between text-[10px] text-red-600 font-bold">
                                <span>折扣 (Discount):</span>
                                <span className="font-mono">-${formatMoney(discountVal)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-1 mt-1 text-slate-900">
                            <span>合約總金額 (TOTAL):</span>
                            <span className="font-mono">${formatMoney(grandTotal)}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 text-right italic">
                            * 最低消費: ${minSpendInfo ? formatMoney(minSpendInfo.amount) : 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* RIGHT: Payment Schedule */}
            <div className="w-1/2 border border-slate-300 flex flex-col">
                <div className="bg-slate-100 px-2 py-1 font-bold border-b border-slate-300 text-slate-700">付款時間表 (PAYMENT SCHEDULE)</div>
                <div className="p-2 space-y-1 flex-1 flex flex-col">
                    {[
                        { l: '第一期訂金', a: data.deposit1, d: data.deposit1Date },
                        { l: '第二期訂金', a: data.deposit2, d: data.deposit2Date },
                        { l: '第三期訂金', a: data.deposit3, d: data.deposit3Date },
                    ].map((item, i) => Number(item.a) > 0 && (
                        <div key={i} className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">{item.l} <span className="text-[9px] text-slate-400">({item.d || '待定'})</span>:</span>
                            <span className="font-mono font-bold">${formatMoney(item.a)}</span>
                        </div>
                    ))}
                    
                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-1 mb-4">
                        <span className="font-bold text-slate-900 text-xs">
                            尾數餘額 (Balance) <span className="text-[9px] font-normal text-slate-500 block">({data.balanceDueDateType === '10daysPrior' ? '活動前10天' : '活動當日'})</span>
                        </span>
                        <span className="font-mono font-black text-sm">${formatMoney(Number(data.totalAmount) - totalDeposits)}</span>
                    </div>

                    <div className="mt-auto">
                        <div className="bg-blue-50/50 border border-blue-100 rounded p-2 text-[10px] text-slate-600">
                            <p className="font-bold text-blue-800 mb-1 uppercase text-[9px] tracking-wider border-b border-blue-100 pb-0.5">銀行轉賬資料 (Bank Info)</p>
                            <div className="grid grid-cols-[50px_1fr] gap-x-1 gap-y-0.5 leading-tight">
                                <span className="text-slate-400">銀行:</span>
                                <span>中國銀行 (香港)</span>
                                <span className="text-slate-400">戶口名稱:</span>
                                <span className="font-bold text-slate-800">King Lung Heen</span>
                                <span className="text-slate-400">戶口號碼:</span>
                                <span className="font-mono font-bold text-slate-900 text-sm">012-875-2-082180-1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Section 3: Menu & Arrangements */}
        <div className="mb-6 border border-slate-300">
             <div className="bg-slate-100 px-2 py-1 font-bold border-b border-slate-300 text-slate-700">餐單與佈置安排 (MENU & ARRANGEMENTS)</div>
             <div className="p-4 grid grid-cols-2 gap-8">
                
                {/* LEFT COL */}
                <div>
                    <h4 className="font-bold underline mb-2 text-xs text-slate-800">餐飲內容 (Food & Beverage)</h4>
                    {data.menus && data.menus.map((m, i) => (
                        <div key={i} className="mb-3">
                            <p className="font-bold text-sm text-slate-900">{m.title}</p>
                            <p className="text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        </div>
                    ))}
                    {data.drinksPackage && (
                        <div className="mt-2 border-t border-slate-100 pt-2">
                            <p className="font-bold text-sm text-slate-900">酒水套餐</p>
                            <p className="text-[10px] text-slate-600 whitespace-pre-wrap">{data.drinksPackage}</p>
                        </div>
                    )}
                </div>

                {/* RIGHT COL */}
                <div>
                    <h4 className="font-bold underline mb-2 text-xs text-slate-800">場地設置 (Setup & Logistics)</h4>
                    <div className="space-y-2 text-[10px] text-slate-700">
                        <div className="border-b border-slate-100 pb-1 mb-1">
                            <p><span className="font-bold">檯布顏色:</span> {data.tableClothColor || '標準'} | <span className="font-bold">椅套顏色:</span> {data.chairCoverColor || '標準'}</p>
                            {data.venueDecor && <p className="mt-1"><span className="font-bold">場地佈置備註:</span> {data.venueDecor}</p>}
                        </div>
                        <div className="border-b border-slate-100 pb-1 mb-1">
                            <p>
                                <span className="font-bold">新娘房: </span> 
                                {data.bridalRoom ? <span className="font-semibold">使用 {data.bridalRoomHours ? `(${data.bridalRoomHours})` : ''}</span> : '不適用'}
                            </p>
                        </div>
                        <div className="border-b border-slate-100 pb-1 mb-1">
                            <span className="font-bold block">器材與佈置 (Equipment):</span>
                            <p className="leading-tight text-slate-600">
                                {(() => {
                                    const items = [];
                                    Object.keys(equipmentMap).forEach(k => { if(data.equipment?.[k]) items.push(equipmentMap[k]); });
                                    if(data.equipment?.nameSign && data.nameSignText) items.push(`字牌: ${data.nameSignText}`);
                                    Object.keys(decorationMap).forEach(k => { if(data.decoration?.[k]) items.push(decorationMap[k]); });
                                    return items.length > 0 ? items.join(', ') : '標準設置';
                                })()}
                            </p>
                        </div>
                        <div>
                            <p><span className="font-bold">泊車優惠:</span> {data.parkingInfo?.ticketQty || 0} 張 x {data.parkingInfo?.ticketHours || 0} 小時</p>
                            {data.parkingInfo?.plates && <p><span className="font-bold">車牌登記:</span> {data.parkingInfo.plates}</p>}
                            {data.otherNotes && <p className="mt-2 text-red-600"><span className="font-bold">其他備註:</span> {data.otherNotes}</p>}
                        </div>
                    </div>
                </div>
             </div>
        </div>

        <div className="page-break"></div>
        
        {/* --- PAGE 2: TERMS & CONDITIONS (CHINESE) --- */}
        <div className="mt-8">
            <h3 className="text-center font-bold uppercase text-sm mb-6 underline tracking-widest">條款及細則 (Terms and Conditions)</h3>
            
            <div className="columns-2 gap-8 legal-text text-slate-700">
                
                <div className="legal-header">1. 付款條款</div>
                <p className="mb-3">
                    <strong>付款方式:</strong> 現金、信用卡、本票或銀行轉賬。<br/>
                    <strong>銀行資料:</strong> 中國銀行 (香港) | King Lung Heen | 012-875-2-082180-1<br/>
                    <strong>期限:</strong> 訂金必須於指定日期前支付。尾數必須於活動當日或之前全數結清。<br/>
                    <u>注意：活動當日支付尾數恕不接受個人支票。</u>
                </p>

                <div className="legal-header">2. 取消及延期政策</div>
                <p className="mb-3">
                    <strong>延期:</strong> 如遇不可預見之情況，活動可延期<u>一次</u>。如於活動前3個月以上通知，訂金可全數保留轉至新展期（必須為原定日期起計3個月內）。如通知期少於3個月，可能需收取行政費。<br/>
                    <strong>取消罰款:</strong> 取消費用將根據通知期計算：<br/>
                    • 確認期外取消：沒收第一期訂金<br/>
                    • 確認期內取消：沒收第一及第二期訂金<br/>
                    • 活動前1個月內：最低消費額之 90%<br/>
                    • 活動前1週內：最低消費額之 100%
                </p>

                <div className="legal-header">3. 天氣安排 (颱風/暴雨)</div>
                <p className="mb-3">
                    <strong>8號風球 / 黑色暴雨:</strong> 如活動當日懸掛以上信號，客戶可於3個月內更改活動日期（視乎場地供應），不另收費。惟已預訂之鮮活食品（如鮮花、海鮮）之費用可能需由客戶承擔。<br/>
                    <strong>3號風球 / 紅色或黃色暴雨:</strong> 活動將如常舉行。如客戶在此情況下取消，將視作自行取消處理。
                </p>

                <div className="legal-header">4. 場地規則</div>
                <p className="mb-3">
                    <strong>飲食:</strong> 未經許可，嚴禁攜帶外來食物或飲品。切餅費及開瓶費另計。<br/>
                    <strong>佈置:</strong> 牆身佈置只可使用 "Blu-tack" (寶貼)。嚴禁使用釘、釘槍、雙面膠紙或強力膠紙。更衣室內嚴禁明火。<br/>
                    <strong>儲存:</strong> 場地提供有限度儲存（最多4箱，限活動前24小時內）。如有遺失或損壞，場地恕不負責。<br/>
                    <strong>行為:</strong> 全場禁煙。進行博彩活動需持有有效牌照（第148A章）。場地保留終止任何不安全活動之權利。
                </p>

                <div className="legal-header">5. 責任與賠償</div>
                <p className="mb-3">
                    <strong>損壞:</strong> 客戶需對其賓客或承辦商造成之任何場地設施損壞負全責，並照價賠償。<br/>
                    <strong>安全:</strong> 除因場地嚴重疏忽引致外，客戶同意保障 King Lung Heen 免受因活動引起之索償或損失。
                </p>

                <div className="legal-header">6. 不可抗力</div>
                <p className="mb-3">
                    如因政府防疫禁令、天災或不可抗力因素導致活動無法舉行，場地將安排<u>全數退還訂金</u>或免費延期。
                </p>

                <div className="legal-header">7. 一般事項</div>
                <p className="mb-3">
                    本合約受香港法律管轄。合約內容及價格均為保密。如客戶未能在指定日期前簽署回傳本合約及支付訂金，場地保留釋放預留檔期之權利。
                </p>
            </div>
        </div>

        {/* --- SIGNATURE SECTION --- */}
        <div className="mt-8 border-t-2 border-slate-800 pt-6 break-inside-avoid">
            <p className="text-xs font-bold mb-4">確認條款及簽署 (ACKNOWLEDGEMENT):</p>
            <p className="text-[10px] mb-6">簽署本合約即代表閣下已閱讀並同意以上所有條款及細則。請於每頁右下角簡簽，並簽署下方欄位後交回璟瓏軒。</p>
            
            <div className="grid grid-cols-2 gap-16">
                <div>
                    <div className="border-b border-slate-800 h-20 mb-2"></div>
                    <p className="font-bold text-xs">璟瓏軒 代表<br/>
                        <span className="text-slate-900">KING LUNG HEEN</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Authorized Signature & Chop</p>
                </div>
                <div>
                    <div className="border-b border-slate-800 h-20 mb-2"></div>
                    <p className="font-bold text-xs">客戶確認<br/><span>{data.clientName}</span></p>
                    <p className="text-[10px] text-slate-500 mt-1">Client Signature / Company Chop</p>
                    <p className="text-[10px] text-slate-500 mt-4">日期: ________________________</p>
                </div>
            </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // VIEW 6: INVOICE MODE
  // ==========================================
  if (printMode === 'INVOICE') {
    const BRAND_COLOR = '#A57C00'; 
    const totalDeposits = (Number(data.deposit1)||0) + (Number(data.deposit2)||0) + (Number(data.deposit3)||0);
    
    // Calculate Total Paid based on checkboxes
    let totalPaid = 0;
    if (data.deposit1Received) totalPaid += Number(data.deposit1) || 0;
    if (data.deposit2Received) totalPaid += Number(data.deposit2) || 0;
    if (data.deposit3Received) totalPaid += Number(data.deposit3) || 0;
    if (data.balanceReceived) totalPaid = grandTotal; 
    
    const balanceDue = grandTotal - totalPaid;

    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white p-8 min-h-screen relative flex flex-col text-xs leading-tight">
        <style>{`@media print { @page { margin: 10mm; size: A4; } body { -webkit-print-color-adjust: exact; } }`}</style>
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-4 pb-4 mb-6" style={{ borderColor: BRAND_COLOR }}>
            <div className="max-w-[60%]">
                <div className="mb-1" style={{ color: BRAND_COLOR }}>
                    <span className="text-3xl font-black tracking-tight block leading-none">璟瓏軒</span>
                    <span className="text-xs font-bold tracking-widest uppercase block mt-1">King Lung Heen</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-2 font-medium">
                    <p>4/F, Hong Kong Palace Museum, 8 Museum Drive, West Kowloon</p>
                    <p>Tel: +852 2788 3939 | Email: banquet@kinglungheen.com</p>
                </div>
            </div>
            <div className="text-right">
                <h1 className="text-4xl font-light text-slate-800 uppercase tracking-widest mb-1">INVOICE</h1>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">發票</h2>
                <div className="text-right space-y-1">
                    <p className="text-xs"><span className="font-bold text-slate-600">Invoice No:</span> {data.orderId}</p>
                    <p className="text-xs"><span className="font-bold text-slate-600">Date:</span> {new Date().toLocaleDateString('en-GB')}</p>
                </div>
            </div>
        </div>

        {/* Bill To & Event Info */}
        <div className="flex gap-8 mb-8 bg-slate-50 p-4 rounded border border-slate-100">
            <div className="flex-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Bill To (客戶):</h3>
                <p className="font-bold text-sm text-slate-900">{data.clientName}</p>
                {data.companyName && <p className="text-xs text-slate-600">{data.companyName}</p>}
                <p className="text-xs text-slate-500 mt-1">{data.clientPhone}</p>
                <p className="text-xs text-slate-500">{data.clientEmail}</p>
            </div>
            <div className="flex-1 border-l border-slate-200 pl-8">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Event Details (活動):</h3>
                <div className="grid grid-cols-[60px_1fr] gap-y-1 text-xs">
                    <span className="text-slate-500">Event:</span>
                    <span className="font-bold">{data.eventName}</span>
                    <span className="text-slate-500">Date:</span>
                    <span className="font-bold">{formatDateWithDay(data.date)}</span>
                    <span className="text-slate-500">Venue:</span>
                    <span className="font-bold">{cleanLocation(data.venueLocation)}</span>
                    <span className="text-slate-500">Pax:</span>
                    <span className="font-bold">{data.guestCount} Pax / {data.tableCount} Tables</span>
                </div>
            </div>
        </div>

        {/* Item Table */}
        <div className="mb-6 flex-1">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b-2 border-slate-800 text-slate-600">
                        <th className="text-left py-2 w-[55%] uppercase tracking-wider">Description (項目)</th>
                        <th className="text-right py-2 w-[15%] uppercase tracking-wider">Rate</th>
                        <th className="text-center py-2 w-[10%] uppercase tracking-wider">Qty</th>
                        <th className="text-right py-2 w-[20%] uppercase tracking-wider">Amount (HKD)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(data.menus || []).map((m, i) => (
                        <tr key={`m-${i}`}>
                            <td className="py-2 pr-4 align-top">
                                <p className="font-bold text-slate-900">{m.title}</p>
                            </td>
                            <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(m.price)}</td>
                            <td className="py-2 text-center align-top text-slate-600">{m.qty}</td>
                            <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney((m.price||0)*(m.qty||1))}</td>
                        </tr>
                    ))}
                    
                    {data.servingStyle === '位上' && parseFloat(data.platingFee) > 0 && (
                        <tr>
                            <td className="py-2 pr-4 align-top"><p className="font-bold text-slate-900">Plating Service Fee (位上服務費)</p></td>
                            <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(data.platingFee)}</td>
                            <td className="py-2 text-center align-top text-slate-600">{data.tableCount}</td>
                            <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(platingTotal)}</td>
                        </tr>
                    )}

                    {data.drinksPackage && (
                        <tr>
                            <td className="py-2 pr-4 align-top"><p className="font-bold text-slate-900">Beverage Package ({data.drinksPackage})</p></td>
                            <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(data.drinksPrice)}</td>
                            <td className="py-2 text-center align-top text-slate-600">{data.drinksQty}</td>
                            <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney((data.drinksPrice||0)*(data.drinksQty||1))}</td>
                        </tr>
                    )}

                    {(data.customItems || []).map((item, i) => (
                        <tr key={`c-${i}`}>
                            <td className="py-2 pr-4 align-top"><p className="font-bold text-slate-900">{item.name}</p></td>
                            <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(item.price)}</td>
                            <td className="py-2 text-center align-top text-slate-600">{item.qty}</td>
                            <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney((item.price||0)*(item.qty||1))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Totals & Schedule Grid */}
        <div className="flex gap-8 mb-8 border-t border-slate-200 pt-6">
            
            {/* Payment Schedule (Status) */}
            <div className="w-[55%]">
                <h4 className="font-bold text-slate-700 text-xs mb-2 uppercase">Payment Status (付款狀況)</h4>
                <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-[10px]">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="text-left py-1.5 px-3">Item</th>
                                <th className="text-right py-1.5 px-3">Amount</th>
                                <th className="text-right py-1.5 px-3">Due Date</th>
                                <th className="text-center py-1.5 px-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {[
                                { l: '1st Deposit', a: data.deposit1, d: data.deposit1Date, paid: data.deposit1Received },
                                { l: '2nd Deposit', a: data.deposit2, d: data.deposit2Date, paid: data.deposit2Received },
                                { l: '3rd Deposit', a: data.deposit3, d: data.deposit3Date, paid: data.deposit3Received },
                            ].map((item, i) => Number(item.a) > 0 && (
                                <tr key={i}>
                                    <td className="py-1.5 px-3 font-medium text-slate-700">{item.l}</td>
                                    <td className="py-1.5 px-3 text-right font-mono">${formatMoney(item.a)}</td>
                                    <td className="py-1.5 px-3 text-right text-slate-500">{item.d || 'TBC'}</td>
                                    <td className="py-1.5 px-3 text-center">
                                        {item.paid ? 
                                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">PAID</span> : 
                                            <span className="text-[9px] font-bold border border-slate-300 text-slate-400 px-1.5 py-0.5 rounded">DUE</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                            {/* Balance Line */}
                            <tr>
                                <td className="py-1.5 px-3 font-bold text-slate-800">Final Balance</td>
                                <td className="py-1.5 px-3 text-right font-mono font-bold">${formatMoney(Number(data.totalAmount) - totalDeposits)}</td>
                                <td className="py-1.5 px-3 text-right text-slate-500">{data.balanceDueDateType === '10daysPrior' ? '10 Days Prior' : 'Event Day'}</td>
                                <td className="py-1.5 px-3 text-center">
                                    {data.balanceReceived ? 
                                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">PAID</span> : 
                                        <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">DUE</span>
                                    }
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="flex-1 space-y-1.5 text-right">
                <div className="flex justify-between text-xs text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">${formatMoney(subtotal)}</span>
                </div>
                {serviceChargeVal > 0 && (
                    <div className="flex justify-between text-xs text-slate-600">
                        <span>Service Charge (10%)</span>
                        <span className="font-mono">+${formatMoney(serviceChargeVal)}</span>
                    </div>
                )}
                {discountVal > 0 && (
                    <div className="flex justify-between text-xs text-red-600 font-bold">
                        <span>Discount</span>
                        <span className="font-mono">-${formatMoney(discountVal)}</span>
                    </div>
                )}
                
                <div className="border-t border-slate-800 my-2"></div>
                
                <div className="flex justify-between text-base font-bold text-slate-900">
                    <span>Total Amount</span>
                    <span className="font-mono">${formatMoney(grandTotal)}</span>
                </div>

                <div className="flex justify-between text-xs text-emerald-600 font-bold mt-2">
                    <span>Less: Paid Amount</span>
                    <span className="font-mono">-${formatMoney(totalPaid)}</span>
                </div>

                <div className="border-t-2 border-slate-800 mt-2 pt-2">
                    <div className="flex justify-between text-xl font-black text-slate-900">
                        <span>TOTAL DUE</span>
                        <span className="font-mono">${formatMoney(balanceDue > 0 ? balanceDue : 0)}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Bank Info */}
        <div className="mt-auto bg-slate-50 p-4 rounded border border-slate-200 text-xs">
            <p className="font-bold text-slate-700 mb-2 uppercase">Payment Methods (付款方式)</p>
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <p className="font-bold text-slate-800">Bank Transfer (銀行轉賬)</p>
                    <p className="text-slate-600">Bank: Bank of China (HK)</p>
                    <p className="text-slate-600">Name: <span className="font-bold">King Lung Heen</span></p>
                    <p className="text-slate-600">Account: <span className="font-mono font-bold">012-875-2-082180-1</span></p>
                </div>
                <div>
                    <p className="font-bold text-slate-800">Cheque (支票)</p>
                    <p className="text-slate-600">Payable to: <span className="font-bold">"best wish investment limited"</span></p>
                    <p className="text-slate-400 mt-1">* Please write invoice number on the back of the cheque.</p>
                </div>
            </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // VIEW 7: STANDARD EO (DEFAULT)
  // ==========================================
  // ⛔️ CRITICAL: This MUST be the very last return. 
  // Any "if" blocks must go ABOVE this.


  // ==========================================
  // VIEW 8: MENU CONFIRMATION (SINGLE PAGE + BILINGUAL + CHECKBOX + DATE FIX)
  // ==========================================
  if (printMode === 'MENU_CONFIRM') {
    const BRAND_COLOR = '#A57C00'; 
    const verNum = (data.menuVersions?.length || 0) + 1;
    const versionLabel = `v${verNum}`;

    // 1. Get Custom Font Size from Settings (Default to 18px if not set)
    const fontSizePx = data.printSettings?.menu?.fontSizeOverride || 18;
    const defaultExpiry = new Date(new Date().setDate(new Date().getDate() + 14)).toLocaleDateString('zh-HK');

    // 2. Custom Date Formatter: YYYY/MM/DD (Day) e.g., 2026/01/28 (Wed)
    const formatMenuDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const datePart = d.toLocaleDateString('zh-HK'); // 2026/1/28
        const dayPart = d.toLocaleDateString('en-US', { weekday: 'short' }); // Wed
        return `${datePart} (${dayPart})`;
    };

    return (
      // Main Container: Forces Single Page (h-screen) & Vertical Layout (flex-col)
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white p-6 h-screen flex flex-col justify-between overflow-hidden relative">
        <style>{`
            @media print { 
                @page { margin: 5mm; size: A4; } 
                body { -webkit-print-color-adjust: exact; } 
                html, body { height: 100%; overflow: hidden; }
            }
        `}</style>
        
        {/* --- 1. HEADER (Compact) --- */}
        <div className="flex-shrink-0 flex justify-between items-start border-b border-slate-200 pb-2 mb-2">
            <div>
                <span className="text-lg font-black uppercase tracking-widest" style={{ color: BRAND_COLOR }}>璟瓏軒</span>
                <span className="text-xs text-slate-400 font-bold ml-2">King Lung Heen</span>
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono leading-tight">
                Ref: {data.orderId}<br/>
                {new Date().toLocaleDateString('zh-HK')}
            </div>
        </div>

        {/* --- 2. EVENT INFO (Compact) --- */}
        <div className="flex-shrink-0 text-center mb-2">
            <h1 className="text-3xl font-black text-slate-900 mb-1 uppercase tracking-tight leading-none">
                {data.eventName}
            </h1>
            <div className="flex justify-center items-center gap-3 text-sm font-bold text-slate-600 border-y border-slate-900 py-1 inline-flex mx-auto">
                <span>{data.clientName}</span>
                <span className="text-slate-300">|</span>
                {/* ✅ UPDATED DATE FORMAT HERE */}
                <span>{formatMenuDate(data.date)}</span>
                <span className="text-slate-300">|</span>
                <span>{data.tableCount} 席 ({data.guestCount} Pax)</span>
            </div>
        </div>

        {/* --- 3. THE MENU (Flexible Space) --- */}
        <div className="flex-1 flex flex-col items-center justify-center w-full overflow-hidden min-h-0 py-2">
            {(data.menus || []).map((menu, i) => (
                <div key={i} className="w-full text-center flex flex-col h-full justify-center">
                    
                    {/* Menu Title */}
                    <div className="flex-shrink-0 mb-3">
                        <div className="flex items-baseline justify-center gap-2">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest">{menu.title}</h3>
                            <span className="text-xs font-bold text-slate-400 border border-slate-200 px-1 rounded">{versionLabel}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-1 tracking-widest">(供10-12 位用 / For 10-12 Persons)</p>
                        <div className="h-0.5 w-10 bg-slate-900 mx-auto rounded-full mt-2"></div>
                    </div>
                    
                    {/* Content - Controlled by "Print Config" Slider */}
                    <div className="px-4 flex-1 flex flex-col justify-center">
                        <p className="font-medium text-slate-800 whitespace-pre-wrap leading-relaxed font-serif" 
                           style={{ fontSize: `${fontSizePx}px` }}>
                            {menu.content || '(暫無菜單內容 / No Menu Content)'}
                        </p>
                    </div>
                </div>
            ))}

            {/* Respectfully Await Reply */}
            <div className="flex-shrink-0 mt-4 mb-2 text-center">
                <p className="text-sm font-black text-slate-900 tracking-[0.3em] border-b border-slate-300 pb-1 inline-block">
                    **敬候賜覆 RSVP**
                </p>
            </div>
        </div>

        {/* --- 4. FOOTER (Fixed at bottom) --- */}
        <div className="flex-shrink-0 mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 gap-4">
            
            {/* Left: Disclaimers & Allergy Warning */}
            <div className="flex flex-col justify-end text-[9px] text-slate-600 leading-tight">
                 <div className="space-y-1 mb-2 font-medium">
                    {/* Date Override Logic */}
                    <div>
                        <p>• 上列內容有效期至: <span className="font-bold underline">{data.printSettings?.menu?.validityDateOverride || defaultExpiry}</span> 或前預訂</p>
                        <p className="text-[8px] text-slate-400">Valid until {data.printSettings?.menu?.validityDateOverride || defaultExpiry} or prior booking.</p>
                    </div>

                    {/* Concise "No Reduction" Disclaimer */}
                    <div>
                        <p>• 同桌個別特別餐膳 (例:素食餐) 需另收費用及加一服務費；菜單如有更改，費用只加不減。</p>
                        <p className="text-[8px] text-slate-400 leading-tight">
                            Special meals (e.g. Vegetarian) are subject to extra charge + 10% service charge. Menu changes will only incur additional costs; no price reduction.
                        </p>
                    </div>
                    
                    {/* ✅ UPDATED: Plating Fee Disclaimer with Checkbox */}
                    {(data.printSettings?.menu?.showPlatingFeeDisclaimer !== false) && (
                        <div className="flex items-start gap-1.5 mt-1">
                            {/* The Checkbox for printing */}
                            <div className="w-3 h-3 border border-slate-800 flex-shrink-0 mt-0.5"></div>
                            <div>
                                <p>如需分菜位上, 每桌需額外收取 HKD800 及加一服務費</p>
                                <p className="text-[8px] text-slate-400 leading-tight">Individual plating service is subject to an extra HKD800/table + 10%.</p>
                            </div>
                        </div>
                    )}
                 </div>

                 {/* Allergy Statement */}
                 <div className="border-t border-slate-100 pt-1.5 mt-1">
                     <div className="mb-1">
                         <p className="font-bold text-slate-500">
                            食物可能有微量致敏原, 如你對食物會有過敏性反應或不耐性, 請通知我們的服務員。
                         </p>
                         <p className="text-[8px] text-slate-400 italic">
                            Food may contain traces of allergens. Please inform our staff if you have any food allergies or intolerance.
                         </p>
                     </div>
                     
                     {/* Existing Remarks */}
                     {data.drinksPackage && (
                        <div className="mt-1">
                            <p className="truncate"><span className="font-bold text-slate-900">飲料供應 (Beverage):</span> {data.drinksPackage}</p>
                        </div>
                     )}
                     {(data.specialMenuReq || data.allergies) && (
                        <p className="text-red-600 font-bold truncate mt-1">
                            ⚠️ {data.specialMenuReq} {data.specialMenuReq && data.allergies && '|'} {data.allergies}
                        </p>
                     )}
                 </div>
            </div>

            {/* Right: Signature Box */}
            <div className="border border-slate-800 p-2 rounded bg-slate-50/50 flex flex-col justify-between h-auto min-h-[90px]">
                <div>
                    <p className="text-[9px] text-slate-500 text-center uppercase tracking-widest mb-1">
                        Client Confirmation (客戶確認)
                    </p>
                    <div className="text-center leading-tight">
                        <p className="text-[8px] text-slate-400">本人確認以上菜譜及酒水安排無誤。</p>
                        <p className="text-[7px] text-slate-400">I confirm the above menu and beverage arrangements are correct.</p>
                    </div>
                </div>
                
                <div className="flex justify-between items-end gap-3 px-1 mt-2">
                    <div className="flex-1 text-center">
                        <div className="border-b border-slate-800 h-px mb-1"></div>
                        <p className="text-[8px] font-bold text-slate-400">Sign</p>
                    </div>
                    <div className="w-16 text-center">
                        <div className="border-b border-slate-800 h-px mb-1"></div>
                        <p className="text-[8px] font-bold text-slate-400">Date</p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    );
  }
  return (
    <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white text-sm">
      <style>{`@media print { body, html { height: auto !important; overflow: visible !important; } .no-print, aside, nav, button, .modal-overlay { display: none !important; } .print-only { display: block !important; position: absolute; top: 0; left: 0; width: 100%; z-index: 9999; background: white; } @page { margin: 10mm; size: A4; } .break-after-page { page-break-after: always; break-after: page; display: block; height: 1px; width: 100%; margin: 0; } .print-page { page-break-inside: avoid; min-height: 280mm; position: relative; } }`}</style>

      {/* PAGE 1: MANAGER COPY */}
      <div className="print-page">
        <Header title="活動訂單 (EO)" copyType="Manager Copy (Admin)" badgeColor="bg-blue-900" />
        <EventSummary />
        {/* ... Rest of Standard EO Code ... */}
        <Section title="客戶資料 (Client Info)">
           <DetailRow label="客戶姓名" value={data.clientName} />
           <DetailRow label="電話" value={data.clientPhone} />
           <DetailRow label="Email" value={data.clientEmail} />
           <DetailRow label="公司/機構" value={data.companyName} />
           <DetailRow label="銷售人員" value={data.salesRep} />
           {data.secondaryContact && <DetailRow label="第二聯絡人" value={data.secondaryContact} />}
           {data.secondaryPhone && <DetailRow label="第二電話" value={data.secondaryPhone} />}
           {data.address && <DetailRow label="地址" value={data.address} widthClass="w-full" />}
        </Section>
        <Section title="餐飲安排 (F&B)">
           <DetailRow label="上菜方式" value={data.servingStyle} widthClass="w-1/4" />
           <DetailRow label="酒水安排" value={data.drinksPackage} widthClass="w-3/4" />
           <div className="w-full px-2 mb-2 mt-2">
              <span className="text-slate-500 text-[10px] block uppercase font-bold mb-1">餐單內容</span>
              <div className="text-sm font-medium whitespace-pre-wrap leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">{data.menus?.map(m => `${m.title}:\n${onlyChinese(m.content)}`).join('\n\n') || onlyChinese(data.menuType)}</div>
           </div>
           <DetailRow label="特殊要求 / 過敏" value={`${data.specialMenuReq || ''} ${data.allergies ? `/ ALLERGY: ${data.allergies}` : ''}`} widthClass="w-full" highlight={!!data.allergies}/>
        </Section>
        <Section title="費用明細 (Billing)">
           <div className="w-full px-2">
              <table className="w-full text-xs border-collapse mb-2">
                 <thead>
                    <tr className="border-b border-slate-300 bg-slate-50">
                       <th className="text-left py-1 px-1">項目</th>
                       <th className="text-right py-1 px-1">單價</th>
                       <th className="text-center py-1 px-1">數量</th>
                       <th className="text-right py-1 px-1">金額</th>
                    </tr>
                 </thead>
                 <tbody>
                    {(data.menus || []).map((m, i) => (
                       <tr key={`m-${i}`} className="border-b border-slate-100">
                          <td className="py-1 px-1">{m.title}</td>
                          <td className="text-right px-1">${formatMoney(m.price)}</td>
                          <td className="text-center px-1">{m.qty}</td>
                          <td className="text-right px-1 font-mono">${formatMoney((m.price||0)*(m.qty||1))}</td>
                       </tr>
                    ))}
                    {data.servingStyle === '位上' && parseFloat(data.platingFee) > 0 && (
                        <tr className="border-b border-slate-100 bg-blue-50/30">
                           <td className="py-1 px-1">位上服務費 (Plating Service Fee)</td>
                           <td className="text-right px-1">${formatMoney(data.platingFee)}</td>
                           <td className="text-center px-1">{data.tableCount}</td>
                           <td className="text-right px-1 font-mono">${formatMoney(platingTotal)}</td>
                        </tr>
                    )}
                    <tr className="border-b border-slate-100">
                       <td className="py-1 px-1">酒水 ({data.drinksPackage || 'Standard'})</td>
                       <td className="text-right px-1">${formatMoney(data.drinksPrice)}</td>
                       <td className="text-center px-1">{data.drinksQty}</td>
                       <td className="text-right px-1 font-mono">${formatMoney((data.drinksPrice||0)*(data.drinksQty||1))}</td>
                    </tr>
                    
                    {(data.customItems || []).map((item, i) => (
                       <tr key={`c-${i}`} className="border-b border-slate-100">
                          <td className="py-1 px-1">{item.name}</td>
                          <td className="text-right px-1">${formatMoney(item.price)}</td>
                          <td className="text-center px-1">{item.qty}</td>
                          <td className="text-right px-1 font-mono">${formatMoney((item.price||0)*(item.qty||1))}</td>
                       </tr>
                    ))}
                 </tbody>
                 <tfoot>
                    <tr><td colSpan="3" className="text-right pt-2 text-slate-500">小計 (Subtotal):</td><td className="text-right pt-2 font-mono">${formatMoney(subtotal)}</td></tr>
                    <tr><td colSpan="3" className="text-right text-slate-500">服務費 ({scLabel}):</td><td className="text-right font-mono text-slate-500">+${formatMoney(serviceChargeVal)}</td></tr>
                    <tr><td colSpan="3" className="text-right text-slate-500">折扣 (Discount):</td><td className="text-right font-mono text-red-500">-${formatMoney(discountVal)}</td></tr>
                    <tr className="border-t border-slate-300"><td colSpan="3" className="text-right font-bold pt-1 text-sm">總金額 (Total):</td><td className="text-right font-bold pt-1 font-mono text-sm">${formatMoney(data.totalAmount)}</td></tr>
                    <tr><td colSpan="3" className="text-right text-slate-500">已收訂金:</td><td className="text-right text-slate-500 font-mono">-${formatMoney((Number(data.deposit1)||0) + (Number(data.deposit2)||0) + (Number(data.deposit3)||0))}</td></tr>
                    <tr><td colSpan="3" className="text-right font-bold text-red-600">餘額 (Balance):</td><td className="text-right font-bold text-red-600 font-mono">${formatMoney(Number(data.totalAmount) - ((Number(data.deposit1)||0) + (Number(data.deposit2)||0) + (Number(data.deposit3)||0)))}</td></tr>
                 </tfoot>
              </table>
           </div>
        </Section>
        
        {/* REVENUE ALLOCATION - TABLE VIEW */}
        <Section title="營收分配明細 (Detailed Revenue Allocation)" color="gray">
            <div className="w-full px-2">
                <table className="w-full text-xs border-collapse table-fixed">
                    <colgroup>
                        <col className="w-[15%]" />
                        <col className="w-[40%]" />
                        <col className="w-[15%]" />
                        <col className="w-[10%]" />
                        <col className="w-[15%]" />
                        <col className="w-[5%]" />
                    </colgroup>
                    <thead>
                        <tr className="border-b-2 border-slate-800 bg-slate-50 text-slate-600">
                            <th className="text-left py-2 px-2">部門 (Dept)</th>
                            <th className="text-left py-2 px-2">項目 (Item)</th>
                            <th className="text-right py-2 px-2">單價 (Unit)</th>
                            <th className="text-center py-2 px-2">數量 (Qty)</th>
                            <th className="text-right py-2 px-2">總額 (Total)</th>
                            <th className="text-right py-2 px-2">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {Object.values(detailedAlloc).map((dept, i) => (
                            <React.Fragment key={i}>
                                {dept.items.map((item, idx) => (
                                    <tr key={`${i}-${idx}`} className={idx === 0 ? "border-t border-slate-100" : ""}>
                                        <td className="py-1 px-2 font-bold text-slate-700 align-top">
                                            {idx === 0 ? dept.label : ''}
                                        </td>
                                        <td className="py-1 px-2 text-slate-600 align-top">
                                            <span>{item.name}</span>
                                            {item.subLabel && <span className="ml-2 text-[9px] bg-slate-100 text-slate-500 px-1 rounded">{item.subLabel}</span>}
                                        </td>
                                        <td className="py-1 px-2 text-right font-mono text-slate-500 align-top">
                                            ${formatMoney(item.unit)}
                                        </td>
                                        <td className="py-1 px-2 text-center text-slate-500 align-top">
                                            {item.qty}
                                        </td>
                                        <td className="py-1 px-2 text-right font-mono font-medium text-slate-800 align-top">
                                            ${formatMoney(item.amount)}
                                        </td>
                                        <td className="py-1 px-2 text-right text-[10px] text-slate-400 align-top"></td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <td colSpan="4" className="py-1 px-2 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {dept.label.split(' ')[0]} Subtotal
                                    </td>
                                    <td className={`py-1 px-2 text-right font-mono font-bold border-t border-slate-300 ${dept.total === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                                        ${formatMoney(dept.total)}
                                    </td>
                                    <td className={`py-1 px-2 text-right text-[10px] font-bold ${dept.total === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                                        {subtotal > 0 ? ((dept.total / subtotal) * 100).toFixed(1) : 0}%
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-slate-800 bg-slate-100">
                            <td colSpan="4" className="pt-2 pb-2 px-2 font-black text-right uppercase">
                                營收總計 (Total Revenue)
                            </td>
                            <td className="pt-2 pb-2 px-2 text-right font-mono font-black text-sm">
                                ${formatMoney(subtotal)}
                            </td>
                            <td className="pt-2 pb-2 px-2 text-right font-bold text-xs">
                                100%
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Section>

        <Section title="其他資訊 (Other Info)">
           <DetailRow label="泊車" value={data.parkingInfo?.plates} widthClass="w-full" />
           <DetailRow label="其他備註" value={data.otherNotes} widthClass="w-full" />
        </Section>
      </div>
      <div className="break-after-page"></div>

      {/* PAGE 2 & 3: SETUP & KITCHEN COPIES */}
      <div className="print-page">
        <Header title="活動指示單 (EO)" copyType="Setup & Logistics" badgeColor="bg-indigo-600" />
        <EventSummary />
        <Section title="A. 場地設置 (Venue Setup)" color="indigo">
           <div className="flex flex-wrap w-full bg-slate-50 p-2 rounded mb-4 border border-slate-100">
              <DetailRow label="檯布顏色" value={data.tableClothColor} />
              <DetailRow label="椅套顏色" value={data.chairCoverColor} />
              <DetailRow label="主家席" value={data.headTableColorType === 'custom' ? data.headTableCustomColor : '同客席'} />
              <DetailRow label="新娘房" value={data.bridalRoom ? `✅ 使用 (${data.bridalRoomHours})` : '❌ 不使用'} />
           </div>
           {(data.stageDecor || data.stageDecorPhoto) && <div className="mt-3 flex gap-4 border-t border-slate-200 pt-2"><div className="flex-1"><span className="text-xs font-bold text-slate-500 block">舞台/花藝:</span><p className="text-sm whitespace-pre-wrap">{data.stageDecor || '無'}</p></div>{data.stageDecorPhoto && <img src={data.stageDecorPhoto} alt="Stage Ref" className="w-24 h-24 object-cover border rounded bg-white" />}</div>}
           <div className="w-full px-2 mt-2">
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase">物資清單</p>
              <div className="flex flex-wrap">{Object.keys(equipmentMap).map(key => <CheckItem key={key} label={equipmentMap[key]} checked={data.equipment?.[key]} />)}</div>
           </div>
        </Section>
        <Section title="B. 裝飾佈置 (Decoration)" color="indigo">
           <div className="w-full px-2">
              <div className="flex flex-wrap mb-2">{Object.keys(decorationMap).map(key => <CheckItem key={key} label={decorationMap[key]} checked={data.decoration?.[key]} />)}</div>
              <div className="grid grid-cols-2 gap-4 mt-3 bg-slate-50 p-2 rounded">
                 {data.equipment?.nameSign && <div className="text-xs"><strong>禮堂字牌:</strong> {data.nameSignText || '無文字'}</div>}
                 {data.decoration?.invites && <div className="text-xs"><strong>喜帖數量:</strong> {data.invitesQty || '-'} 套</div>}
                 {data.decoration?.ceremonyChairs && <div className="text-xs"><strong>證婚椅:</strong> {data.decorationChairsQty || '-'} 張</div>}
              </div>
              {(data.venueDecor || data.venueDecorPhoto) && <div className="mt-3 flex gap-4 border-t border-slate-200 pt-2"><div className="flex-1"><span className="text-xs font-bold text-slate-500 block">場地佈置備註:</span><p className="text-sm whitespace-pre-wrap">{data.venueDecor || '無'}</p></div>{data.venueDecorPhoto && <img src={data.venueDecorPhoto} alt="Decor Ref" className="w-24 h-24 object-cover border rounded bg-white" />}</div>}
           </div>
        </Section>
        <Section title="C. 影音工程 (AV)" color="indigo">
           <div className="w-full px-2">
              <div className="flex flex-wrap mb-3">{Object.keys(avMap).map(key => <CheckItem key={key} label={avMap[key]} checked={data.avRequirements?.[key]} />)}</div>
              <div className="space-y-2"><DetailRow label="AV 備註" value={data.avNotes} widthClass="w-full" /><DetailRow label="其他器材" value={data.avOther} widthClass="w-full" /></div>
           </div>
        </Section>
        <Section title="D. 物流與泊車 (Logistics)" color="indigo">
           <div className="w-full px-2 space-y-4">
              <div className="border border-slate-300 rounded overflow-hidden">
                 <div className="bg-slate-100 px-2 py-1 border-b border-slate-300 flex justify-between items-center"><span className="text-xs font-bold text-slate-700 uppercase">送貨安排</span><span className="text-[10px] bg-white px-1.5 rounded border border-slate-300">共 {data.deliveries?.length || 0} 項</span></div>
                 {(!data.deliveries || data.deliveries.length === 0) ? (<div className="p-2 text-xs text-slate-400 italic">無送貨登記</div>) : (<div className="divide-y divide-slate-200">{data.deliveries.map((item, i) => (<div key={i} className="p-2 flex gap-4"><div className="w-1/3"><div className="font-bold text-sm text-slate-800">{item.unit || '-'}</div><div className="flex gap-1 mt-1"><span className="text-xs font-mono bg-white px-1 rounded border border-slate-300">{formatShortDate(item.date)}</span><span className="text-xs font-mono bg-slate-50 px-1 rounded border border-slate-200">{item.time || '--:--'}</span></div></div><div className="flex-1 text-sm whitespace-pre-wrap border-l border-slate-100 pl-4 text-slate-600">{item.items || '無備註'}</div></div>))}</div>)}
              </div>
              <div className="border border-slate-300 rounded p-2 flex gap-4">
                 <div className="w-1/2"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">免費泊車券</span><div className="flex items-baseline gap-2"><span className="text-2xl font-black text-slate-800">{data.parkingInfo?.ticketQty || '0'}</span><span className="text-xs font-bold text-slate-500">張</span><span className="text-slate-300">x</span><span className="text-xl font-bold text-slate-800">{data.parkingInfo?.ticketHours || '0'}</span><span className="text-xs font-bold text-slate-500">小時</span></div></div>
                 <div className="w-1/2 border-l border-dashed border-slate-300 pl-4"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">車牌登記</span><p className="font-mono text-sm font-bold whitespace-pre-wrap">{data.parkingInfo?.plates || '無'}</p></div>
              </div>
              {data.otherNotes && (<div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"><span className="font-bold text-slate-600 mr-2">⚠️ 其他備註:</span>{data.otherNotes}</div>)}
           </div>
        </Section>
      </div>
      <div className="break-after-page"></div>

      {/* PAGE 3: KITCHEN COPY */}
      <div className="print-page">
        <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
           <div><h1 className="text-5xl font-black tracking-tight uppercase">廚房出品單</h1><p className="text-2xl font-bold mt-2">{cleanLocation(data.venueLocation) || '未定位置'}</p></div>
           <div className="text-right"><div className="inline-block bg-black text-white px-6 py-2 text-2xl font-bold rounded mb-2">KITCHEN</div><div className="text-3xl font-mono font-bold">{formatDateWithDay(data.date)}</div><div className="text-5xl font-black text-red-600 mt-4 border-4 border-red-600 px-4 py-2 rounded-lg inline-block bg-white shadow-sm">{data.servingTime ? `${data.servingTime} 起菜` : `${data.startTime} 預備`}</div></div>
        </div>
        <div className="flex gap-4 mb-8">
           <div className="flex-1 bg-slate-100 p-6 border-l-[12px] border-slate-800"><span className="block text-slate-500 text-lg font-bold uppercase">活動</span><span className="block text-3xl font-bold mt-1">{data.eventName}</span></div>
           <div className="flex-1 bg-slate-100 p-6 border-l-[12px] border-black"><span className="block text-slate-500 text-lg font-bold uppercase">席數</span><span className="block text-6xl font-black mt-1">{data.tableCount || '-'}</span></div>
           <div className="flex-1 bg-slate-100 p-6 border-l-[12px] border-slate-600"><span className="block text-slate-500 text-lg font-bold uppercase">人數</span><span className="block text-6xl font-black mt-1">{data.guestCount || '-'}</span></div>
        </div>
        <div className="mb-8 p-6 border-4 border-black rounded-xl">
           <div className="flex justify-between items-center mb-6 border-b-2 border-gray-300 pb-4"><h3 className="text-4xl font-bold">餐單內容</h3><span className="text-2xl font-bold bg-gray-200 px-4 py-2 rounded">{data.servingStyle}</span></div>
           <div className="space-y-8">{data.menus && data.menus.length > 0 ? (data.menus.map((menu, idx) => (<div key={idx}>{menu.title && <h4 className="text-3xl font-bold underline mb-3">{menu.title}</h4>}<p className="text-3xl font-semibold leading-relaxed whitespace-pre-wrap">{onlyChinese(menu.content)}</p></div>))) : (<p className="text-3xl font-semibold leading-relaxed">{onlyChinese(data.menuType)}</p>)}</div>
        </div>
        {(data.specialMenuReq || data.allergies) && (<div className="mb-8 p-6 border-8 border-red-600 rounded-xl bg-red-50"><h3 className="text-3xl font-black text-red-600 mb-4 underline flex items-center"><AlertTriangle size={48} className="mr-4"/> 特殊飲食 & 過敏</h3><p className="text-4xl font-bold text-red-800 whitespace-pre-wrap leading-snug">{data.specialMenuReq}{data.specialMenuReq && data.allergies && '\n'}{data.allergies}</p></div>)}
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
  const [localSettings, setLocalSettings] = useState({ minSpendRules: [], defaultMenus: [], paymentRules: [], ...settings });
  const [activeSubTab, setActiveSubTab] = useState('minSpend'); 
  
  // UPDATED: Min Spend now holds objects { lunch: '', dinner: '' }
  const [editingRule, setEditingRule] = useState({ 
      id: null, 
      locations: [], 
      prices: { 
        Mon: {lunch:'', dinner:''}, Tue: {lunch:'', dinner:''}, Wed: {lunch:'', dinner:''}, 
        Thu: {lunch:'', dinner:''}, Fri: {lunch:'', dinner:''}, Sat: {lunch:'', dinner:''}, Sun: {lunch:'', dinner:''} 
      } 
  });

  // UPDATED: Menu now has priceWeekday and priceWeekend
  const [editingMenu, setEditingMenu] = useState({ id: null, title: '', content: '', type: 'food', priceWeekday: '', priceWeekend: '', allocation: {} });
  
  const [editingPaymentRule, setEditingPaymentRule] = useState({ id: null, name: '', minMonthsInAdvance: 0, deposit1: 30, deposit1Offset: 0, deposit2: 30, deposit2Offset: 3, deposit3: 30, deposit3Offset: 6 });

  // Handlers
  const handleSaveRule = () => {
    if (editingRule.locations.length === 0) return addToast("請至少選擇一個區域", "error");
    const newRules = [...(localSettings.minSpendRules || [])];
    if (editingRule.id) { const idx = newRules.findIndex(r => r.id === editingRule.id); if (idx !== -1) newRules[idx] = editingRule; } else { newRules.push({ ...editingRule, id: Date.now() }); }
    const updatedSettings = { ...localSettings, minSpendRules: newRules }; setLocalSettings(updatedSettings); onSave(updatedSettings); 
    // Reset
    setEditingRule({ id: null, locations: [], prices: { Mon: {lunch:'', dinner:''}, Tue: {lunch:'', dinner:''}, Wed: {lunch:'', dinner:''}, Thu: {lunch:'', dinner:''}, Fri: {lunch:'', dinner:''}, Sat: {lunch:'', dinner:''}, Sun: {lunch:'', dinner:''} } }); 
    addToast("規則已儲存", "success");
  };
  const handleDeleteRule = (id) => { const updatedSettings = { ...localSettings, minSpendRules: localSettings.minSpendRules.filter(r => r.id !== id) }; setLocalSettings(updatedSettings); onSave(updatedSettings); };
  
  const handleSaveMenu = () => {
    if (!editingMenu.title) return addToast("請輸入標題", "error");
    const newMenus = [...(localSettings.defaultMenus || [])];
    if (editingMenu.id) { const idx = newMenus.findIndex(m => m.id === editingMenu.id); if (idx !== -1) newMenus[idx] = editingMenu; } else { newMenus.push({ ...editingMenu, id: Date.now() }); }
    const updatedSettings = { ...localSettings, defaultMenus: newMenus }; setLocalSettings(updatedSettings); onSave(updatedSettings); 
    setEditingMenu({ id: null, title: '', content: '', type: 'food', priceWeekday: '', priceWeekend: '', allocation: {} }); 
    addToast("菜單已儲存", "success");
  };
  const handleDeleteMenu = (id) => { const updatedSettings = { ...localSettings, defaultMenus: localSettings.defaultMenus.filter(m => m.id !== id) }; setLocalSettings(updatedSettings); onSave(updatedSettings); };
  const handleSavePaymentRule = () => { /* (Keep existing logic) */ if (!editingPaymentRule.name) return addToast("請輸入規則名稱", "error"); const totalPercent = editingPaymentRule.deposit1 + editingPaymentRule.deposit2 + editingPaymentRule.deposit3; if(totalPercent > 100) return addToast("錯誤：訂金總比例不能超過 100%", "error"); const newRules = [...(localSettings.paymentRules || [])]; if (editingPaymentRule.id) { const idx = newRules.findIndex(r => r.id === editingPaymentRule.id); if (idx !== -1) newRules[idx] = editingPaymentRule; } else { newRules.push({ ...editingPaymentRule, id: Date.now() }); } newRules.sort((a, b) => b.minMonthsInAdvance - a.minMonthsInAdvance); const updatedSettings = { ...localSettings, paymentRules: newRules }; setLocalSettings(updatedSettings); onSave(updatedSettings); setEditingPaymentRule({ id: null, name: '', minMonthsInAdvance: 0, deposit1: 30, deposit1Offset: 0, deposit2: 30, deposit2Offset: 3, deposit3: 30, deposit3Offset: 6 }); addToast("付款規則已儲存", "success"); };
  const handleDeletePaymentRule = (id) => { const updatedSettings = { ...localSettings, paymentRules: localSettings.paymentRules.filter(r => r.id !== id) }; setLocalSettings(updatedSettings); onSave(updatedSettings); };

  // Helper to safely get nested price
  const getPriceVal = (rule, day, type) => {
      if(typeof rule.prices[day] === 'object') return rule.prices[day][type];
      return type === 'dinner' ? rule.prices[day] : ''; // Fallback for old data
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div><h2 className="text-2xl font-bold text-slate-800">系統設定 (Settings)</h2><p className="text-slate-500">管理場地規則、預設餐單與付款條款</p></div></div>
      <div className="flex space-x-1 border-b border-slate-200">
        <button onClick={() => setActiveSubTab('minSpend')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSubTab === 'minSpend' ? 'bg-white border-x border-t border-slate-200 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>場地低消 (Min Spend)</button>
        <button onClick={() => setActiveSubTab('menus')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSubTab === 'menus' ? 'bg-white border-x border-t border-slate-200 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>餐飲預設 (Presets)</button>
        <button onClick={() => setActiveSubTab('payment')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeSubTab === 'payment' ? 'bg-white border-x border-t border-slate-200 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}>付款規則 (Payment Rules)</button>
      </div>
      
      {/* Min Spend Tab - UPDATED with Dual Inputs */}
      {activeSubTab === 'minSpend' && (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5 space-y-4">
                    <Card className="p-5 border-l-4 border-l-blue-500">
                        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">{editingRule.id ? <Edit2 size={18} className="mr-2"/> : <Plus size={18} className="mr-2"/>}{editingRule.id ? "編輯規則" : "新增規則"}</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">1. 選擇區域組合</label>
                            <div className="flex flex-wrap gap-2">{LOCATION_CHECKBOXES.map(loc => (<button key={loc} onClick={() => setEditingRule(p => ({...p, locations: p.locations.includes(loc)?p.locations.filter(l=>l!==loc):[...p.locations, loc]}))} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${editingRule.locations.includes(loc) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}>{loc}</button>))}</div>
                        </div>
                        <div className="mb-6">
                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2"><span>2. 設定每日低消</span><span className="flex gap-8 mr-4"><span>午市 (Lunch)</span><span>晚市 (Dinner)</span></span></div>
                            <div className="space-y-2">
                                {DAYS_OF_WEEK.map(day => (
                                    <div key={day} className="flex items-center gap-2">
                                        <span className="w-8 text-xs font-bold text-slate-500 uppercase">{day}</span>
                                        {/* Lunch Input */}
                                        <div className="relative flex-1">
                                            <input type="number" 
                                                value={editingRule.prices[day]?.lunch || ''} 
                                                onChange={(e) => setEditingRule(p=>({...p, prices:{...p.prices, [day]:{...p.prices[day], lunch: e.target.value}}}))} 
                                                className="w-full px-2 py-1 text-sm border border-slate-300 rounded outline-none focus:border-blue-500 text-center" 
                                                placeholder="Lunch"
                                            />
                                        </div>
                                        {/* Dinner Input */}
                                        <div className="relative flex-1">
                                            <input type="number" 
                                                value={editingRule.prices[day]?.dinner || ''} 
                                                onChange={(e) => setEditingRule(p=>({...p, prices:{...p.prices, [day]:{...p.prices[day], dinner: e.target.value}}}))} 
                                                className="w-full px-2 py-1 text-sm border border-slate-300 rounded outline-none focus:border-blue-500 text-center bg-blue-50/30" 
                                                placeholder="Dinner"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2"><button onClick={handleSaveRule} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">更新/新增</button>{editingRule.id && <button onClick={() => setEditingRule({ id: null, locations: [], prices: { Mon: {lunch:'',dinner:''}, Tue: {lunch:'',dinner:''}, Wed: {lunch:'',dinner:''}, Thu: {lunch:'',dinner:''}, Fri: {lunch:'',dinner:''}, Sat: {lunch:'',dinner:''}, Sun: {lunch:'',dinner:''} } })} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold">取消</button>}</div>
                    </Card>
                </div>
                <div className="md:col-span-7">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-700">規則列表</h3></div>
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                            {localSettings.minSpendRules.map((rule) => (
                                <div key={rule.id} className="p-4 hover:bg-blue-50/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-wrap gap-1">{rule.locations.map(l => <span key={l} className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded font-bold">{l}</span>)}</div>
                                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingRule(rule)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14}/></button><button onClick={() => handleDeleteRule(rule.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14}/></button></div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-600 text-center">
                                        {DAYS_OF_WEEK.map(day => (
                                            <div key={day} className="flex flex-col border rounded bg-slate-50 p-1">
                                                <span className="font-bold mb-1">{day}</span>
                                                <span className="text-slate-400">L: {getPriceVal(rule, day, 'lunch') ? `$${parseInt(getPriceVal(rule, day, 'lunch')/1000)}k` : '-'}</span>
                                                <span className="text-blue-600 font-bold">D: {getPriceVal(rule, day, 'dinner') ? `$${parseInt(getPriceVal(rule, day, 'dinner')/1000)}k` : '-'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Menu Tab - UPDATED with Dual Pricing */}
      {activeSubTab === 'menus' && (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5 space-y-4">
                    <Card className="p-5 border-l-4 border-l-emerald-500">
                        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">{editingMenu.id ? <Edit2 size={18} className="mr-2"/> : <Plus size={18} className="mr-2"/>}{editingMenu.id ? "編輯預設" : "新增預設"}</h3>
                        <div className="space-y-4">
                            <div className="flex space-x-2"><button onClick={() => setEditingMenu(p => ({...p, type: 'food'}))} className={`flex-1 py-2 rounded border text-sm font-bold ${editingMenu.type === 'food' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-slate-300'}`}><Utensils size={14} className="inline mr-1"/> Menu</button><button onClick={() => setEditingMenu(p => ({...p, type: 'drink'}))} className={`flex-1 py-2 rounded border text-sm font-bold ${editingMenu.type === 'drink' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-slate-300'}`}><Coffee size={14} className="inline mr-1"/> Drink</button></div>
                            <FormInput label="標題" value={editingMenu.title} onChange={e => setEditingMenu(p => ({...p, title: e.target.value}))}/>
                            
                            {/* DUAL PRICES */}
                            <div className="grid grid-cols-2 gap-4">
                                <MoneyInput label="平日價 (Mon-Thu)" name="priceWeekday" value={editingMenu.priceWeekday} onChange={e => setEditingMenu(p => ({...p, priceWeekday: e.target.value}))}/>
                                <MoneyInput label="週末價 (Fri-Sun)" name="priceWeekend" value={editingMenu.priceWeekend} onChange={e => setEditingMenu(p => ({...p, priceWeekend: e.target.value}))}/>
                            </div>

                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center"><PieChart size={14} className="mr-1.5"/> 部門拆帳 (金額)</h4>
                                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
                                    {DEPARTMENTS.map(dept => (
                                        <div key={dept.key}>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">{dept.label.split(' ')[0]}</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                                <input type="number" value={editingMenu.allocation?.[dept.key] || ''} onChange={e => setEditingMenu(prev => ({ ...prev, allocation: { ...prev.allocation, [dept.key]: e.target.value } }))} className="w-full pl-5 pr-2 py-1 text-sm border border-slate-300 rounded outline-none" placeholder="0"/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {editingMenu.type === 'food' ? (<FormTextArea label="內容" value={editingMenu.content} onChange={e => setEditingMenu(p => ({...p, content: e.target.value}))} rows={6} placeholder="輸入詳細菜色..."/>) : (<FormInput label="酒水內容" value={editingMenu.content} onChange={e => setEditingMenu(p => ({...p, content: e.target.value}))}/>)}
                            <div className="flex gap-2"><button onClick={handleSaveMenu} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold">儲存</button>{editingMenu.id && <button onClick={() => setEditingMenu({id:null, title:'', content:'', type:'food', priceWeekday: '', priceWeekend: '', allocation: {}})} className="px-4 bg-slate-100 rounded-lg text-slate-600 font-bold">取消</button>}</div>
                        </div>
                    </Card>
                </div>
                <div className="md:col-span-7">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-700">預設列表</h3></div>
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">{localSettings.defaultMenus.map(m => (<div key={m.id} className="p-4 hover:bg-emerald-50/50 transition-colors group"><div className="flex justify-between items-start mb-1"><div className="flex items-center"><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase mr-2 ${m.type === 'food' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{m.type === 'food' ? 'MENU' : 'DRINK'}</span><span className="font-bold text-slate-800">{m.title}</span><span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">平日 ${formatMoney(m.priceWeekday)} / 週末 ${formatMoney(m.priceWeekend)}</span></div><div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingMenu(m)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14}/></button><button onClick={() => handleDeleteMenu(m.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14}/></button></div></div>{m.allocation && (<div className="flex gap-2 text-[10px] text-slate-400 mt-1 mb-1">{Object.entries(m.allocation).map(([k, v]) => v > 0 && <span key={k}>{DEPARTMENTS.find(d=>d.key===k)?.label.split(' ')[0]}:${v}</span>)}</div>)}<p className="text-xs text-slate-500 whitespace-pre-wrap line-clamp-2">{m.content}</p></div>))}</div>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* Payment Rules Tab */}
      {activeSubTab === 'payment' && (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Column: Editor Form */}
                <div className="md:col-span-5 space-y-4">
                    <Card className="p-5 border-l-4 border-l-violet-500">
                        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
                           {editingPaymentRule.id ? <Edit2 size={18} className="mr-2"/> : <Plus size={18} className="mr-2"/>}
                           {editingPaymentRule.id ? "編輯付款規則" : "新增付款規則"}
                        </h3>
                        
                        <div className="space-y-4">
                            <FormInput 
                                label="規則名稱 (Rule Name)" 
                                placeholder="e.g. Standard Wedding, Last Minute"
                                value={editingPaymentRule.name} 
                                onChange={e => setEditingPaymentRule(p => ({...p, name: e.target.value}))}
                            />
                            
                            <FormInput 
                                label="最少提前月數 (Min Months in Advance)" 
                                type="number"
                                placeholder="0 = 適用於所有"
                                value={editingPaymentRule.minMonthsInAdvance} 
                                onChange={e => setEditingPaymentRule(p => ({...p, minMonthsInAdvance: parseInt(e.target.value) || 0}))}
                            />

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                                <div className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">分期設定 (Installments)</div>
                                
                                {/* Deposit 1 */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600">訂金 1 (%)</label>
                                        <div className="relative">
                                            <input type="number" value={editingPaymentRule.deposit1} onChange={e => setEditingPaymentRule(p => ({...p, deposit1: parseFloat(e.target.value)||0}))} className="w-full pl-2 pr-6 py-1 text-sm border rounded outline-none"/>
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600">付款限期 (Offset)</label>
                                        <select value={editingPaymentRule.deposit1Offset} onChange={e => setEditingPaymentRule(p => ({...p, deposit1Offset: parseInt(e.target.value)}))} className="w-full py-1 text-sm border rounded outline-none bg-white">
                                            <option value={0}>即時 (Immediate)</option>
                                            <option value={1}>+1 個月</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Deposit 2 */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600">訂金 2 (%)</label>
                                        <div className="relative">
                                            <input type="number" value={editingPaymentRule.deposit2} onChange={e => setEditingPaymentRule(p => ({...p, deposit2: parseFloat(e.target.value)||0}))} className="w-full pl-2 pr-6 py-1 text-sm border rounded outline-none"/>
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600">付款限期 (Offset)</label>
                                        <select value={editingPaymentRule.deposit2Offset} onChange={e => setEditingPaymentRule(p => ({...p, deposit2Offset: parseInt(e.target.value)}))} className="w-full py-1 text-sm border rounded outline-none bg-white">
                                            <option value={1}>+1 個月</option>
                                            <option value={3}>+3 個月</option>
                                            <option value={6}>+6 個月</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Deposit 3 */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600">訂金 3 (%)</label>
                                        <div className="relative">
                                            <input type="number" value={editingPaymentRule.deposit3} onChange={e => setEditingPaymentRule(p => ({...p, deposit3: parseFloat(e.target.value)||0}))} className="w-full pl-2 pr-6 py-1 text-sm border rounded outline-none"/>
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600">付款限期 (Offset)</label>
                                        <select value={editingPaymentRule.deposit3Offset} onChange={e => setEditingPaymentRule(p => ({...p, deposit3Offset: parseInt(e.target.value)}))} className="w-full py-1 text-sm border rounded outline-none bg-white">
                                            <option value={3}>+3 個月</option>
                                            <option value={6}>+6 個月</option>
                                            <option value={9}>+9 個月</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={handleSavePaymentRule} className="flex-1 bg-violet-600 text-white py-2 rounded-lg font-bold hover:bg-violet-700 transition-colors">儲存規則</button>
                                {editingPaymentRule.id && <button onClick={() => setEditingPaymentRule({ id: null, name: '', minMonthsInAdvance: 0, deposit1: 30, deposit1Offset: 0, deposit2: 30, deposit2Offset: 3, deposit3: 30, deposit3Offset: 6 })} className="px-4 bg-slate-100 rounded-lg text-slate-600 font-bold">取消</button>}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Rules List */}
                <div className="md:col-span-7">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-700">現有規則 (Active Rules)</h3>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                            {localSettings.paymentRules.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">暫無付款規則</div>
                            ) : (
                                localSettings.paymentRules.map(rule => (
                                    <div key={rule.id} className="p-4 hover:bg-violet-50/50 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-bold text-slate-800 block">{rule.name}</span>
                                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                    適用於: {rule.minMonthsInAdvance > 0 ? `提前 ${rule.minMonthsInAdvance} 個月或以上` : '所有訂單 (預設)'}
                                                </span>
                                            </div>
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingPaymentRule(rule)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDeletePaymentRule(rule.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                        
                                        {/* Visual Timeline Bar */}
                                        <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 mt-3">
                                            <div style={{width: `${rule.deposit1}%`}} className="bg-emerald-400" title={`1st Deposit: ${rule.deposit1}%`}></div>
                                            <div style={{width: `${rule.deposit2}%`}} className="bg-emerald-300" title={`2nd Deposit: ${rule.deposit2}%`}></div>
                                            <div style={{width: `${rule.deposit3}%`}} className="bg-emerald-200" title={`3rd Deposit: ${rule.deposit3}%`}></div>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                                            <span>Dep 1: {rule.deposit1}%</span>
                                            <span>Dep 2: {rule.deposit2}%</span>
                                            <span>Dep 3: {rule.deposit3}%</span>
                                            <span className="text-red-400 font-bold">Bal: {100 - (rule.deposit1+rule.deposit2+rule.deposit3)}%</span>
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


const AiAssistant = ({ formData, setFormData, onClose, initialPrompt = '', initialMessage = null }) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('edit');

  // --- FIX: React to initialMessage prop changes ---
  useEffect(() => {
    if (initialMessage) {
        setResult({ type: 'text', content: initialMessage });
        setMode('whatsapp'); // Auto-switch to WhatsApp tab
    } else {
        setResult(null);
        setPrompt(initialPrompt); // Reset prompt if needed
        setMode('edit');
    }
  }, [initialMessage, initialPrompt]);

  const API_KEY = "sk-2525b0605e7641b1a62cd405a7c37101"; 
  const SLEEKFLOW_API_KEY = "l103V8DT4I65XqdUEnoZ8UGPztiJ75VFwHsJAO8TrXI"; 

  const handleAiAction = async () => {
    if (!prompt) return;
    setLoading(true);
    setResult(null);

    const total = Number(formData.totalAmount) || 0;
    const d1 = Number(formData.deposit1) || 0;
    const d2 = Number(formData.deposit2) || 0;
    const d3 = Number(formData.deposit3) || 0;
    const totalPaid = (formData.deposit1Received ? d1 : 0) + (formData.deposit2Received ? d2 : 0) + (formData.deposit3Received ? d3 : 0);
    const balance = total - totalPaid;

    const contextData = {
      eventName: formData.eventName, clientName: formData.clientName, eventDate: formData.date,
      payments: {
        totalAmount: total, totalPaid: totalPaid, outstandingBalance: balance,
        breakdown: [
          { name: "1st Deposit", amount: d1, dueDate: formData.deposit1Date, status: formData.deposit1Received ? "PAID" : "UNPAID (DUE)" },
          { name: "2nd Deposit", amount: d2, dueDate: formData.deposit2Date, status: formData.deposit2Received ? "PAID" : "UNPAID" },
          { name: "Final Balance", amount: balance, dueDate: formData.balanceDueDateType === '10daysPrior' ? "10 Days Before Event" : "Event Day", status: formData.balanceReceived ? "PAID" : "UNPAID" }
        ]
      }
    };

    try {
      let systemContent = "";
      if (mode === 'edit') {
        systemContent = `You are a helper. Return JSON only. Context: ${JSON.stringify(contextData)}`;
      } else if (mode === 'email') {
        systemContent = `You are a Banquet Manager writing an email. CONTEXT: ${JSON.stringify(contextData)} TASK: Write a professional email in Traditional Chinese. RULES: 1. Start directly with the greeting. 2. ALWAYS use 'HKD'.`;
      } else {
        systemContent = `You are a Banquet Manager writing a WhatsApp message. CONTEXT: ${JSON.stringify(contextData)} TASK: Write a short, friendly message in Traditional Chinese. RULES: 1. Keep it brief. 2. ALWAYS use 'HKD'.`;
      }

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "system", content: systemContent }, { role: "user", content: prompt }],
          temperature: 0.7,
          response_format: mode === 'edit' ? { type: "json_object" } : { type: "text" }
        })
      });

      if (!response.ok) throw new Error("API Error");
      const data = await response.json();
      const aiContent = data.choices[0].message.content;

      if (mode === 'edit') {
        try {
          const cleanJson = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
          setResult({ type: 'json', content: JSON.parse(cleanJson) });
        } catch (e) { setResult({ type: 'error', content: "JSON Error" }); }
      } else {
        setResult({ type: 'text', content: aiContent });
      }
    } catch (error) {
      setResult({ type: 'error', content: "Connection Error" });
    } finally {
      setLoading(false);
    }
  };

  const applyChanges = () => {
    if (result && result.type === 'json') {
      setFormData(prev => ({ ...prev, ...result.content }));
      onClose();
    }
  };

  const sendViaSleekFlow = async () => {
    if (!result || !result.content) return;
    setSending(true);

    let phone = formData.clientPhone || "";
    phone = phone.replace(/[^0-9]/g, ''); 
    if (phone.length === 8) phone = "852" + phone; 

    try {
      const payload = {
        channel: "whatsappcloudapi",
        from: "85252226066", 
        to: phone,           
        messageType: "text",
        messageContent: result.content, 
        analyticTags: ["CRM_Auto", "Event_EO"]
      };

      const response = await fetch("https://api.sleekflow.io/api/message/send/json", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sleekflow-Api-Key": SLEEKFLOW_API_KEY },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("✅ Message sent via SleekFlow!");
        onClose();
      } else {
        const txt = await response.text();
        alert(`❌ Send Failed: ${txt}`);
      }
    } catch (error) {
      alert("❌ Network Error");
    } finally {
      setSending(false);
    }
  };

  const handleOpenEmailApp = () => {
    if (!result || !result.content) return;
    const subject = `【璟瓏軒】活動確認: ${formData.eventName} (${formData.date})`;
    window.location.href = `mailto:${formData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(result.content)}`;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-[#4e6ef2] p-4 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center"><Sparkles className="mr-2" size={18}/> DeepSeek AI</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-2">
          <button onClick={() => {setMode('edit'); setResult(null);}} className={`flex-1 py-2 rounded-lg text-sm font-bold ${mode === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Modify</button>
          <button onClick={() => {setMode('email'); setResult(null);}} className={`flex-1 py-2 rounded-lg text-sm font-bold ${mode === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Email</button>
          <button onClick={() => {setMode('whatsapp'); setResult(null);}} className={`flex-1 py-2 rounded-lg text-sm font-bold ${mode === 'whatsapp' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-slate-500'}`}>SleekFlow</button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          {!result && <textarea className="w-full border border-slate-300 rounded-xl p-3 text-sm resize-none h-32" placeholder="Describe what you need..." value={prompt} onChange={e => setPrompt(e.target.value)} />}
          {result && (
            <div className={`border p-3 rounded-lg mt-2 ${mode === 'whatsapp' ? 'bg-green-50' : 'bg-blue-50'}`}>
               <span className="text-xs font-bold uppercase mb-2 block opacity-70">{mode === 'edit' ? "JSON Data" : "Draft Message"}</span>
               {result.type === 'json' ? <pre className="text-xs overflow-x-auto">{JSON.stringify(result.content, null, 2)}</pre> : 
               <textarea className="w-full h-48 p-2 text-sm bg-white border rounded" value={result.content} onChange={(e) => setResult(prev => ({ ...prev, content: e.target.value }))} />}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-2">
          {!result && <button onClick={handleAiAction} disabled={loading} className="flex-1 bg-[#4e6ef2] text-white py-2 rounded-lg font-bold">{loading ? "Thinking..." : "Generate"}</button>}
          {result?.type === 'json' && <button onClick={applyChanges} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold">Confirm</button>}
          {mode === 'whatsapp' && result && <button onClick={sendViaSleekFlow} disabled={sending} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold">{sending ? "Sending..." : "Send via SleekFlow"}</button>}
          {mode === 'email' && result && <button onClick={handleOpenEmailApp} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">Open Email App</button>}
          {result && <button onClick={() => setResult(null)} className="px-3 bg-slate-100 rounded-lg text-slate-600"><Sparkles size={16}/></button>}
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
  const [isAiOpen, setIsAiOpen] = useState(false);
  // UI State for Toast & Modals
  const [toasts, setToasts] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to Dashboard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const balanceFileInputRef = useRef(null);
  const [isBalanceUploading, setIsBalanceUploading] = useState(false);
  
  // Printing State
  const [printMode, setPrintMode] = useState('EO'); 

  // Settings State
  const [appSettings, setAppSettings] = useState({
    minSpendRules: [], 
    defaultMenus: [] ,
    paymentRules: []
  }); 

  // User Management State
  const [userProfile, setUserProfile] = useState(null);

  // EO Form State
    const initialFormState = {
      // 1. Basic Info & Contact
      orderId: '',
      eventName: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '18:00',
      servingTime: '',
      endTime: '23:00',
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

      // 2. F&B (Menu) - UPDATED STRUCTURE
      menuType: '',
      menus: [{ 
          id: Date.now(), 
          title: '主菜單 (Main Menu)', 
          content: '', 
          price: '',           // NEW: Price per menu
          priceType: 'perTable', // NEW: perTable, perPerson, total
          qty:1,
          applySC: true        // NEW: Service Charge Toggle per menu
      }],
      menuVersions: [],
      specialMenuReq: '',
      staffMeals: '',
      drinksPackage: '',
      preDinnerSnacks: '',
      allergies: '',
      servingStyle: '圍餐',
      platingFee:'',
      platingFeeApplySC: true,
      drinkAllocation: {},
      
      
      // 3. Billing - UPDATED STRUCTURE
      menuPrice: '', // Kept for legacy compatibility, but main logic moves to 'menus' array
      menuPriceType: 'perTable', 
      drinksPrice: '',
      drinksPriceType: 'perTable',
      drinksQty: 1,
      drinksApplySC: true, // NEW: Service Charge Toggle for Drinks
      
      customItems: [], // NEW: Array for Extra Items { name, price, qty, applySC }
      
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
      balanceProof: '',
      balanceDate:'',
      paymentMethod: '現金',
      discount: '',
      serviceCharge: '10%',
      enableServiceCharge: true, // NEW: Master switch for Service Charge
      balanceDueDateType: 'eventDay',
      balanceDueDateOverride: '',
      autoSchedulePayment: false,
      
      // 4. Venue & AV
      tableClothColor: '',
      chairCoverColor: '',
      headTableColorType: 'same',
      headTableCustomColor: '',
      bridalRoom: false,
      bridalRoomHours: '',
      stageDecor: '',
      stageDecorPhoto: '', // NEW: Photo URL
      venueDecor: '',      // NEW: General Decor Text
      venueDecorPhoto: '', // NEW: Photo URL
      nameSignText: '',    // NEW: Text for name sign
      invitesQty: '',
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
      deliveries: [], // Array: { id, unit, time, items }

      parkingInfo: {       
        ticketQty: '',    // Changed from 'qty'
        ticketHours: '',  // Changed from 'hours'
        plates: ''        
      },
      printSettings: {
        menu: {
          showPlatingFeeDisclaimer: true, // Default: Show the $800 fee line
          validityDateOverride: '',       // Default: Empty (Use auto-calc)
        },
        quotation: {
          showClientInfo: true,           // Default: Show Client Name/Details
        }
      },
 };

  const [formData, setFormData] = useState(initialFormState);
  const [formTab, setFormTab] = useState('basic'); 
  
  // 加入 AI Prompt 狀態
  // --- AI 翻譯功能狀態 ---
  const [translatingMenuId, setTranslatingMenuId] = useState(null);

  // --- AI 菜單翻譯處理函式 (Updated with specific rules) ---
  const handleTranslateMenu = async (menuId, content) => {
    if (!content) {
      addToast("請先輸入菜單內容", "error");
      return;
    }
    
    setTranslatingMenuId(menuId);
    const API_KEY = "sk-2525b0605e7641b1a62cd405a7c37101";

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${API_KEY}` 
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { 
              role: "system", 
              content: `You are a professional banquet menu translator. 
              Task: Translate the given menu items from Chinese to English line by line.
              
              STRICT RULES:
              1. **Brand Names:** ALWAYS translate '璟瓏軒' as 'King Lung Heen' and '璟瓏' as 'King Lung'.
              2. **Format:** Output the original Chinese line, followed immediately by the English translation on the next line.
              3. **Spacing:** Remove ALL empty lines between items. The output must be compact.
              4. **Punctuation:** Do NOT add full stops (periods) at the end of any line.
              5. **Cleanliness:** Do not add bullet points, numbering, or extra explanations.
              
              Example Output:
              鴻運金豬全體
              Roasted Whole Suckling Pig
              璟瓏軒炒飯
              King Lung Heen Fried Rice`
            }, 
            { 
              role: "user", 
              content: content 
            }
          ],
          temperature: 0.2, // Lower temperature for more deterministic/strict formatting
        })
      });

      if (!response.ok) throw new Error("Translation API Failed");
      
      const data = await response.json();
      let translatedText = data.choices[0].message.content;

      // Double-check cleanup: Remove double newlines just in case
      translatedText = translatedText.replace(/\n\s*\n/g, '\n').trim();

      handleMenuChange(menuId, 'content', translatedText);
      addToast("菜單翻譯完成！", "success");

    } catch (error) {
      console.error(error);
      addToast("翻譯失敗，請稍後再試", "error");
    } finally {
      setTranslatingMenuId(null);
    }
  };

  // --- TEMPLATE GENERATOR (Must be inside App or defined globally) ---
  const generatePaymentReminder = (event, paymentItem) => {
    // 1. Calculate Financials
    const total = Number(event.totalAmount) || 0;
    const paid = (event.deposit1Received ? Number(event.deposit1) : 0) +
                 (event.deposit2Received ? Number(event.deposit2) : 0) +
                 (event.deposit3Received ? Number(event.deposit3) : 0);
    
    // 2. Determine status
    const today = new Date();
    const dueDate = new Date(paymentItem.date);
    const isOverdue = today > dueDate;
    
    // 3. Construct Message
    return `【溫馨提示】
    
    你好 ${event.clientName}，關於閣下於 ${formatDateWithDay(event.date)} 舉行的 ${event.eventName}：

    我們注意到「${paymentItem.type}」 (HKD $${formatMoney(paymentItem.amount)}) ${isOverdue ? '已於' : '將於'} ${paymentItem.date} 到期。

    💰 款項詳情：
    - 是次應付: HKD $${formatMoney(paymentItem.amount)}
    - 已付總額: HKD $${formatMoney(paid)}
    - 合約總額: HKD $${formatMoney(total)}

    請盡快安排付款至以下戶口，謝謝！
    🏦 中國銀行 (Bank of China)
    戶口: 012-875-2-082180-1
    抬頭: King Lung Heen

    (如已付款，請忽略此訊息)`;
      };
      
  // 處理快速提醒的函數
// State for the template message
  const [templateMessage, setTemplateMessage] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');

  const handleQuickRemind = (event, paymentItem) => {
    if (!event) return;

    // 1. Prepare Safe Data
    const safeData = {
      ...initialFormState, 
      ...event,
      selectedLocations: event.selectedLocations || [],
      menus: event.menus || [],
    };
    
    setEditingEvent(event);
    setFormData(safeData);

    // 2. Generate Template
    // ⚠️ THIS LINE WAS LIKELY CAUSING THE CRASH IF THE FUNCTION WAS MISSING
    const message = generatePaymentReminder(event, paymentItem);
    
    setTemplateMessage(message);
    setAiPrompt(''); 
    
    // 3. Open Assistant
    setIsAiOpen(true);
  };
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

  // Helper: Calculate Payment Terms based on Rules
  const calculatePaymentTerms = (currentTotal, currentDate) => {
    if (!currentTotal || !currentDate) return null;

    const eventDate = new Date(currentDate);
    const orderDate = editingEvent?.createdAt ? new Date(editingEvent.createdAt.seconds * 1000) : new Date();
    const monthsDiff = (eventDate.getFullYear() - orderDate.getFullYear()) * 12 + (eventDate.getMonth() - orderDate.getMonth());
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    const addMonths = (date, months) => {
        const d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return formatDate(d);
    };

    const rules = appSettings.paymentRules || [];
    const matchingRule = rules.find(r => monthsDiff >= r.minMonthsInAdvance);

    if (!matchingRule) return null;

    return {
        deposit1: matchingRule.deposit1 > 0 ? Math.round(currentTotal * (matchingRule.deposit1 / 100)) : '',
        deposit1Date: matchingRule.deposit1 > 0 ? addMonths(orderDate, matchingRule.deposit1Offset || 0) : '',
        deposit2: matchingRule.deposit2 > 0 ? Math.round(currentTotal * (matchingRule.deposit2 / 100)) : '',
        deposit2Date: matchingRule.deposit2 > 0 ? addMonths(orderDate, matchingRule.deposit2Offset || 0) : '',
        deposit3: matchingRule.deposit3 > 0 ? Math.round(currentTotal * (matchingRule.deposit3 / 100)) : '',
        deposit3Date: matchingRule.deposit3 > 0 ? addMonths(orderDate, matchingRule.deposit3Offset || 0) : '',
        ruleName: matchingRule.name
    };
  };

  // EFFECT: Auto-Schedule Payment Terms
  useEffect(() => {
    // Only run if Toggle is ON and we have necessary data
    if (formData.autoSchedulePayment && formData.totalAmount && formData.date) {
        const updates = calculatePaymentTerms(formData.totalAmount, formData.date);
        
        if (updates) {
            // Check if values are actually different to prevent infinite loops/re-renders
            setFormData(prev => {
                if (
                    prev.deposit1 === updates.deposit1 &&
                    prev.deposit2 === updates.deposit2 &&
                    prev.deposit3 === updates.deposit3 &&
                    prev.deposit1Date === updates.deposit1Date
                ) {
                    return prev; // No change needed
                }
                return { ...prev, ...updates }; // Update silently
            });
        }
    }
  }, [formData.totalAmount, formData.date, formData.autoSchedulePayment, appSettings.paymentRules]);
  
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

  // --- Quotation Handler ---
    const handlePrintQuotation = () => {
      setPrintMode('QUOTATION');
      setTimeout(() => window.print(), 100);
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
      
      setFormData(prev => {
        // 1. Create a copy of previous data
        let newData = { ...prev };
        
        // 2. Update the specific field being typed
        if (name.startsWith('av_')) {
          const field = name.replace('av_', '');
          newData.avRequirements = { ...prev.avRequirements, [field]: checked };
        } else if (name.startsWith('eq_')) {
          const field = name.replace('eq_', '');
          newData.equipment = { ...prev.equipment, [field]: checked };
        } else if (name.startsWith('dec_')) {
          const field = name.replace('dec_', '');
          newData.decoration = { ...prev.decoration, [field]: checked };
        } else {
          newData[name] = value;
        }

        // 3. AUTO-CALCULATION SYNC
        // If the user changes Table Count or Guest Count, update all related quantities
        if (name === 'tableCount' || name === 'guestCount') {
          const val = parseFloat(value) || 0;
          
          // A. Sync Menus
          if (newData.menus) {
              newData.menus = newData.menus.map(m => {
                  if (name === 'tableCount' && m.priceType === 'perTable') return { ...m, qty: val };
                  if (name === 'guestCount' && m.priceType === 'perPerson') return { ...m, qty: val };
                  return m;
              });
          }

          // B. Sync Drinks
          if (name === 'tableCount' && newData.drinksPriceType === 'perTable') newData.drinksQty = val;
          if (name === 'guestCount' && newData.drinksPriceType === 'perPerson') newData.drinksQty = val;

          // C. Sync Custom Items
          if (newData.customItems) {
              newData.customItems = newData.customItems.map(item => {
                  if (name === 'tableCount' && item.unitType === 'perTable') return { ...item, qty: val };
                  if (name === 'guestCount' && item.unitType === 'perPerson') return { ...item, qty: val };
                  return item;
              });
          }
        }

        // 4. Recalculate Total Amount
        return { ...newData, totalAmount: calculateTotalAmount(newData) };
      });
    };

// --- PRICE HANDLER & CALCULATION (FIXED) ---
  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    // Fix: Remove commas before saving to state so parseFloat works correctly later
    const cleanValue = value.toString().replace(/,/g, ''); 
    
    setFormData(prev => {
      const newData = { ...prev, [name]: cleanValue };
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
// NEW: Handle changes to specific menu allocation
  const handleMenuAllocationChange = (menuId, deptKey, value) => {
    setFormData(prev => ({
      ...prev,
      menus: prev.menus.map(m => {
        if (m.id !== menuId) return m;
        // Update the specific allocation key
        const newAllocation = { ...m.allocation, [deptKey]: value };
        return { ...m, allocation: newAllocation };
      })
    }));
  };

  // NEW: Toggle visibility of allocation section for a menu
  const toggleMenuAllocation = (menuId) => {
     setFormData(prev => ({
       ...prev,
       menus: prev.menus.map(m => m.id === menuId ? { ...m, showAllocation: !m.showAllocation } : m)
     }));
  };
  // Apply a preset to a specific menu
    const handleApplyMenuPreset = (menuId, presetId) => {
    const preset = appSettings.defaultMenus.find(m => m.id.toString() === presetId.toString());
    
    if (preset) {
      setFormData(prev => {
        // Determine Day of Week (0=Sun, 6=Sat)
        const dateObj = new Date(prev.date);
        const dayNum = dateObj.getDay();
        // Definition: Fri(5), Sat(6), Sun(0) are Weekend. Mon-Thu are Weekday.
        const isWeekend = dayNum === 0 || dayNum >= 5;

        // Select correct price
        const finalPrice = isWeekend ? (preset.priceWeekend || preset.priceWeekday) : (preset.priceWeekday || preset.priceWeekend);

        const newMenus = prev.menus.map(m => m.id === menuId ? { 
            ...m, 
            title: preset.title, 
            content: preset.content,
            price: finalPrice || 0, 
            priceType: m.priceType || 'perTable', 
            qty: m.qty || prev.tableCount || 1,
            allocation: preset.allocation || {} 
        } : m);

        const newData = { ...prev, menus: newMenus };
        return { ...newData, totalAmount: calculateTotalAmount(newData) }; 
      });
      addToast(`已載入: ${preset.title}`, "success");
    }
  };

  const addMenu = () => {
      setFormData(prev => {
        // Create new menu with defaults that match the current Table Count
        const newMenu = { 
            id: Date.now(), 
            title: '', 
            content: '', 
            price: '', 
            priceType: 'perTable', // Default to perTable
            qty: prev.tableCount || 1, // Sync with current tables immediately
            applySC: true 
        };

        const newMenus = [...(prev.menus || []), newMenu];
        
        return {
          ...prev,
          menus: newMenus,
          // Recalculate isn't strictly necessary if price is blank, but good practice
          totalAmount: calculateTotalAmount({ ...prev, menus: newMenus })
        };
      });
    };

  // --- Updated removeMenu with Recalculation ---
  const removeMenu = (id) => {
    setFormData(prev => {
      // 1. Create the new filtered array
      const newMenus = prev.menus.filter(m => m.id !== id);
      
      // 2. Create a temporary object with the new menus
      const newData = { ...prev, menus: newMenus };
      
      // 3. Recalculate Total Amount immediately using the new list
      return { 
        ...newData, 
        totalAmount: calculateTotalAmount(newData) 
      };
    });
  };
  // --- MENU VERSIONING HANDLERS ---
  const saveMenuSnapshot = (name) => {
    if (!formData.menus || formData.menus.length === 0) return addToast("沒有菜單可儲存", "error");
    
    const snapshotName = name || `Ver ${formData.menuVersions.length + 1} (${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
    
    const newSnapshot = {
      id: Date.now(),
      name: snapshotName,
      data: JSON.parse(JSON.stringify(formData.menus)), // Deep copy
      totalAmount: formData.totalAmount // Save the price at that time too
    };

    setFormData(prev => ({
      ...prev,
      menuVersions: [newSnapshot, ...(prev.menuVersions || [])] // Add to top
    }));
    addToast("已儲存菜單版本", "success");
  };

  const restoreMenuSnapshot = (snapshot) => {
    if(!window.confirm(`確定要還原至 "${snapshot.name}" 嗎？目前的未儲存修改將會遺失。`)) return;

    setFormData(prev => ({
      ...prev,
      menus: snapshot.data,
      totalAmount: calculateTotalAmount({ ...prev, menus: snapshot.data }) // Recalculate total immediately
    }));
    addToast("已還原菜單", "success");
  };

  const deleteMenuSnapshot = (id) => {
    setFormData(prev => ({
      ...prev,
      menuVersions: prev.menuVersions.filter(v => v.id !== id)
    }));
  };

  // --- MENU REORDERING HANDLERS ---
  const moveMenu = (index, direction) => {
    setFormData(prev => {
      const newMenus = [...prev.menus];
      if (direction === 'up' && index > 0) {
        [newMenus[index], newMenus[index - 1]] = [newMenus[index - 1], newMenus[index]];
      } else if (direction === 'down' && index < newMenus.length - 1) {
        [newMenus[index], newMenus[index + 1]] = [newMenus[index + 1], newMenus[index]];
      }
      return { ...prev, menus: newMenus };
    });
  };
  // Handle Drink Package Selection
// Handle Drink Package Selection (FIXED)
  const handleDrinkTypeChange = (e) => {
    const val = e.target.value;
    setDrinkPackageType(val);
    
    // Find the matching preset from settings
    const preset = appSettings.defaultMenus.find(m => m.type === 'drink' && m.title === val);
    
    setFormData(prev => {
        let newData = { ...prev };

        if (preset) {
            // Case A: User selected a valid preset
            newData = { 
                ...newData, 
                drinksPackage: preset.content,
                // Use preset price if available, otherwise keep existing
                drinksPrice: preset.priceWeekday || preset.price || prev.drinksPrice, 
                // Default to 'perPerson' for drinks usually, or keep existing logic
                drinksPriceType: 'perPerson', 
                // Auto-sync Qty to Guest Count if perPerson
                drinksQty: prev.guestCount || 1,
                drinkAllocation: preset.allocation || {} 
            };
        } else if (val === 'Other') {
            // Case B: User selected "Custom / Other"
            // Don't change price/qty, just set a flag or keep as is
            newData = { ...newData, drinksPackage: '' }; 
        } else {
            // Case C: User cleared selection
            newData = { ...newData, drinksPackage: '', drinksPrice: '', drinkAllocation: {} }; 
        }

        // CRITICAL FIX: Recalculate total immediately with the new data
        return { 
            ...newData, 
            totalAmount: calculateTotalAmount(newData) 
        };
    });
  };

  // --- Auto Payment Schedule Handler (Dynamic Version) ---
    const applyStandardPaymentTerms = () => {
        const updates = calculatePaymentTerms(formData.totalAmount, formData.date);
        if (updates) {
            setFormData(prev => ({ ...prev, ...updates }));
            addToast(`已套用規則: ${updates.ruleName}`, "success");
        } else {
            addToast("未找到適用規則或資料不全", "info");
        }
      };

  // --- MIN SPEND CALCULATION ---
// --- MIN SPEND CALCULATION (FIXED) ---
  const minSpendInfo = useMemo(() => {
    if (!formData.date || formData.selectedLocations.length === 0 || !appSettings.minSpendRules) return null;
    
    const date = new Date(formData.date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStr = days[date.getDay()];
    
    // 1. Determine Session (Lunch vs Dinner) based on Start Time
    // Default to Dinner if no time set, or if starts 16:00 or later
    let timeOfDay = 'dinner'; 
    if (formData.startTime) {
        const hour = parseInt(formData.startTime.split(':')[0], 10);
        if (hour < 16) timeOfDay = 'lunch';
    }

    const selectedSorted = [...formData.selectedLocations].sort();
    
    // Helper to safely extract price (handles both old simple numbers and new lunch/dinner objects)
    const getPrice = (rule) => {
        const priceEntry = rule.prices?.[dayStr];
        if (!priceEntry) return 0;
        
        // New Format: Object { lunch: '...', dinner: '...' }
        if (typeof priceEntry === 'object') {
            return parseInt(priceEntry[timeOfDay] || 0);
        }
        // Old Format: Direct Number/String
        return parseInt(priceEntry || 0);
    };

    // 2. Find Exact Match Rule
    const exactRule = appSettings.minSpendRules.find(r => {
      const ruleSorted = [...r.locations].sort();
      return JSON.stringify(ruleSorted) === JSON.stringify(selectedSorted);
    });
    
    if (exactRule) {
      const amount = getPrice(exactRule);
      if (amount > 0) {
        return { 
          amount: amount, 
          ruleName: `精確符合: ${selectedSorted.join('+')} (${timeOfDay === 'lunch' ? '午市' : '晚市'})` 
        };
      }
    }

    // 3. Fallback: Sum of Individual Rules
    let sum = 0;
    let applicableRules = [];
    
    formData.selectedLocations.forEach(loc => {
       const rule = appSettings.minSpendRules.find(r => r.locations.length === 1 && r.locations[0] === loc);
       if (rule) {
         const price = getPrice(rule);
         if (price > 0) {
            sum += price;
            applicableRules.push(`${loc} ($${price.toLocaleString()})`);
         }
       }
    });
    
    if (applicableRules.length > 0) {
      return { 
        amount: sum, 
        ruleName: `組合加總: ${applicableRules.join(' + ')} (${timeOfDay === 'lunch' ? '午市' : '晚市'})` 
      };
    }
    
    return null;
  }, [formData.date, formData.startTime, formData.selectedLocations, appSettings.minSpendRules]);


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

  const handleImageUpload = async (file, fieldName) => {
    if (!user) return;
    const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
    try {
       await uploadBytes(storageRef, file);
       const url = await getDownloadURL(storageRef);
       setFormData(prev => ({ ...prev, [fieldName]: url }));
       addToast("圖片上傳成功", "success");
    } catch (e) {
       addToast("上傳失敗", "error");
    }
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
// --- Briefing Sheet Handlers ---
  const handlePrintBriefing = () => {
    setPrintMode('BRIEFING');
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
              {activeTab === 'dashboard' && <DashboardView events={events} openEditModal={openEditModal} onRemind={handleQuickRemind}/>}
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
                { id: 'printConfig', label: '列印設定 (Print Opts)', icon: Printer },
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
              
                  {/* TAB 1: BASIC INFO (FULL CODE) */}
                    {formTab === 'basic' && (
                      <div className="space-y-6 animate-in fade-in">
                        {/* Row 1: ID, Status, Type */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormInput label="訂單編號 (Order ID)" name="orderId" required value={formData.orderId} onChange={handleInputChange} />
                          <FormSelect 
                            label="活動狀態 (Status)" 
                            name="status" 
                            options={[
                              { value: 'tentative', label: '暫定 (Tentative)' }, 
                              { value: 'confirmed', label: '已確認 (Confirmed)' }, 
                              { value: 'completed', label: '已完成 (Completed)' }, 
                              { value: 'cancelled', label: '已取消 (Cancelled)' }
                            ]} 
                            value={formData.status} 
                            onChange={handleInputChange} 
                          />
                          <FormSelect label="活動類型" name="eventType" options={EVENT_TYPES} value={formData.eventType} onChange={handleInputChange} />
                        </div>
                        
                        {/* Event Details Card */}
                        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">活動詳情</h4>
                          
                          <FormInput 
                              label="活動名稱 (Event Name)" 
                              name="eventName" 
                              required 
                              value={formData.eventName} 
                              onChange={handleInputChange} 
                              placeholder="e.g. 陳李聯婚 / Annual Dinner"
                            />

                          <div className="grid grid-cols-4 gap-4">
                            <FormInput label="活動日期" name="date" type="date" required className="col-span-1" value={formData.date} onChange={handleInputChange} />
                            <FormInput label="開始時間 (Start)" name="startTime" type="time" required className="col-span-1" value={formData.startTime} onChange={handleInputChange} />
                            
                            {/* Serving Time */}
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 text-red-600">起菜時間 (Serving)</label>
                                <input
                                  type="time"
                                  name="servingTime"
                                  value={formData.servingTime || ''}
                                  onChange={handleInputChange}
                                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all bg-red-50"
                                />
                            </div>

                            <FormInput label="結束時間 (End)" name="endTime" type="time" required className="col-span-1" value={formData.endTime} onChange={handleInputChange} />
                          </div>

                          {/* Location & Min Spend Section */}
                          <div className="pt-4 border-t border-slate-100 mt-2">
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                  
                                  {/* LEFT COLUMN: Location & Min Spend (Span 8) */}
                                  <div className="lg:col-span-8 flex flex-col justify-between">
                                      <div>
                                          <LocationSelector formData={formData} setFormData={setFormData} />
                                          
                                          {/* MIN SPEND REMINDER (Kept under Location) */}
                                          {minSpendInfo && (
                                            <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row justify-between items-center animate-in slide-in-from-top-2">
                                               <div className="flex items-center text-indigo-900 mb-1 sm:mb-0">
                                                  <div className="bg-white p-1 rounded-full shadow-sm mr-2 text-indigo-600">
                                                      <DollarSign size={14} />
                                                  </div>
                                                  <div>
                                                      <span className="text-[10px] font-bold text-indigo-600 block">最低消費 (Min Spend)</span>
                                                      <span className="text-base font-black font-mono tracking-tight">${minSpendInfo.amount.toLocaleString()}</span>
                                                  </div>
                                               </div>
                                               <div className="text-right">
                                                  <span className="text-[10px] font-medium text-indigo-500 bg-white px-2 py-0.5 rounded border border-indigo-100 block">
                                                     {minSpendInfo.ruleName}
                                                  </span>
                                               </div>
                                            </div>
                                          )}
                                      </div>
                                  </div>

                                  {/* RIGHT COLUMN: Counts (Span 4) */}
                                  <div className="lg:col-span-4">
                                      <div className="grid grid-cols-2 gap-3">
                                        <FormInput 
                                          label="席數 (Tables)" 
                                          name="tableCount" 
                                          type="number" 
                                          value={formData.tableCount} 
                                          onChange={handleInputChange} 
                                          placeholder="20"
                                        />
                                        <FormInput 
                                          label="人數 (Guests)" 
                                          name="guestCount" 
                                          type="number" 
                                          value={formData.guestCount} 
                                          onChange={handleInputChange} 
                                          placeholder="240"
                                        />
                                      </div>
                                  </div>
                              </div>
                          </div>
                        </div>

                        {/* Client Info Card */}
                        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="font-bold text-slate-800">聯絡人資訊</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput label="客戶姓名" name="clientName" required value={formData.clientName} onChange={handleInputChange} />
                            <FormInput label="電話" name="clientPhone" value={formData.clientPhone} onChange={handleInputChange} />
                            <FormInput label="公司" name="companyName" value={formData.companyName} onChange={handleInputChange} />
                            <FormInput label="銷售人員" name="salesRep" value={formData.salesRep} onChange={handleInputChange} />
                            <FormInput label="Email" name="clientEmail" value={formData.clientEmail} onChange={handleInputChange} />
                            <FormInput label="地址" name="address" value={formData.address} onChange={handleInputChange} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: F&B (Full Code) */}
                    {formTab === 'fnb' && (
                      <div className="space-y-6 animate-in fade-in">
                        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                          
                          {/* --- 1. HEADER WITH VERSION CONTROLS --- */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-4">
                            <div>
                                <h4 className="font-bold text-slate-800">餐單設定 (Menus)</h4>
                                <p className="text-xs text-slate-500">Corporate Mode: Save versions before major edits.</p>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                type="button" 
                                onClick={() => saveMenuSnapshot()}
                                className="text-sm bg-violet-50 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-100 font-bold flex items-center transition-colors border border-violet-200"
                              >
                                <Save size={16} className="mr-1"/> 儲存版本
                              </button>
                              <button 
                                type="button" 
                                onClick={addMenu}
                                className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-bold flex items-center transition-colors border border-blue-200"
                              >
                                <Plus size={16} className="mr-1"/> 新增菜單
                              </button>
                            </div>
                          </div>

                          {/* --- 2. VERSION HISTORY LIST (Only shows if versions exist) --- */}
                          {formData.menuVersions && formData.menuVersions.length > 0 && (
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                                  <span className="text-xs font-bold text-slate-500 uppercase mb-2 block">版本紀錄 (Version History)</span>
                                  <div className="flex gap-2 overflow-x-auto pb-2">
                                      {formData.menuVersions.map(v => (
                                          <div key={v.id} className="flex-shrink-0 bg-white border border-slate-300 rounded px-3 py-2 text-xs flex flex-col gap-1 shadow-sm min-w-[120px]">
                                              <div className="font-bold text-slate-700">{v.name}</div>
                                              <div className="text-slate-400">{v.data.length} Items</div>
                                              <div className="flex gap-1 mt-1">
                                                  <button type="button" onClick={() => restoreMenuSnapshot(v)} className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded py-1 font-bold border border-emerald-100">還原</button>
                                                  <button type="button" onClick={() => deleteMenuSnapshot(v.id)} className="px-2 text-slate-400 hover:text-red-500"><X size={12}/></button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                          
                          {/* --- 3. MENU ITEMS LIST (With Reordering) --- */}
                          <div className="space-y-4">
                            {formData.menus && formData.menus.map((menu, index) => (
                              <div key={menu.id || index} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative group transition-all hover:border-blue-200 hover:shadow-sm">
                                
                                {/* Menu Header: Title & Controls */}
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center flex-1 gap-2">
                                    {/* Reordering Arrows */}
                                    <div className="flex flex-col mr-2">
                                        <button type="button" onClick={() => moveMenu(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronLeft size={14} className="rotate-90"/></button>
                                        <button type="button" onClick={() => moveMenu(index, 'down')} disabled={index === formData.menus.length - 1} className="text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronRight size={14} className="rotate-90"/></button>
                                    </div>

                                    <input 
                                      type="text" 
                                      placeholder="菜單標題 (e.g. Main Menu)" 
                                      value={menu.title}
                                      onChange={(e) => handleMenuChange(menu.id, 'title', e.target.value)}
                                      className="font-bold text-slate-700 bg-transparent border-b border-dashed border-slate-400 focus:border-blue-500 focus:outline-none flex-1"
                                    />
                                    
                                    {/* Load Preset */}
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
                                    
                                    {/* Delete */}
                                    {formData.menus.length > 1 && (
                                      <button type="button" onClick={() => removeMenu(menu.id)} className="text-slate-400 hover:text-red-500 p-1 rounded ml-2">
                                        <Trash2 size={16}/>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Content Area */}
{/* Content Area with Translate Button */}
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-slate-500">菜單內容 (一行一項)</label>
                                <button 
                                    type="button"
                                    onClick={() => handleTranslateMenu(menu.id, menu.content)}
                                    disabled={translatingMenuId === menu.id || !menu.content}
                                    className="flex items-center text-[10px] bg-violet-100 text-violet-700 px-2 py-1 rounded hover:bg-violet-200 disabled:opacity-50 transition-colors"
                                >
                                    {translatingMenuId === menu.id ? (
                                        <><Loader2 size={12} className="animate-spin mr-1"/> 翻譯中...</>
                                    ) : (
                                        <><Languages size={12} className="mr-1"/> AI 中英對照翻譯</>
                                    )}
                                </button>
                            </div>
                            
                            <textarea
                              rows={8} //稍微加大一點方便看翻譯
                              placeholder="輸入詳細菜色 (一行一項)...&#10;例子:&#10;鴻運金豬全體&#10;上湯焗龍蝦"
                              value={menu.content}
                              onChange={(e) => handleMenuChange(menu.id, 'content', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white mb-3 font-mono leading-relaxed"
                            />

                                {/* Allocation & Price Controls */}
                                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                                    <button type="button" onClick={() => toggleMenuAllocation(menu.id)} className="flex items-center text-xs font-bold text-slate-500 hover:text-blue-600">
                                        <PieChart size={14} className="mr-1"/> 
                                        {menu.showAllocation ? "隱藏拆帳" : "設定拆帳"}
                                    </button>
                                    <div className="text-xs text-slate-400">
                                        {menu.priceType === 'perTable' ? '每席' : menu.priceType === 'perPerson' ? '每位' : '固定'}價: 
                                        <span className="font-mono text-slate-700 font-bold ml-1">${formatMoney(menu.price)}</span>
                                    </div>
                                </div>

                                {/* Allocation Logic Rendered Here */}
                                {menu.showAllocation && (
                                    <div className="mt-3 bg-white p-3 rounded border border-slate-200 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-4 gap-2">
                                            {DEPARTMENTS.map(dept => (
                                                <div key={dept.key}>
                                                    <label className="block text-[9px] font-bold text-slate-500">{dept.label.split(' ')[0]}</label>
                                                    <input type="number" value={menu.allocation?.[dept.key]||''} onChange={e=>handleMenuAllocationChange(menu.id, dept.key, e.target.value)} className="w-full border rounded px-1 text-xs"/>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* --- 4. SERVING STYLE & DRINKS (RESTORED) --- */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100">
                            
                            {/* Left Col: Serving Style + Plating Fee */}
                            <div className="space-y-3">
                                <FormSelect 
                                    label="上菜方式 (Serving Style)" 
                                    name="servingStyle" 
                                    options={SERVING_STYLES} 
                                    value={formData.servingStyle} 
                                    onChange={(e) => {
                                        const newStyle = e.target.value;
                                        setFormData(prev => {
                                            const newData = { ...prev, servingStyle: newStyle, platingFee: newStyle !== '位上' ? '' : prev.platingFee };
                                            return { ...newData, totalAmount: calculateTotalAmount(newData) };
                                        });
                                    }} 
                                />
                                
                                {formData.servingStyle === '位上' && (
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 animate-in fade-in slide-in-from-top-2">
                                        <MoneyInput 
                                            label="位上服務費 (每席計算)" 
                                            name="platingFee"
                                            value={formData.platingFee}
                                            onChange={handlePriceChange}
                                            required
                                        />
                                        <div className="text-right text-xs text-blue-600 font-mono mt-1 font-bold">
                                            = ${formatMoney((parseFloat(formData.platingFee)||0) * (parseFloat(formData.tableCount)||0))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Col: Drinks Package */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">酒水安排 (Drinks)</label>
                                <select 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white mb-2"
                                    value={drinkPackageType}
                                    onChange={handleDrinkTypeChange}
                                >
                                    <option value="">請選擇套餐 (載入預設)</option>
                                    {DEFAULT_DRINK_PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
                                    {appSettings.defaultMenus && appSettings.defaultMenus.filter(m => m.type === 'drink').map(m => (
                                        <option key={m.id} value={m.title}>📂 {m.title}</option>
                                    ))}
                                    <option value="Other">自訂 / 其他</option>
                                </select>
                                <textarea
                                    name="drinksPackage"
                                    rows={4}
                                    value={formData.drinksPackage || ''}
                                    onChange={handleInputChange}
                                    placeholder="酒水內容詳細描述..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                            </div>
                          </div>

                          {/* --- 5. REQUESTS & ALLERGIES --- */}
                          <FormTextArea label="特殊餐單需求 (Special Req)" name="specialMenuReq" value={formData.specialMenuReq} onChange={handleInputChange} />
                          <FormTextArea label="食物過敏 (Allergies)" name="allergies" rows={2} className="bg-red-50 p-2 rounded-lg" value={formData.allergies} onChange={handleInputChange} />
                        </div>
                      </div>
                    )}

              {/* TAB 3: BILLING - FINAL CORRECTED VERSION */}
              {formTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in">
                  
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    
                    {/* 1. TABLE HEADER */}
                    <div className="grid grid-cols-12 gap-4 bg-slate-50 px-6 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-5">項目 (Item Description)</div>
                      <div className="col-span-2 text-right">單價 (Rate)</div>
                      <div className="col-span-2 text-center">單位 / 數量 (Unit / Qty)</div>
                      <div className="col-span-2 text-right">金額 (Amount)</div>
                      <div className="col-span-1 text-center">設定 (Opt)</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      
                      {/* 2. MENU ITEMS */}
                      {(formData.menus || []).map((m, idx) => {
                        const subtotal = (m.price || 0) * (m.qty || 1);
                        return (
                          <div key={m.id || idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                            <div className="col-span-5">
                              <div className="flex items-center">
                                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded mr-3 flex-shrink-0"><Utensils size={14}/></div>
                                <div>
                                  <span className="font-bold text-slate-700 block text-sm">{m.title || `Menu ${idx+1}`}</span>
                                  <span className="text-xs text-slate-400">來源: 餐飲分頁</span>
                                </div>
                              </div>
                            </div>

                            <div className="col-span-2 flex items-center justify-end">
                                <span className="text-slate-400 text-xs mr-1">$</span>
                                <input 
                                  type="number"
                                  value={m.price}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setFormData(prev => {
                                        const newMenus = prev.menus.map(menu => menu.id === m.id ? { ...menu, price: val } : menu);
                                        return { ...prev, menus: newMenus, totalAmount: calculateTotalAmount({ ...prev, menus: newMenus }) };
                                    });
                                  }}
                                  className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono"
                                  placeholder="0"
                                />
                            </div>

                            {/* UNIFIED QTY COLUMN STYLE */}
                            <div className="col-span-2">
                                <div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden shadow-sm">
                                    <select 
                                      value={m.priceType}
                                      onChange={e => {
                                          const type = e.target.value;
                                          // Auto-fill Qty based on selection
                                          let newQty = m.qty || 1;
                                          if(type === 'perTable') newQty = formData.tableCount || 1;
                                          if(type === 'perPerson') newQty = formData.guestCount || 1;

                                          setFormData(prev => {
                                              const newMenus = prev.menus.map(menu => menu.id === m.id ? { ...menu, priceType: type, qty: newQty } : menu);
                                              return { ...prev, menus: newMenus, totalAmount: calculateTotalAmount({ ...prev, menus: newMenus }) };
                                          });
                                      }}
                                      className="bg-slate-50 border-r border-slate-300 h-full px-2 text-[10px] outline-none text-slate-600 hover:bg-slate-100 cursor-pointer min-w-[60px]"
                                    >
                                      <option value="perTable">席</option>
                                      <option value="perPerson">位</option>
                                      <option value="total">固定</option>
                                    </select>
                                    <input 
                                      type="number" 
                                      value={m.qty || ''}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setFormData(prev => {
                                            const newMenus = prev.menus.map(menu => menu.id === m.id ? { ...menu, qty: val } : menu);
                                            return { ...prev, menus: newMenus, totalAmount: calculateTotalAmount({ ...prev, menus: newMenus }) };
                                        });
                                      }}
                                      className="w-full h-full text-center outline-none text-sm font-bold text-slate-700 focus:bg-blue-50 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">
                              ${formatMoney(subtotal)}
                            </div>

                            <div className="col-span-1 flex justify-center">
                              <button 
                                type="button"
                                onClick={() => {
                                    setFormData(prev => {
                                        const newMenus = prev.menus.map(menu => menu.id === m.id ? { ...menu, applySC: !menu.applySC } : menu);
                                        return { ...prev, menus: newMenus, totalAmount: calculateTotalAmount({ ...prev, menus: newMenus }) };
                                    });
                                }}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${m.applySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 hover:border-slate-300 opacity-50'}`}
                              >
                                SC
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {/* ========================================================= */}
                      {/* NEW: PLATING SERVICE FEE ROW (Editable)                   */}
                      {/* ========================================================= */}
                      {formData.servingStyle === '位上' && (
                          <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors border-t border-slate-100">
                            {/* 1. Name & Icon */}
                            <div className="col-span-5">
                              <div className="flex items-center">
                                <div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0">
                                    <Utensils size={14}/>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-700 block text-sm">位上服務費 (Plating Fee)</span>
                                  <span className="text-xs text-slate-400">來源: 上菜方式設定</span>
                                </div>
                              </div>
                            </div>

                            {/* 2. Rate (Editable) */}
                            <div className="col-span-2 flex items-center justify-end">
                                <span className="text-slate-400 text-xs mr-1">$</span>
                                <input 
                                  type="number"
                                  value={formData.platingFee}
                                  onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData(prev => {
                                          const newData = { ...prev, platingFee: val };
                                          return { ...newData, totalAmount: calculateTotalAmount(newData) };
                                      });
                                  }}
                                  className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700"
                                  placeholder="0"
                                />
                            </div>

                            {/* 3. Qty (Read-Only Visualization) */}
                            <div className="col-span-2">
                                <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 h-9 overflow-hidden">
                                    <div className="px-2 text-[10px] text-slate-400 border-r border-slate-200 h-full flex items-center bg-slate-100 min-w-[60px] justify-center">
                                        每席
                                    </div>
                                    <input 
                                      disabled
                                      type="text"
                                      value={formData.tableCount}
                                      className="w-full h-full text-center outline-none text-sm font-bold text-slate-500 bg-transparent cursor-default"
                                    />
                                </div>
                            </div>

                            {/* 4. Amount */}
                            <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">
                                ${formatMoney((parseFloat(formData.platingFee)||0) * (parseFloat(formData.tableCount)||0))}
                            </div>

                            {/* 5. SC Toggle (Editable) */}
                            <div className="col-span-1 flex justify-center">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => {
                                            const newData = { ...prev, platingFeeApplySC: !prev.platingFeeApplySC };
                                            return { ...newData, totalAmount: calculateTotalAmount(newData) };
                                        });
                                    }}
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${formData.platingFeeApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 hover:border-slate-300 opacity-50'}`}
                                >
                                    SC
                                </button>
                            </div>
                          </div>
                      )}
                      {/* ========================================================= */}
                      {/* 3. DRINKS ROW */}
                      <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center bg-blue-50/10 border-t border-slate-100">
                        <div className="col-span-5">
                          <div className="flex items-center">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Coffee size={14}/></div>
                            <div className="flex-1">
                              <input 
                                type="text"
                                name="drinksPackage"
                                value={formData.drinksPackage || ''}
                                onChange={handleInputChange}
                                placeholder="酒水套餐 (未選擇)"
                                className="w-full bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 transition-all placeholder:text-slate-400"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="col-span-2 flex items-center justify-end">
                            <span className="text-slate-400 text-xs mr-1">$</span>
                            <input 
                              type="number"
                              name="drinksPrice"
                              value={formData.drinksPrice}
                              onChange={handlePriceChange}
                              className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-blue-800"
                              placeholder="0"
                            />
                        </div>

                        {/* UNIFIED QTY COLUMN STYLE */}
                        <div className="col-span-2">
                            <div className="flex items-center border border-blue-200 rounded-md bg-white h-9 overflow-hidden shadow-sm">
                                <select 
                                  name="drinksPriceType"
                                  value={formData.drinksPriceType}
                                  onChange={e => {
                                      const type = e.target.value;
                                      let newQty = formData.drinksQty || 1;
                                      if(type === 'perTable') newQty = formData.tableCount || 1;
                                      if(type === 'perPerson') newQty = formData.guestCount || 1;
                                      
                                      setFormData(prev => ({...prev, drinksPriceType: type, drinksQty: newQty, totalAmount: calculateTotalAmount({...prev, drinksPriceType: type, drinksQty: newQty})}));
                                  }}
                                  className="bg-blue-50 border-r border-blue-200 h-full px-2 text-[10px] outline-none text-blue-800 hover:bg-blue-100 cursor-pointer min-w-[60px]"
                                >
                                  <option value="perTable">席</option>
                                  <option value="perPerson">位</option>
                                  <option value="total">固定</option>
                                </select>
                                <input 
                                  type="number" 
                                  value={formData.drinksQty || ''}
                                  onChange={e => setFormData(prev => ({...prev, drinksQty: e.target.value, totalAmount: calculateTotalAmount({...prev, drinksQty: e.target.value})}))}
                                  className="w-full h-full text-center outline-none text-sm font-bold text-blue-800 focus:bg-blue-50 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">
                            ${formatMoney((formData.drinksPrice || 0) * (formData.drinksQty || 1))}
                        </div>

                        <div className="col-span-1 flex justify-center">
                            <button 
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, drinksApplySC: !prev.drinksApplySC, totalAmount: calculateTotalAmount({...prev, drinksApplySC: !prev.drinksApplySC})}))}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${formData.drinksApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 hover:border-slate-300 opacity-50'}`}
                            >
                              SC
                            </button>
                        </div>
                      </div>

                      {/* 4. CUSTOM ITEMS ROWS (Fixed SC Button) */}
                      {(formData.customItems || []).map((item, idx) => {
                        const subtotal = (item.price || 0) * (item.qty || 1);

                        return (
                          <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-3 items-center group hover:bg-slate-50 transition-colors animate-in fade-in border-t border-slate-50">
                              
                              {/* Name */}
                              <div className="col-span-5 flex items-center">
                                <div className="p-1.5 bg-slate-100 text-slate-500 rounded mr-3 flex-shrink-0"><Plus size={14}/></div>
                                <input 
                                  type="text" 
                                  value={item.name}
                                  placeholder="項目名稱 (e.g. 額外租用)"
                                  onChange={e => {
                                      const val = e.target.value;
                                      setFormData(prev => {
                                        const newItems = prev.customItems.map((it, i) => i === idx ? { ...it, name: val } : it);
                                        return { ...prev, customItems: newItems };
                                      });
                                  }}
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-700 transition-all placeholder:text-slate-300"
                                />
                              </div>

                              {/* Rate */}
                              <div className="col-span-2 flex items-center justify-end">
                                <span className="text-slate-400 text-xs mr-1">$</span>
                                <input 
                                  type="number"
                                  value={item.price}
                                  placeholder="0"
                                  onChange={e => {
                                      const val = e.target.value;
                                      setFormData(prev => {
                                        const newItems = prev.customItems.map((it, i) => i === idx ? { ...it, price: val } : it);
                                        return { ...prev, customItems: newItems, totalAmount: calculateTotalAmount({ ...prev, customItems: newItems }) };
                                      });
                                  }}
                                  className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono"
                                />
                              </div>

                              {/* Unit/Qty */}
                              <div className="col-span-2">
                                <div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden">
                                    <select 
                                      value={item.unitType || 'fixed'}
                                      onChange={e => {
                                        const type = e.target.value;
                                        // Auto-update qty logic
                                        let newQty = item.qty || 1;
                                        if(type === 'perTable') newQty = formData.tableCount || 1;
                                        if(type === 'perPerson') newQty = formData.guestCount || 1;

                                        setFormData(prev => {
                                            const newItems = prev.customItems.map((it, i) => i === idx ? { ...it, unitType: type, qty: newQty } : it);
                                            return { ...prev, customItems: newItems, totalAmount: calculateTotalAmount({ ...prev, customItems: newItems }) };
                                        });
                                      }}
                                      className="bg-slate-100 border-r border-slate-300 h-full px-2 text-[10px] outline-none text-slate-600 hover:bg-slate-200 cursor-pointer min-w-[60px]"
                                    >
                                      <option value="fixed">固定</option>
                                      <option value="perTable">席</option>
                                      <option value="perPerson">位</option>
                                    </select>
                                    <input 
                                      type="number" 
                                      value={item.qty || ''}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setFormData(prev => {
                                            const newItems = prev.customItems.map((it, i) => i === idx ? { ...it, qty: val } : it);
                                            return { ...prev, customItems: newItems, totalAmount: calculateTotalAmount({ ...prev, customItems: newItems }) };
                                        });
                                      }}
                                      className="w-full h-full text-center outline-none text-sm font-bold text-slate-700 focus:bg-blue-50 transition-colors"
                                    />
                                </div>
                              </div>

                              {/* Amount */}
                              <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">
                                ${formatMoney(subtotal)}
                              </div>

                              {/* SC Toggle (Fixed) */}
                              <div className="col-span-1 flex justify-center gap-1">
                                <button 
                                  title="Apply Service Charge"
                                  type="button"
                                  onClick={() => {
                                      setFormData(prev => {
                                        // IMMUTABLE UPDATE: Create a new object for the updated item
                                        const newItems = prev.customItems.map((it, i) => 
                                            i === idx ? { ...it, applySC: !it.applySC } : it
                                        );
                                        return { 
                                            ...prev, 
                                            customItems: newItems, 
                                            totalAmount: calculateTotalAmount({ ...prev, customItems: newItems }) 
                                        };
                                      });
                                  }}
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${item.applySC ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 hover:border-slate-300 opacity-50'}`}
                                >
                                  SC
                                </button>
                                <button 
                                  title="Delete Item"
                                  type="button"
                                  onClick={() => {
                                      setFormData(prev => {
                                        const newItems = prev.customItems.filter((_, i) => i !== idx);
                                        return { ...prev, customItems: newItems, totalAmount: calculateTotalAmount({ ...prev, customItems: newItems }) };
                                      });
                                  }}
                                  className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                                >
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                          </div>
                        );
                      })}

                      {/* 5. ADD ITEM BUTTON ROW */}
                      <div className="px-6 py-3 bg-slate-50/50">
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({
                              ...prev, 
                              customItems: [...(prev.customItems || []), { id: Date.now(), name: '', price: '', qty: 1, unitType: 'fixed', applySC: false }]
                          }))}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                        >
                          <Plus size={14} className="mr-1"/> 新增額外項目 (Add Item)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 6. TOTALS SUMMARY */}
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Min Spend Alert */}
                    <div className="flex-1">
                        {minSpendInfo && (Number(formData.totalAmount) < minSpendInfo.amount) && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm flex items-start">
                              <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0"/>
                              <div>
                                <p className="font-bold">未達最低消費 (Below Min Spend)</p>
                                <p className="mt-1">
                                    目標: <span className="font-mono font-bold">${minSpendInfo.amount.toLocaleString()}</span>
                                    <span className="mx-2">|</span>
                                    差額: <span className="font-mono font-bold text-red-600">-${(minSpendInfo.amount - Number(formData.totalAmount)).toLocaleString()}</span>
                                </p>
                              </div>
                          </div>
                        )}
                    </div>

                    {/* Calculator */}
                    <div className="w-full md:w-80 space-y-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <label className="flex items-center cursor-pointer text-sm text-slate-600 select-none">
                              <input 
                                type="checkbox" 
                                checked={formData.enableServiceCharge !== false}
                                onChange={e => setFormData(prev => ({...prev, enableServiceCharge: e.target.checked, totalAmount: calculateTotalAmount({...prev, enableServiceCharge: e.target.checked}) }))}
                                className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                              />
                              服務費 (10%)
                          </label>
                          <div className="relative w-16">
                            <input 
                              type="text" 
                              name="serviceCharge"
                              value={formData.serviceCharge}
                              onChange={handlePriceChange}
                              disabled={formData.enableServiceCharge === false}
                              className={`w-full text-right text-sm border-b outline-none font-mono ${formData.enableServiceCharge === false ? 'text-slate-300 border-transparent' : 'border-slate-300 text-slate-700'}`}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <span className="text-sm text-slate-600">折扣 (Discount)</span>
                          <div className="relative w-24">
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-red-400 text-xs">- $</span>
                              <input 
                                type="text" 
                                name="discount"
                                value={formatMoney(formData.discount)}
                                onChange={handlePriceChange}
                                className="w-full text-right text-sm border-b border-slate-300 hover:border-red-300 focus:border-red-500 outline-none text-red-600 font-mono pl-4"
                                placeholder="0"
                              />
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <span className="text-base font-bold text-slate-800">總金額 (Total)</span>
                          <span className="text-2xl font-black text-blue-700 font-mono tracking-tight">
                              ${formatMoney(formData.totalAmount)}
                          </span>
                        </div>
                    </div>
                  </div>

                  {/* 7. PAYMENT SCHEDULE */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-4">
                              <h4 className="font-bold text-slate-700">付款進度 (Payment Schedule)</h4>
                              
                              {/* NEW: Auto-Schedule Toggle */}
                              <label className="flex items-center cursor-pointer select-none">
                                  <div className="relative">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer"
                                      checked={formData.autoSchedulePayment || false}
                                      onChange={e => {
                                          const isChecked = e.target.checked;
                                          setFormData(prev => ({...prev, autoSchedulePayment: isChecked}));
                                          if(isChecked) {
                                            // Trigger immediate update when turning ON
                                            const updates = calculatePaymentTerms(formData.totalAmount, formData.date);
                                            if(updates) {
                                                setFormData(prev => ({...prev, autoSchedulePayment: true, ...updates}));
                                                addToast("已啟用自動付款排程 (Auto-Schedule ON)", "success");
                                            }
                                          }
                                      }}
                                    />
                                    <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                                  </div>
                                  <span className={`text-xs font-bold ml-2 ${formData.autoSchedulePayment ? 'text-violet-600' : 'text-slate-400'}`}>
                                    {formData.autoSchedulePayment ? "自動更新 (Auto)" : "手動 (Manual)"}
                                  </span>
                              </label>
                            </div>

                            {/* Show Manual Button ONLY if Auto is OFF */}
                            {!formData.autoSchedulePayment && (
                              <button 
                                  type="button" 
                                  onClick={applyStandardPaymentTerms}
                                  className="text-xs bg-white border border-slate-300 hover:border-violet-400 text-slate-600 hover:text-violet-600 px-3 py-1.5 rounded-lg transition-colors font-bold shadow-sm flex items-center"
                              >
                                  <CalendarIcon size={14} className="mr-1.5"/> 套用規則 (Apply Rules)
                              </button>
                            )}
                        </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <DepositField label="訂金一 (Deposit 1)" prefix="deposit1" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} addToast={addToast} onRemoveProof={handleRemoveProof}/>
                        <DepositField label="訂金二 (Deposit 2)" prefix="deposit2" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} addToast={addToast} onRemoveProof={handleRemoveProof}/>
                        <DepositField label="訂金三 (Deposit 3)" prefix="deposit3" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} addToast={addToast} onRemoveProof={handleRemoveProof}/>
                        
                        <div className="bg-white p-5 rounded-lg border-2 border-slate-200 shadow-sm mt-2 relative overflow-hidden">
                          <div className={`absolute top-0 left-0 bottom-0 w-2 ${formData.balanceReceived ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          
                          <div className="flex flex-col md:flex-row gap-6 pl-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-lg font-bold text-slate-800">尾數餘額 (Balance)</h4>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${formData.balanceReceived ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                      {formData.balanceReceived ? 'Paid' : 'Unpaid'}
                                    </span>
                                </div>
                                <div className="text-3xl font-black text-slate-800 font-mono mb-3">
                                    ${formatMoney(Number(formData.totalAmount) - Number(formData.deposit1 || 0) - Number(formData.deposit2 || 0) - Number(formData.deposit3 || 0))}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">付款期限 (Due Date Rule)</span>
                                    <div className="flex gap-3">
                                      <label className="flex items-center space-x-2 text-sm cursor-pointer bg-slate-50 px-3 py-1.5 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                                          <input type="radio" name="balanceDueDateType" value="eventDay" checked={formData.balanceDueDateType === 'eventDay'} onChange={handleInputChange} className="text-blue-600"/>
                                          <span>宴會當日</span>
                                      </label>
                                      <label className="flex items-center space-x-2 text-sm cursor-pointer bg-slate-50 px-3 py-1.5 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                                          <input type="radio" name="balanceDueDateType" value="10daysPrior" checked={formData.balanceDueDateType === '10daysPrior'} onChange={handleInputChange} className="text-blue-600"/>
                                          <span>10 日前</span>
                                      </label>
                                      <label className="flex items-center space-x-2 text-sm cursor-pointer bg-slate-50 px-3 py-1.5 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                                          <input 
                                              type="radio" 
                                              name="balanceDueDateType" 
                                              value="manual" 
                                              checked={formData.balanceDueDateType === 'manual'} 
                                              onChange={handleInputChange} 
                                              className="text-blue-600"
                                          />
                                          <span>手動 (Manual)</span>
                                      </label>
                                    </div>
                                    {formData.balanceDueDateType === 'manual' && (
                                  <div className="mt-1 animate-in slide-in-from-top-1">
                                      <input 
                                          type="date" 
                                          value={formData.balanceDueDateOverride || ''}
                                          onChange={(e) => setFormData(prev => ({...prev, balanceDueDateOverride: e.target.value}))}
                                          className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                      />
                                  </div>
                                )}
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-3 w-full md:w-auto min-w-[280px]">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs font-bold text-slate-400 mb-1">付款方式</label>
                                      <FormSelect label="" name="paymentMethod" options={['現金', '信用卡', '支票', '轉數快']} value={formData.paymentMethod} onChange={handleInputChange} className="w-full text-sm"/>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-400 mb-1">付款日期</label>
                                      <input 
                                          type="date" 
                                          value={formData.balanceDate || ''} 
                                          onChange={e => setFormData(prev => ({...prev, balanceDate: e.target.value}))}
                                          className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                </div>

                                <label className={`flex items-center justify-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.balanceReceived ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={formData.balanceReceived || false} onChange={e => setFormData(prev => ({...prev, balanceReceived: e.target.checked}))} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"/>
                                    <span className={`font-bold ${formData.balanceReceived ? 'text-emerald-700' : 'text-slate-600'}`}>
                                      {formData.balanceReceived ? "確認已收尾數 (Confirmed)" : "標記為已收款"}
                                    </span>
                                </label>

                                <div className="pt-2 border-t border-slate-100 flex justify-end">
                                    <input 
                                      type="file" 
                                      ref={balanceFileInputRef} 
                                      className="hidden" 
                                      accept="image/*" 
                                      onChange={async (e) => {
                                          const file = e.target.files[0];
                                          if (!file) return;
                                          setIsBalanceUploading(true);
                                          try {
                                            const url = await handleUploadProof(file);
                                            setFormData(prev => ({ ...prev, balanceProof: url }));
                                            addToast("尾數收據上傳成功", "success");
                                          } catch (err) {
                                            addToast("上傳失敗", "error");
                                          } finally {
                                            setIsBalanceUploading(false);
                                          }
                                      }} 
                                    />
                                    {formData.balanceProof ? (
                                      <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-bold">
                                          <a href={formData.balanceProof} target="_blank" rel="noreferrer" className="flex items-center hover:underline mr-2">
                                            <ImageIcon size={14} className="mr-1.5"/> 查看收據
                                          </a>
                                          <button 
                                            type="button" 
                                            onClick={() => handleRemoveProof('balanceProof')}
                                            className="text-blue-400 hover:text-red-500 border-l border-blue-200 pl-2 ml-1"
                                          >
                                            <X size={14}/>
                                          </button>
                                      </div>
                                    ) : (
                                      <button 
                                          type="button" 
                                          onClick={() => balanceFileInputRef.current?.click()} 
                                          disabled={isBalanceUploading}
                                          className="text-xs flex items-center text-slate-500 hover:text-blue-600 px-2 py-1 rounded transition-colors"
                                      >
                                          {isBalanceUploading ? <Loader2 size={14} className="animate-spin mr-1"/> : <Upload size={14} className="mr-1"/>} 
                                          上傳尾數收據
                                      </button>
                                    )}
                                </div>
                              </div>
                          </div>
                        </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: VENUE */}
              {formTab === 'venue' && (
                <div className="space-y-6 animate-in fade-in">
                  
                  {/* MAIN DECOR SETTINGS */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">場地佈置 (Main Setup)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <FormSelect label="檯布顏色 (Table Cloth)" name="tableClothColor" options={DECOR_COLORS} value={formData.tableClothColor} onChange={handleInputChange} />
                       <FormSelect label="椅套顏色 (Chair Cover)" name="chairCoverColor" options={DECOR_COLORS} value={formData.chairCoverColor} onChange={handleInputChange} />
                    </div>
                    
                    {/* Head Table & Bridal Room (Keep existing code logic here...) */}
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
                            <input type="text" name="headTableCustomColor" value={formData.headTableCustomColor} onChange={handleInputChange} placeholder="請輸入主家席顏色" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                          )}
                        </div>
                        <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                          <div className="flex justify-between items-center mb-2">
                             <label className="font-bold text-slate-700 text-sm">新娘房 / 更衣室</label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                               <input type="checkbox" name="bridalRoom" checked={formData.bridalRoom} onChange={e => setFormData(prev => ({...prev, bridalRoom: e.target.checked}))} className="rounded text-pink-500"/>
                               <span className="text-xs text-slate-500">使用</span>
                             </label>
                          </div>
                          {formData.bridalRoom && (
                            <input type="text" name="bridalRoomHours" value={formData.bridalRoomHours} onChange={handleInputChange} placeholder="使用時間 e.g. 17:00 - 23:00" className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm bg-white" />
                          )}
                        </div>
                    </div>

                    {/* NEW: Stage Decor with Photo */}
                    <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4">
                       <label className="block text-sm font-bold text-slate-700">舞台/花藝佈置 (Stage/Floral)</label>
                       <div className="flex gap-4">
                          <textarea 
                             name="stageDecor" 
                             rows={3} 
                             value={formData.stageDecor} 
                             onChange={handleInputChange} 
                             placeholder="描述..." 
                             className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none"
                          />
                          <div className="w-32 flex flex-col items-center">
                             {formData.stageDecorPhoto ? (
                                <div className="relative w-full h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                                   {/* Click to Open/Enlarge */}
                                   <a href={formData.stageDecorPhoto} target="_blank" rel="noreferrer" className="block w-full h-full cursor-zoom-in" title="點擊放大 (Click to Enlarge)">
                                      <img src={formData.stageDecorPhoto} alt="Decor" className="w-full h-full object-cover" />
                                   </a>
                                   <button type="button" onClick={() => setFormData(prev => ({...prev, stageDecorPhoto: ''}))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                                </div>
                             ) : (
                                <label className="w-full h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                                   <ImageIcon size={20} className="mb-1"/>
                                   <span className="text-[10px]">上傳照片</span>
                                   <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'stageDecorPhoto')} />
                                </label>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  {/* EQUIPMENT & DECOR LIST */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">物資與佈置 (Equipment & Decor)</h4>
                    
                    {/* Equipment */}
                    <div className="mb-4">
                      <label className="text-sm font-bold text-slate-600 block mb-2">一般物資</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['podium', 'mic', 'micStand', 'cake'].map(key => (
                          <FormCheckbox key={key} label={{podium:'講台', mic:'咪', micStand:'咪架', cake:'蛋糕'}[key]} name={`eq_${key}`} checked={formData.equipment?.[key]} onChange={handleInputChange} />
                        ))}
                        
                        {/* Special Case: Name Sign (Text Input) */}
                        <div className="col-span-2 flex items-center space-x-2 bg-slate-50 p-2 rounded border border-slate-200">
                           <FormCheckbox label="禮堂字牌" name="eq_nameSign" checked={formData.equipment?.nameSign} onChange={handleInputChange} />
                           {formData.equipment?.nameSign && (
                              <input 
                                type="text" 
                                placeholder="輸入文字內容..." 
                                className="flex-1 border-b border-slate-300 bg-transparent text-sm outline-none focus:border-blue-500"
                                value={formData.nameSignText || ''}
                                onChange={e => setFormData(prev => ({...prev, nameSignText: e.target.value}))}
                              />
                           )}
                        </div>
                      </div>
                    </div>

                    {/* Decoration */}
                    <div>
                      <label className="text-sm font-bold text-slate-600 block mb-2">婚宴/佈置</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        {/* Renamed Ceremony Table */}
                        <FormCheckbox label="證婚桌 (Ceremony Table)" name="dec_ceremonyService" checked={formData.decoration?.ceremonyService} onChange={handleInputChange} />
                        
                        {['flowerPillars', 'guestBook', 'easel', 'mahjong', 'wreaths'].map(key => (
                          <FormCheckbox key={key} label={{flowerPillars:'花柱佈置', guestBook:'簽名冊', easel:'畫架', mahjong:'麻雀枱', wreaths:'花圈'}[key]} name={`dec_${key}`} checked={formData.decoration?.[key]} onChange={handleInputChange} />
                        ))}

                        {/* Special Case: Invites (Qty) */}
                        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded border border-slate-200">
                           <FormCheckbox label="喜帖" name="dec_invites" checked={formData.decoration?.invites} onChange={handleInputChange} />
                           {formData.decoration?.invites && (
                              <input 
                                type="number" 
                                placeholder="套數" 
                                className="w-16 border border-slate-300 rounded px-1 py-0.5 text-sm"
                                value={formData.invitesQty || ''}
                                onChange={e => setFormData(prev => ({...prev, invitesQty: e.target.value}))}
                              />
                           )}
                        </div>

                        {/* Special Case: Chairs */}
                        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded border border-slate-200">
                           <FormCheckbox label="證婚椅子" name="dec_ceremonyChairs" checked={formData.decoration?.ceremonyChairs} onChange={handleInputChange} />
                           {formData.decoration?.ceremonyChairs && (
                             <input type="text" placeholder="數量" className="w-16 border border-slate-300 rounded px-1 py-0.5 text-sm" value={formData.decorationChairsQty || ''} onChange={(e) => setFormData(prev => ({...prev, decorationChairsQty: e.target.value}))} />
                           )}
                        </div>
                      </div>

                      {/* NEW: General Decor Text & Photo */}
                      <div className="flex gap-4">
                          <textarea 
                             rows={2} 
                             placeholder="其他佈置補充 (General Decor Notes)..." 
                             className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none"
                             value={formData.venueDecor || ''} 
                             onChange={(e) => setFormData(prev => ({...prev, venueDecor: e.target.value}))}
                          />
                          <div className="w-32 flex flex-col items-center">
                             {formData.venueDecorPhoto ? (
                                <div className="relative w-full h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                                   <img src={formData.venueDecorPhoto} alt="Decor" className="w-full h-full object-cover" />
                                   <button type="button" onClick={() => setFormData(prev => ({...prev, venueDecorPhoto: ''}))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10}/></button>
                                </div>
                             ) : (
                                <label className="w-full h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                                   <ImageIcon size={16} className="mb-1"/>
                                   <span className="text-[9px]">上傳照片</span>
                                   <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0], 'venueDecorPhoto')} />
                                </label>
                             )}
                          </div>
                      </div>
                    </div>
                  </div>

                  {/* AV Section (Keep existing) */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">AV 設備</h4>
                    {/* ... (Keep your existing AV Checkboxes code here) ... */}
                    {/* Assuming you keep the same AV grid from previous version */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[{k:'ledBig',l:'大禮堂LED'},{k:'projBig',l:'大禮堂Proj'},{k:'ledSmall',l:'小禮堂LED'},{k:'projSmall',l:'小禮堂Proj'},{k:'spotlight',l:'聚光燈'},{k:'movingHead',l:'電腦燈'},{k:'entranceLight',l:'進場燈'},{k:'tv60v',l:'60寸TV(直)'},{k:'tv60h',l:'60寸TV(橫)'},{k:'mic',l:'咪'},{k:'speaker',l:'喇叭'}].map(item=><FormCheckbox key={item.k} label={item.l} name={`av_${item.k}`} checked={formData.avRequirements?.[item.k]} onChange={handleInputChange}/>)}
                    </div>
                    <input type="text" placeholder="其他 AV 補充" className="w-full border border-slate-300 rounded px-3 py-2 text-sm mt-2" value={formData.avOther||''} onChange={e=>setFormData(prev=>({...prev,avOther:e.target.value}))}/>
                    <FormTextArea label="AV 備註" name="avNotes" value={formData.avNotes} onChange={handleInputChange}/>
                  </div>
                </div>
              )}

              {/* TAB 5: LOGISTICS */}
              {formTab === 'logistics' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">物流與備註 (Logistics)</h4>
                    
                  {/* 1. Multiple Deliveries Section (Updated with DATE) */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                       <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-bold text-slate-700 flex items-center"><Truck size={16} className="mr-2"/> 送貨/物資安排 (Deliveries)</label>
                          <button 
                             type="button" 
                             // UPDATE: Added date: '' to the new object
                             onClick={() => setFormData(prev => ({...prev, deliveries: [...(prev.deliveries || []), { id: Date.now(), unit: '', date: '', time: '', items: '' }] }))}
                             className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:text-blue-600 flex items-center shadow-sm"
                          >
                             <Plus size={12} className="mr-1"/> 新增單位
                          </button>
                       </div>
                       
                       <div className="space-y-3">
                          {(!formData.deliveries || formData.deliveries.length === 0) && (
                             <div className="text-center text-slate-400 text-xs py-2 italic">暫無送貨安排</div>
                          )}
                          
                          {(formData.deliveries || []).map((delivery, idx) => (
                             <div key={delivery.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm relative group">
                                <div className="grid grid-cols-12 gap-2 mb-2">
                                   {/* Unit Name */}
                                   <div className="col-span-4">
                                      <input 
                                         type="text" 
                                         placeholder="單位 (Unit)" 
                                         className="w-full text-sm font-bold border-b border-slate-200 outline-none focus:border-blue-500 placeholder:font-normal"
                                         value={delivery.unit}
                                         onChange={e => {
                                            const newDeliveries = [...formData.deliveries];
                                            newDeliveries[idx].unit = e.target.value;
                                            setFormData(prev => ({...prev, deliveries: newDeliveries}));
                                         }}
                                      />
                                   </div>

                                   {/* NEW: Date Input */}
                                   <div className="col-span-4">
                                      <input 
                                         type="date" 
                                         className="w-full text-sm border-b border-slate-200 outline-none focus:border-blue-500 text-slate-600"
                                         value={delivery.date}
                                         onChange={e => {
                                            const newDeliveries = [...formData.deliveries];
                                            newDeliveries[idx].date = e.target.value;
                                            setFormData(prev => ({...prev, deliveries: newDeliveries}));
                                         }}
                                      />
                                   </div>

                                   {/* Time Input */}
                                   <div className="col-span-3">
                                      <input 
                                         type="time" 
                                         className="w-full text-sm border-b border-slate-200 outline-none focus:border-blue-500 text-slate-600"
                                         value={delivery.time}
                                         onChange={e => {
                                            const newDeliveries = [...formData.deliveries];
                                            newDeliveries[idx].time = e.target.value;
                                            setFormData(prev => ({...prev, deliveries: newDeliveries}));
                                         }}
                                      />
                                   </div>

                                   {/* Delete Button */}
                                   <div className="col-span-1 text-right">
                                       <button 
                                          type="button"
                                          onClick={() => setFormData(prev => ({...prev, deliveries: prev.deliveries.filter((_, i) => i !== idx)}))}
                                          className="text-slate-300 hover:text-red-500 p-1"
                                       >
                                          <Trash2 size={14} />
                                       </button>
                                   </div>
                                </div>
                                <textarea 
                                   rows={2} 
                                   placeholder="物資清單 / 備註 (Items List)..." 
                                   className="w-full text-sm bg-slate-50 border border-slate-100 rounded p-2 outline-none focus:bg-white focus:border-blue-200 resize-none"
                                   value={delivery.items}
                                   onChange={e => {
                                      const newDeliveries = [...formData.deliveries];
                                      newDeliveries[idx].items = e.target.value;
                                      setFormData(prev => ({...prev, deliveries: newDeliveries}));
                                   }}
                                />
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* 2. Parking Tickets Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                       <label className="text-sm font-bold text-slate-700 flex items-center mb-3"><MapPin size={16} className="mr-2"/> 泊車安排 (Parking)</label>
                       
                       <div className="bg-white p-3 rounded border border-slate-200 mb-3">
                          <span className="text-xs font-bold text-blue-600 uppercase mb-2 block">免費泊車券 (Free Parking Tickets)</span>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                                <span className="text-xs text-slate-500 mr-2">數量:</span>
                                <input 
                                   type="number" 
                                   className="flex-1 bg-transparent outline-none text-sm font-bold"
                                   placeholder="0"
                                   value={formData.parkingInfo?.ticketQty || ''}
                                   onChange={e => setFormData(prev => ({...prev, parkingInfo: { ...prev.parkingInfo, ticketQty: e.target.value }}))}
                                />
                                <span className="text-xs text-slate-400 ml-1">張</span>
                             </div>
                             <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                                <span className="text-xs text-slate-500 mr-2">時數:</span>
                                <input 
                                   type="number" 
                                   className="flex-1 bg-transparent outline-none text-sm font-bold"
                                   placeholder="0"
                                   value={formData.parkingInfo?.ticketHours || ''}
                                   onChange={e => setFormData(prev => ({...prev, parkingInfo: { ...prev.parkingInfo, ticketHours: e.target.value }}))}
                                />
                                <span className="text-xs text-slate-400 ml-1">小時</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="mt-2">
                          <label className="text-xs font-bold text-slate-500 mb-1 block">車牌登記 (License Plates Registration)</label>
                          <textarea 
                             rows={3} 
                             value={formData.parkingInfo?.plates || ''} 
                             onChange={e => setFormData(prev => ({...prev, parkingInfo: { ...prev.parkingInfo, plates: e.target.value }}))} 
                             placeholder="請輸入車牌 (e.g. AB1234, CD5678)"
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                          />
                       </div>
                    </div>

                    <FormTextArea label="其他備註 (Other Notes)" name="otherNotes" rows={3} value={formData.otherNotes} onChange={handleInputChange} />
                  </div>
                </div>
              )}
            </div>
            {/* TAB 6: PRINT CONFIGURATION */}
            {formTab === 'printConfig' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center">
                    <Printer size={18} className="mr-2"/> 列印自訂 (Print Customization)
                  </h4>

                  {/* 1. Menu Confirmation Settings */}
                  <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
                    <h5 className="font-bold text-violet-800 text-sm mb-3">菜譜確認書 (Menu Confirmation)</h5>
                    
                    <div className="space-y-4">
                      
                      {/* ✅ NEW: Font Size Slider/Input */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          菜單字體大小 (Font Size): <span className="text-violet-600">{formData.printSettings?.menu?.fontSizeOverride || 18}px</span>
                        </label>
                        <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="12" 
                              max="30" 
                              step="1"
                              value={formData.printSettings?.menu?.fontSizeOverride || 18}
                              onChange={(e) => setFormData(prev => ({
                                  ...prev, 
                                  printSettings: { 
                                    ...prev.printSettings, 
                                    menu: { ...prev.printSettings?.menu, fontSizeOverride: e.target.value } 
                                  }
                              }))}
                              className="flex-1 h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                            />
                            <input 
                              type="number" 
                              value={formData.printSettings?.menu?.fontSizeOverride || 18}
                              onChange={(e) => setFormData(prev => ({
                                  ...prev, 
                                  printSettings: { 
                                    ...prev.printSettings, 
                                    menu: { ...prev.printSettings?.menu, fontSizeOverride: e.target.value } 
                                  }
                              }))}
                              className="w-16 px-2 py-1 text-sm border border-violet-200 rounded text-center outline-none focus:border-violet-500"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Default: 18px. Adjust smaller for long menus to fit one page.</p>
                      </div>

                      <div className="border-t border-violet-200 my-2"></div>

                      {/* Existing Toggles */}
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={formData.printSettings?.menu?.showPlatingFeeDisclaimer !== false} 
                            onChange={(e) => setFormData(prev => ({
                              ...prev, 
                              printSettings: { 
                                ...prev.printSettings, 
                                menu: { ...prev.printSettings?.menu, showPlatingFeeDisclaimer: e.target.checked } 
                              }
                            }))}
                          />
                          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700">顯示「分菜位上附加費」條款</span>
                      </label>

                      {/* Date Override */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">有效期覆寫 (Validity Date Override)</label>
                        <input 
                          type="text" 
                          placeholder="預設: 今天+14日 (Default: Today+14)"
                          value={formData.printSettings?.menu?.validityDateOverride || ''}
                          onChange={(e) => setFormData(prev => ({
                              ...prev, 
                              printSettings: { 
                                ...prev.printSettings, 
                                menu: { ...prev.printSettings?.menu, validityDateOverride: e.target.value } 
                              }
                          }))}
                          className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Quotation Settings (Existing) */}
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                    <h5 className="font-bold text-emerald-800 text-sm mb-3">報價單 (Quotation)</h5>
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={formData.printSettings?.quotation?.showClientInfo !== false} 
                            onChange={(e) => setFormData(prev => ({
                              ...prev, 
                              printSettings: { 
                                ...prev.printSettings, 
                                quotation: { ...prev.printSettings?.quotation, showClientInfo: e.target.checked } 
                              }
                            }))}
                          />
                          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700">顯示客戶資料 (Show Client Info)</span>
                    </label>
                  </div>

                </div>
              </div>
            )}
            {/* Footer inside the Modal */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center sticky bottom-0 z-10 gap-4">
              
              {/* LEFT SIDE: AI & Print Tools */}
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
                 
                 {/* 1. NEW AI BUTTON */}
                 <button
                   type="button"
                   onClick={() => setIsAiOpen(true)}
                   className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 rounded-lg font-medium flex items-center shadow-md text-sm whitespace-nowrap"
                 >
                   <Sparkles size={16} className="mr-2" /> AI 助手
                 </button>

                 {/* 2. Divider (Only show if we have print buttons next to it) */}
                 {editingEvent && <div className="h-6 w-px bg-slate-300 mx-2"></div>}

                 {/* 3. Existing Print Buttons */}
                 {editingEvent && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrintEO}
                      className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium flex items-center border border-slate-200 text-sm whitespace-nowrap"
                    >
                      <Printer size={16} className="mr-2" /> EO
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintBriefing}
                      className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium flex items-center border border-indigo-200 text-sm whitespace-nowrap"
                    >
                      <Users size={16} className="mr-2" /> Brief
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                          setPrintMode('MENU_CONFIRM');
                          setTimeout(() => window.print(), 100);
                      }}
                      className="px-3 py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg font-medium flex items-center border border-violet-200 text-sm whitespace-nowrap ml-2"
                    >
                      <Utensils size={16} className="mr-2" /> 菜譜
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintQuotation}
                      className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium flex items-center border border-emerald-200 text-sm whitespace-nowrap"
                    >
                      <FileText size={16} className="mr-2" /> Quotation
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                          setPrintMode('INVOICE');
                          setTimeout(() => window.print(), 100);
                      }}
                      className="px-3 py-2 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg font-medium flex items-center border border-blue-200 text-sm whitespace-nowrap ml-2"
                    >
                      <FileText size={16} className="mr-2" /> Invoice (發票)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                          setPrintMode('CONTRACT');
                          setTimeout(() => window.print(), 100);
                      }}
                      className="px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg font-medium flex items-center border border-amber-200 text-sm whitespace-nowrap"
                    >
                      <FileText size={16} className="mr-2" /> Contract
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                          setPrintMode('CONTRACT_CN');
                          setTimeout(() => window.print(), 100);
                      }}
                      className="px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg font-medium flex items-center border border-amber-200 text-sm whitespace-nowrap ml-2"
                    >
                      <FileText size={16} className="mr-2" /> 中文合約
                    </button>
                  </>
                 )}
              </div>

              {/* RIGHT SIDE: Cancel & Save */}
              <div className="flex items-center space-x-3 pl-2 flex-shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">取消</button>
                <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg whitespace-nowrap">儲存訂單</button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
      
      {isAiOpen && (
        <AiAssistant 
          formData={formData} 
          setFormData={setFormData} 
          onClose={() => { 
              setIsAiOpen(false); 
              setAiPrompt(''); 
              setTemplateMessage(null); // 清空模板
          }} 
          initialPrompt={aiPrompt}
          initialMessage={templateMessage} // 傳入模板
        />
      )}

      <div className="print-only">
        {/* FIX: Remove the '&&' check so it renders for both 'EO' and 'BRIEFING' modes */}
        {/* Pass printMode as a prop so the component knows which layout to show */}
        <PrintableEO data={formData} printMode={printMode} />
      </div>

      {/* ======================================================== */}

    </>
  );
}