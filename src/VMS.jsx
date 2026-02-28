import React, { useState, useEffect, useMemo, useRef } from 'react';

// 1. Icons
import {
  AlertCircle,
  AlertTriangle,
  Armchair, // Added for Chairs
  BarChart3,
  Bell,
  Cake, // Added for Cake
  Calendar as CalendarIcon,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Columns, // Added for Pillars
  Copy,
  CreditCard,
  DollarSign,
  Edit2,
  Eye,
  FileText,
  Flower2, // Added for Silk Flowers
  Frame, // Added for Easel
  Grid, // Added for Mahjong
  History,
  Image as ImageIcon,
  Info,
  Key,
  Languages,
  Layout,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Maximize, // Added for LED Screen
  MessageCircle,
  Mic, // Added for Wireless Mic
  Mic2, // Added for Podium/Mic
  Monitor,
  Palette, // Added for Decor Category
  PenTool, // Added for Guest Book
  PieChart,
  Plus,
  Printer,
  RotateCw, // Added for Moving Head
  Save,
  Search,
  Send,
  Settings,
  Smartphone, // Added for TVs
  Sparkles,
  Star,
  Sun, // Added for Spotlight
  Trash2,
  TrendingUp,
  Truck,
  Tv,
  Type, // Added for Name Sign
  Upload,
  Users,
  Utensils,
  Video, // Added for Projector
  Wind, // Added for Flower Aisle
  X,
  Zap, // Added for Entrance Light
  Receipt
} from 'lucide-react';

// 2. Shared Connection (from your new file)
import { db, auth, storage } from './firebase';

// 3. Auth Helpers (Added signInAnonymously back)
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

// 4. Firestore Helpers (Added collection back)
import {
  collection,        // <--- THIS WAS MISSING
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  getDoc,
  getDocs
} from "firebase/firestore";

// 5. Storage Helpers
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

//6. AI feature
import { useAI } from './hooks/useAI';
import AiAssistant from './components/AiAssistant';
import DataAssistant from './components/DataAssistant';
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
  { key: 'tea', label: '茶芥 (Tea)' },
  { key: 'wine', label: '紅酒 (Wine)' },
  { key: 'other', label: '其他 (Other)' }
];

// Helpers for UI Filtering
const FOOD_DEPTS = ['kitchen', 'dimsum', 'roast'];
const DRINK_DEPTS = ['bar', 'tea', 'wine'];

const equipmentMap = {
  stage: '禮堂舞台 W7.2 x L2.5m (Stage)',
  podium: '講台 (Podium)',
  receptionTable: '接待桌 180x60cm (Reception Table)',
  signage: '標示牌 W69xH122cm x 2個 (Signage x 2)',
  nameSign: '禮堂字牌 (Name Sign)',
  hasCake: '婚宴蛋糕 (Cake)'
};

const avMap = {
  tvVertical: '60寸電視-直 (60" TV - Vertical)',
  tvHorizontal: '60寸電視-橫 (60" TV - Horizontal)',
  spotlight: '聚光燈 (Spotlight)',
  movingHead: '電腦燈 (Moving Head Light)',
  entranceLight: '進場燈 (Entrance Light)',
  grandHallProjector: '大禮堂投影機 (Grand Hall Projector)',
  smallHallLED: '小禮堂 LED 顯示屏 (Small Hall LED Screen)',
  ledScreen: 'LED 顯示屏 W6.4 x H4m (LED Screen)',
  wirelessMic: '無線手持麥克風 x 4支 (Wireless Mic x 4)',
  projector: '投影機 (Projector)',
};

const decorationMap = {
  backdrop: '舞台背景佈置 (Stage Backdrop)',
  receptionDecor: '接待處佈置 (Reception Decoration)',
  silkFlower: '絲花擺設 (Silk Flower Arrangement)',
  ceremonyTable: '證婚桌 (Ceremony Table)',
  signingBook: '簽名冊 (Guest Signature Book)',
  flowerAisle: '花圈 (Floral Aisle)',
  easel: '畫架 (Easel)',
  hasFlowerPillar: '花柱佈置 (Flower Pillars)',
  hasMahjong: '麻雀枱 (Mahjong Tables)',
  hasInvitation: '喜帖 (Invitations)',
  hasCeremonyChair: '證婚椅子 (Chairs)'
};

const generateBillingSummary = (eventData) => {
  let subtotal = 0;
  let scBase = 0;

  // 1. Menus
  const parsedMenus = (eventData.menus || []).map(m => {
    const price = safeFloat(m.price);
    const qty = safeFloat(m.qty);
    const amount = price * qty;
    subtotal += amount;
    if (m.applySC !== false) scBase += amount;
    return { ...m, cleanPrice: price, cleanQty: qty, amount };
  });

  // 2. Plating Fee
  let plating = null;
  if (eventData.servingStyle === '位上' && safeFloat(eventData.platingFee) > 0) {
    const price = safeFloat(eventData.platingFee);
    const qty = safeFloat(eventData.tableCount);
    const amount = price * qty;
    subtotal += amount;
    if (eventData.platingFeeApplySC !== false) scBase += amount;
    plating = { price, qty, amount };
  }

  // 3. Drinks
  let drinks = null;
  if (safeFloat(eventData.drinksPrice) > 0) {
    const price = safeFloat(eventData.drinksPrice);
    const qty = safeFloat(eventData.drinksQty);
    const amount = price * qty;
    subtotal += amount;
    if (eventData.drinksApplySC !== false) scBase += amount;
    drinks = { label: eventData.drinksPackage || 'Standard Package', price, qty, amount };
  }

  // 4. Bus Arrangement
  let bus = null;
  if (eventData.busInfo?.enabled) {
    const amount = safeFloat(eventData.busCharge);
    subtotal += amount;
    if (eventData.busApplySC) scBase += amount;
    bus = {
      amount,
      arrivals: eventData.busInfo.arrivals || [],
      departures: eventData.busInfo.departures || []
    };
  }

  // 5. 🌟 NEW: Category Packages (Setup, AV, Decor) 🌟
  const setupPackagePrice = safeFloat(eventData.setupPackagePrice);
  const avPackagePrice = safeFloat(eventData.avPackagePrice);
  const decorPackagePrice = safeFloat(eventData.decorPackagePrice);

  if (setupPackagePrice > 0) {
    subtotal += setupPackagePrice;
    if (eventData.setupApplySC !== false) scBase += setupPackagePrice;
  }
  if (avPackagePrice > 0) {
    subtotal += avPackagePrice;
    if (eventData.avApplySC !== false) scBase += avPackagePrice;
  }
  if (decorPackagePrice > 0) {
    subtotal += decorPackagePrice;
    if (eventData.decorApplySC !== false) scBase += decorPackagePrice;
  }

  // 6. Custom Items
  const parsedCustomItems = (eventData.customItems || []).map(i => {
    const price = safeFloat(i.price);
    const qty = safeFloat(i.qty);
    const amount = price * qty;
    subtotal += amount;
    if (i.applySC) scBase += amount;
    return { ...i, cleanPrice: price, cleanQty: qty, amount };
  });

  // 7. Service Charge (STRICT 10%)
  let serviceChargeVal = 0;
  let scLabel = '10%'; // Locks the print layout label to "10%" instead of "Fixed"
  if (eventData.enableServiceCharge !== false) {
    serviceChargeVal = scBase * 0.1;
  }
  const discountVal = safeFloat(eventData.discount);

  // 8. Surcharge & Grand Total
  const baseTotal = subtotal + serviceChargeVal - discountVal;
  const ccSurcharge = eventData.paymentMethod === '信用卡' ? baseTotal * 0.03 : 0;
  const grandTotal = Math.round(baseTotal + ccSurcharge);

  // 9. Deposits & Balances
  const dep1 = safeFloat(eventData.deposit1);
  const dep2 = safeFloat(eventData.deposit2);
  const dep3 = safeFloat(eventData.deposit3);
  const totalDeposits = dep1 + dep2 + dep3;

  let totalPaid = 0;
  if (eventData.deposit1Received) totalPaid += dep1;
  if (eventData.deposit2Received) totalPaid += dep2;
  if (eventData.deposit3Received) totalPaid += dep3;
  if (eventData.balanceReceived) totalPaid = grandTotal;

  const balanceDue = grandTotal - totalPaid;

  // 10. Return EVERYTHING
  return {
    parsedMenus, plating, drinks, bus, parsedCustomItems,
    setupPackagePrice, avPackagePrice, decorPackagePrice,
    subtotal, serviceChargeVal, scLabel, discountVal, ccSurcharge,
    grandTotal, totalDeposits, totalPaid, balanceDue,
    dep1, dep2, dep3
  };
};

const calculateDepartmentSplit = (data) => {
  // 1. Initialize with NEW keys
  const split = {
    kitchen: 0, dimsum: 0, roast: 0, bar: 0, tea: 0, wine: 0, other: 0
  };

  // 2. Process Menus
  (data.menus || []).forEach(m => {
    const qty = parseFloat(m.qty) || 1;
    const allocation = m.allocation || {};

    // If allocation exists, use it
    let hasAllocation = false;
    Object.keys(allocation).forEach(deptKey => {
      const amount = parseFloat(allocation[deptKey]) || 0;
      // Only add if the key exists in our new definition (filters out old keys like 'floor')
      if (amount > 0 && split[deptKey] !== undefined) {
        split[deptKey] += amount * qty;
        hasAllocation = true;
      }
    });

    // If NO allocation defined, dump strictly into Kitchen (Food)
    if (!hasAllocation) {
      split.kitchen += (parseFloat(m.price) || 0) * qty;
    }
  });

  // 3. Process Drinks
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
    // Default drinks to Bar if not allocated
    split.bar += (parseFloat(data.drinksPrice) || 0) * dQty;
  }

  // 4. Process Custom Items
  (data.customItems || []).forEach(item => {
    const qty = parseFloat(item.qty) || 1;
    const total = (parseFloat(item.price) || 0) * qty;
    const cat = item.category || 'other';
    if (split[cat] !== undefined) {
      split[cat] += total;
    } else {
      split[other] += total;
    }
  });

  return split;
};

// ==========================================
// SECTION 2: HELPER FUNCTIONS (MUST BE HERE)
// ==========================================

const formatMoney = (val) => {
  if (!val && val !== 0) return '0'; // Handle null/undefined but allow 0
  // Remove existing commas to parse correctly
  const clean = val.toString().replace(/,/g, '');
  const number = parseFloat(clean);

  if (isNaN(number)) return '0';

  // Round to nearest integer to remove decimals
  return Math.round(number).toLocaleString('en-US');
};

const parseMoney = (val) => {
  if (!val) return '';
  return val.toString().replace(/,/g, '');
};

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dateStr} (${day})`;
};


const safeFloat = (val) => {
  if (!val) return 0;
  // Convert to string, strip commas, then parse
  const clean = val.toString().replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
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
const VersionPreviewModal = ({ isOpen, onClose, version, onRestore }) => {
  if (!isOpen || !version) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">版本預覽 (Version Preview)</h3>
            <p className="text-sm text-slate-500 font-bold">{version.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-4">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm mb-4">
            <div className="flex items-start">
              <AlertTriangle className="text-amber-600 mr-3 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-bold text-amber-800 text-sm">⚠️ 注意 (Warning)</h4>
                <p className="text-xs text-amber-700 mt-1">
                  還原此版本將會<b>覆蓋</b>當前所有的菜單內容與設定。此操作無法復原。<br />
                  Restoring this version will <b>overwrite</b> all current menu items and settings. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {version.data.map((menu, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                  <span className="font-bold text-slate-700">{menu.title}</span>
                  <div className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                    ${menu.price} / {menu.priceType}
                  </div>
                </div>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {menu.content || '(Empty)'}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消 (Cancel)
          </button>
          <button
            onClick={() => { onRestore(version); onClose(); }}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md flex items-center transition-colors"
          >
            <History size={16} className="mr-2" /> 確認還原 (Confirm Restore)
          </button>
        </div>
      </div>
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

const MenuPrintSelector = ({ isOpen, onClose, menus, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center">
            <Printer size={18} className="mr-2 text-slate-500" /> 選擇列印菜單 (Select Menu to Print)
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500 mb-2">此訂單包含多個菜單。請問您想列印哪一份？<br />(This order has multiple menus. Which one would you like to print?)</p>


          <div className="border-t border-slate-100 my-2"></div>

          {/* Option 2: Individual Menus */}
          {menus.map((menu, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-violet-500 hover:bg-violet-50 transition-all"
            >
              <div className="font-bold text-slate-700">{menu.title || `Menu ${idx + 1}`}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{menu.content ? menu.content.substring(0, 40) + '...' : '(Empty)'}</div>
            </button>
          ))}
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
        name="locationOther"       // Identifies the field
        autoComplete="off"         // Tells browser NOT to autofill
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

  const isOverdue = formData[amountKey] && !formData[receivedKey] && formData[dateKey] && new Date(formData[dateKey]) < new Date().setHours(0, 0, 0, 0);

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
            onChange={e => setFormData(prev => ({ ...prev, [receivedKey]: e.target.checked }))}
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
              if (!isNaN(val)) setFormData(prev => ({ ...prev, [amountKey]: val }));
            }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-white"
            placeholder="0.00"
          />
        </div>
        <input
          type="date"
          value={formData[dateKey] || ''}
          onChange={e => setFormData(prev => ({ ...prev, [dateKey]: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        />
      </div>

      <div className="flex justify-end items-center border-t border-slate-200/50 pt-2">
        <div className="flex items-center">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          {formData[proofKey] ? (
            <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
              <a href={formData[proofKey]} target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-600 hover:underline">
                <ImageIcon size={14} className="mr-1" /> 收據
              </a>
              <button
                type="button"
                onClick={() => onRemoveProof(proofKey)}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-xs flex items-center text-slate-500 hover:text-blue-600 bg-white px-2 py-1 rounded border border-transparent hover:border-slate-200 transition-all">
              {isUploading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Upload size={12} className="mr-1" />} 上傳收據
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

  // --- NEW: English Date Formatter ---
  const formatDateEn = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      weekday: 'short'
    });
  };

  // --- NEW: Venue Translation Helper ---
  const getVenueEn = (loc) => {
    const clean = cleanLocation(loc);
    const map = {
      '紅區': 'Red Zone', 'Red': 'Red Zone',
      '黃區': 'Yellow Zone', 'Yellow': 'Yellow Zone',
      '綠區': 'Green Zone', 'Green': 'Green Zone',
      '藍區': 'Blue Zone', 'Blue': 'Blue Zone',
      '全場': 'Whole Venue'
    };
    // Check if the location contains any of the keys
    for (let key in map) {
      if (clean.includes(key)) return `${clean} (${map[key]})`;
    }
    return clean; // Return original if no match
  };

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

  // ==========================================
  // 🌟 MASTER BILLING CALCULATOR 🌟
  // One function to rule all print layouts
  // ==========================================

  // --- HELPER: Clean Location String (Remove leading commas) ---
  const cleanLocation = (loc) => {
    if (!loc) return '';
    // Removes leading comma and whitespace (e.g. ", A" -> "A")
    return loc.replace(/^,\s*/, '');
  };
  // --- Financial Logic (Unified) ---
  const platingTotal = (data.servingStyle === '位上') ? (parseFloat(data.platingFee) || 0) * (parseFloat(data.tableCount) || 0) : 0;

  const subtotal = (data.menus || []).reduce((acc, m) => acc + ((m.price || 0) * (m.qty || 1)), 0)
    + platingTotal
    + ((data.drinksPrice || 0) * (data.drinksQty || 1))
    + (data.customItems || []).reduce((acc, i) => acc + ((i.price || 0) * (i.qty || 1)), 0);

  let scBase = 0;
  (data.menus || []).forEach(m => { if (m.applySC !== false) scBase += (m.price || 0) * (m.qty || 1); });
  if (platingTotal > 0 && data.platingFeeApplySC !== false) {
    scBase += platingTotal;
  }
  if (data.drinksApplySC !== false) scBase += (data.drinksPrice || 0) * (data.drinksQty || 1);
  (data.customItems || []).forEach(i => { if (i.applySC) scBase += (i.price || 0) * (i.qty || 1); });

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
  const baseTotal = subtotal + serviceChargeVal - discountVal;

  // ✅ Apply Surcharge
  const ccSurcharge = data.paymentMethod === '信用卡' ? baseTotal * 0.03 : 0;
  const grandTotal = baseTotal + ccSurcharge;

  // --- Allocation Logic (Strict Mode) ---
  const getDetailedAllocation = () => {
    const allocation = {};

    // 1. Initialize Standard Departments
    DEPARTMENTS.forEach(dept => {
      allocation[dept.key] = { label: dept.label, total: 0, items: [] };
    });

    // 2. Add 'Other' and 'Unallocated' Buckets
    allocation['other'] = { label: '其他 (Other)', total: 0, items: [] };
    allocation['unallocated'] = {
      label: '⚠️ 未分拆 (Unallocated)',
      total: 0,
      items: [],
      isError: true // Flag for styling
    };

    const addItem = (key, name, subLabel, qty, unitPrice, totalAmount) => {
      if (Math.abs(totalAmount) < 0.01) return;
      // Map to bucket, fallback to 'other' if key missing
      let group = allocation[key] ? key : 'other';
      allocation[group].total += totalAmount;
      allocation[group].items.push({ name, subLabel, qty: parseFloat(qty), unit: parseFloat(unitPrice), amount: totalAmount });
    };

    // --- A. Process Menus ---
    (data.menus || []).forEach(m => {
      const qty = parseFloat(m.qty) || 1;
      const price = parseFloat(m.price) || 0;
      const totalLineAmount = price * qty;

      // If manual allocation exists
      if (m.allocation && Object.keys(m.allocation).length > 0) {
        let allocatedTotal = 0;

        // 1. Add Explicit Allocations
        Object.entries(m.allocation).forEach(([dept, unitVal]) => {
          const val = parseFloat(unitVal) || 0;
          if (val !== 0) {
            const lineAmt = val * qty;
            allocatedTotal += lineAmt;
            const deptLabel = DEPARTMENTS.find(d => d.key === dept)?.label.split(' ')[0] || dept;
            addItem(dept, m.title, deptLabel, qty, val, lineAmt);
          }
        });

        // 2. Handle Remainder -> Send to UNALLOCATED (Not Kitchen)
        const remainder = totalLineAmount - allocatedTotal;
        if (Math.abs(remainder) > 1) { // Tolerance for float math
          const unitRemainder = price - (allocatedTotal / qty);
          addItem('unallocated', m.title, 'Balance', qty, unitRemainder, remainder);
        }
      } else {
        // No allocation defined -> Default to Kitchen
        addItem('kitchen', m.title, '', qty, price, totalLineAmount);
      }
    });

    // --- B. Plating Fee ---
    if (data.servingStyle === '位上') {
      const pFee = parseFloat(data.platingFee) || 0;
      const pQty = parseFloat(data.tableCount) || 0;
      if (pFee > 0) {
        addItem('kitchen', '位上服務費', `${pQty}席`, pQty, pFee, pFee * pQty);
      }
    }

    // --- C. Drinks ---
    const dQty = parseFloat(data.drinksQty) || 1;
    const dPrice = parseFloat(data.drinksPrice) || 0;
    const dTotal = dPrice * dQty;
    const dName = data.drinksPackage || 'Drinks Package';

    if (data.drinkAllocation && Object.keys(data.drinkAllocation).length > 0) {
      let allocatedTotal = 0;
      Object.entries(data.drinkAllocation).forEach(([dept, unitVal]) => {
        const val = parseFloat(unitVal) || 0;
        if (val !== 0) {
          const lineAmt = val * dQty;
          allocatedTotal += lineAmt;
          addItem(dept, dName, dept, dQty, val, lineAmt);
        }
      });

      // Handle Remainder -> Unallocated
      const remainder = dTotal - allocatedTotal;
      if (Math.abs(remainder) > 1) {
        const unitRemainder = dPrice - (allocatedTotal / dQty);
        addItem('unallocated', dName, 'Balance', dQty, unitRemainder, remainder);
      }
    } else {
      addItem('bar', dName, '', dQty, dPrice, dTotal);
    }

    // --- D. Custom Items ---
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
  const getServingStyleLabel = () => {
    let text = data.servingStyle;
    if (data.servingStyle === '位上' && data.enableHandCarry) {
      text += ` (手捧服務: ${data.handCarryStaffQty || 0}人)`;
    }
    return text;
  };
  const EventSummary = () => (
    <div className="flex flex-wrap bg-slate-50 p-2 rounded mb-6 border border-slate-100">
      <DetailRow label="日期 (Date)" value={formatDateWithDay(data.date)} widthClass="w-1/4" highlight={true} />
      <DetailRow label="活動名稱" value={data.eventName} widthClass="w-1/4" />
      <DetailRow label="位置" value={cleanLocation(data.venueLocation)} widthClass="w-1/4" />
      <DetailRow label="時間" value={`${data.startTime} - ${data.endTime}`} widthClass="w-1/4" />
      <DetailRow label="起菜時間" value={data.servingTime} widthClass="w-1/4" highlight={true} />
      <DetailRow label="席數" value={`${data.tableCount || 0} 席`} widthClass="w-1/4" />
      <DetailRow label="人數" value={`${data.guestCount || 0} 人`} widthClass="w-1/4" />
      <DetailRow
        label="類型 / 上菜"
        value={`${data.eventType} / ${data.servingStyle}${data.enableHandCarry ? ` + 酒會手捧(${data.handCarryStaffQty || 0}人)` : ''}`}
        widthClass="w-1/4"
        highlight={data.enableHandCarry}
      />

    </div>
  );


  // ==========================================
  // VIEW 1: BANQUET BRIEFING (FLOOR STAFF - LAYOUT B)
  // ==========================================
  if (printMode === 'BRIEFING') {
    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white p-6 min-h-screen relative flex flex-col">
        <style>{`
          @media print { 
            @page { 
              margin: 5mm; 
              size: A4; 
            } 
            body { -webkit-print-color-adjust: exact; } 
          }
        `}</style>

        {/* --- HEADER --- */}
        <div className="border-b-4 border-black pb-2 mb-4">
          <div className="flex justify-between items-end">
            <div className="w-[70%]">
              <h1 className="text-4xl font-black uppercase leading-none tracking-tight mb-1">{data.eventName}</h1>
              <div className="text-xl font-bold text-slate-600 flex items-center gap-2">
                <span>{cleanLocation(data.venueLocation)}</span>
                <span className="text-slate-300">|</span>
                <span>{formatDateWithDay(data.date)}</span>
              </div>
            </div>
            <div className="w-[30%] text-right">
              <div className="bg-black text-white text-center p-2 rounded-lg shadow-sm">
                <div className="text-xs uppercase font-bold text-slate-400">Time</div>
                <div className="text-2xl font-black leading-none">{data.startTime} - {data.endTime}</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- KEY STATS ROW --- */}
        <div className="grid grid-cols-4 gap-3 mb-4 text-center">
          <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-800">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">Tables (席數)</span>
            <span className="block text-3xl font-black">{data.tableCount}</span>
          </div>
          <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-600">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">Guests (人數)</span>
            <span className="block text-3xl font-black">{data.guestCount}</span>
          </div>
          <div className="bg-slate-100 p-2 rounded border-l-4 border-indigo-600">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">Style (上菜)</span>
            <span className="block text-xl font-bold mt-1">{data.servingStyle || 'Standard'}</span>
          </div>
          <div className="bg-slate-100 p-2 rounded border-l-4 border-amber-600">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">Serving (起菜)</span>
            <span className="block text-xl font-bold mt-1">{data.servingTime || 'TBC'}</span>
          </div>
        </div>

        {/* --- CRITICAL ALERTS --- */}
        {(data.specialMenuReq || data.allergies) && (
          <div className="mb-4 p-3 border-4 border-red-600 bg-red-50 rounded-lg flex items-start gap-3">
            <div className="bg-red-600 text-white p-2 rounded font-black text-xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-red-700 font-bold text-sm uppercase underline">Allergy / Special Diet Alert</h3>
              <p className="text-2xl font-black text-red-900 leading-tight">
                {data.specialMenuReq} {data.allergies}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 flex-1 items-start">

          {/* --- LEFT COLUMN: MENU (Full Height) --- */}
          <div className="border-2 border-slate-800 rounded-xl overflow-hidden h-full flex flex-col">
            <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm uppercase">
              🍽️ Menu (菜單)
            </div>
            <div className="p-4 bg-slate-50 flex-1">
              <div className="space-y-4">
                {data.menus && data.menus.map((m, i) => (
                  <div key={i}>
                    {m.title && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{m.title}</div>}
                    <p className="text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-wrap font-serif border-l-2 border-slate-300 pl-3">
                      {onlyChinese(m.content)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {/* Beverage Section */}
            <div className="bg-blue-50 p-4 border-t border-blue-100">
              <div className="flex items-start gap-3">
                <Coffee size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <span className="block text-xs font-bold text-blue-800 uppercase">Beverage Package</span>
                  <span className="block text-base font-bold text-slate-800">{data.drinksPackage || 'None'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: RUNDOWN -> LOGISTICS -> SETUP --- */}
          <div className="flex flex-col gap-4">

            {/* 1. RUNDOWN */}
            <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm uppercase flex justify-between items-center">
                <span>📋 Rundown (流程)</span>
              </div>
              <div className="p-3">
                {(!data.rundown || data.rundown.length === 0) ? (
                  <p className="text-center text-slate-400 italic py-2">No Rundown Provided</p>
                ) : (
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {data.rundown.map((item, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="py-2 pl-2 w-14 font-mono font-bold text-slate-900 align-top">{item.time}</td>
                          <td className="py-2 pr-2 font-bold text-slate-700">{item.activity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* 2. LOGISTICS */}
            <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 font-bold text-sm text-slate-700 uppercase border-b border-slate-200">
                🚍 Logistics (物流)
              </div>
              <div className="p-3 space-y-3">
                {data.busInfo?.enabled ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                      <span className="block font-bold text-indigo-800 mb-1">Arrival (接載)</span>
                      {data.busInfo.arrivals?.length > 0 ? data.busInfo.arrivals.map((b, i) => (
                        <div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>
                      )) : <span className="text-slate-400">-</span>}
                    </div>
                    <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                      <span className="block font-bold text-indigo-800 mb-1">Departure (散席)</span>
                      {data.busInfo.departures?.length > 0 ? data.busInfo.departures.map((b, i) => (
                        <div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>
                      )) : <span className="text-slate-400">-</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center italic">No Bus Arrangement</div>
                )}

                <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Parking:</span>
                  <span className="font-bold bg-slate-100 px-2 py-0.5 rounded">{data.parkingInfo?.ticketQty || 0} Tickets ({data.parkingInfo?.ticketHours || 0} hrs)</span>
                </div>
              </div>
            </div>

            {/* 3. SETUP */}
            <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 font-bold text-sm text-slate-700 uppercase border-b border-slate-200">
                🛠️ Setup (場地)
              </div>
              <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white border border-slate-200 rounded text-center">
                  <span className="block text-[9px] text-slate-400 uppercase">Table Cloth</span>
                  <span className="block font-bold text-slate-900">{data.tableClothColor || 'Std'}</span>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded text-center">
                  <span className="block text-[9px] text-slate-400 uppercase">Chair Cover</span>
                  <span className="block font-bold text-slate-900">{data.chairCoverColor || 'Std'}</span>
                </div>
                <div className="col-span-2 p-2 bg-white border border-slate-200 rounded">
                  <span className="block text-[9px] text-slate-400 uppercase">AV / Equipment</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.keys(avMap).map(k => data.avRequirements?.[k] && (
                      <span key={k} className="px-1.5 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">{avMap[k]}</span>
                    ))}
                    {(!data.avRequirements || Object.values(data.avRequirements).every(v => !v)) && <span>Standard Setup</span>}
                  </div>
                </div>
                {data.otherNotes && (
                  <div className="col-span-2 mt-2 pt-2 border-t border-slate-100">
                    <span className="block text-[9px] text-red-500 font-bold uppercase mb-1">Remarks / Attention</span>
                    <p className="font-bold text-slate-900">{data.otherNotes}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-auto pt-4 border-t-2 border-slate-100 text-[10px] text-slate-400 flex justify-between">
          <span>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
          <span>Ref: {data.orderId}</span>
        </div>

      </div>
    );
  }

  // ==========================================
  // VIEW 2: QUOTATION MODE (EN) - FIXED TOTALS & STYLING
  // ==========================================
  if (printMode === 'QUOTATION') {
    const BRAND_COLOR = '#A57C00';

    // 🌟 1. CALL THE MASTER CALCULATOR
    const billing = generateBillingSummary(data);

    // 🌟 2. Generate Clean English Strings for Selected Packages
    const getEquipmentEnStr = () => {
      let items = Object.entries(data.equipment || {}).filter(([k, v]) => v === true && typeof equipmentMap !== 'undefined' && equipmentMap[k]).map(([k]) => {
        const match = equipmentMap[k].match(/\((.*?)\)/);
        return match ? match[1] : equipmentMap[k];
      });
      if (data.equipment?.nameSign && data.nameSignText) items.push(`Name Sign: ${data.nameSignText}`);
      if (data.equipment?.hasCake && data.cakePounds) items.push(`Wedding Cake: ${data.cakePounds} Lbs`);
      return items.join(', ');
    };

    const getAVEnStr = () => {
      return Object.entries(data.equipment || {}).filter(([k, v]) => v === true && typeof avMap !== 'undefined' && avMap[k]).map(([k]) => {
        const match = avMap[k].match(/\((.*?)\)/);
        return match ? match[1] : avMap[k];
      }).join(', ');
    };

    const getDecorEnStr = () => {
      let items = Object.entries(data.decoration || {}).filter(([k, v]) => v === true && typeof decorationMap !== 'undefined' && decorationMap[k]).map(([k]) => {
        const match = decorationMap[k].match(/\((.*?)\)/);
        return match ? match[1] : decorationMap[k];
      });
      if (data.decoration?.hasFlowerPillar && data.flowerPillarQty) items.push(`Floral Pillars: ${data.flowerPillarQty}`);
      if (data.decoration?.hasMahjong && data.mahjongTableQty) items.push(`Mahjong: ${data.mahjongTableQty} sets`);
      if (data.decoration?.hasInvitation && data.invitationQty) items.push(`Invitations: ${data.invitationQty} sets`);
      if (data.decoration?.hasCeremonyChair && data.ceremonyChairQty) items.push(`Ceremony Chairs: ${data.ceremonyChairQty}`);
      return items.join(', ');
    };

    const setupStrEn = getEquipmentEnStr();
    const avStrEn = getAVEnStr();
    const decorStrEn = getDecorEnStr();

    // --- DATE LOGIC ---
    let balanceDueDateDisplay = '';
    if (data.balanceDueDateType === 'manual' && data.balanceDueDateOverride) {
      balanceDueDateDisplay = data.balanceDueDateOverride;
    } else if (data.balanceDueDateType === '10daysPrior' && data.date) {
      const d = new Date(data.date);
      d.setDate(d.getDate() - 10);
      balanceDueDateDisplay = !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : 'Check Date';
    } else {
      balanceDueDateDisplay = data.date || 'Event Day';
    }

    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white p-6 min-h-screen relative flex flex-col">
        <style>{`
            @media print { 
              @page { 
                margin: 10mm; 
                size: A4; 
                @bottom-left { content: "${data.eventName || ''}"; font-size: 9px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; }
                @bottom-center { content: "${data.orderId}"; font-size: 10px; font-weight: bold; color: #000; font-family: monospace; }
                @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #94a3b8; font-family: sans-serif; }
              } 
              body { -webkit-print-color-adjust: exact; } 
            }
          `}</style>

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
              <div className="py-4 text-xs text-slate-400 italic">(Client details hidden)</div>
            )}
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-1 border-b border-slate-200 pb-0.5">Event Details</h3>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              <span className="text-slate-500">Event:</span><span className="font-bold text-slate-900">{data.eventName}</span>
              <span className="text-slate-500">Date:</span><span className="font-bold text-slate-900">{formatDateEn(data.date)}</span>
              <span className="text-slate-500">Time:</span><span className="font-bold text-slate-900">{data.startTime} - {data.endTime}</span>
              <span className="text-slate-500">Venue:</span><span className="font-bold text-slate-900">{getVenueEn(data.venueLocation)}</span>
              <span className="text-slate-500">Guests:</span><span className="font-bold text-slate-900">{data.guestCount} Pax / {data.tableCount} Tables</span>
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
              {/* 1. MENUS */}
              {billing.parsedMenus.map((m, i) => (
                <tr key={`m-${i}`}>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900 mb-0.5">{m.title}</p>
                    <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">{onlyChinese(m.content)}</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(m.cleanPrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">{m.cleanQty}</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(m.amount)}</td>
                </tr>
              ))}

              {/* 2. PLATING FEE */}
              {billing.plating && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900">Plating Service Fee (位上服務費)</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.plating.price)}</td>
                  <td className="py-2 text-center align-top text-slate-600">{billing.plating.qty}</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.plating.amount)}</td>
                </tr>
              )}

              {/* 3. BEVERAGE PACKAGE */}
              {billing.drinks && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900 mb-0.5">Beverage Package</p>
                    <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">{billing.drinks.label}</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.drinks.price)}</td>
                  <td className="py-2 text-center align-top text-slate-600">{billing.drinks.qty}</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.drinks.amount)}</td>
                </tr>
              )}

              {/* 🌟 4. NEW CATEGORY PACKAGES FOR QUOTATION 🌟 */}
              {billing.setupPackagePrice > 0 && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900 mb-0.5">Setup & Reception Package</p>
                    <p className="text-[10px] text-slate-500 leading-snug">{setupStrEn}</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.setupPackagePrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">1</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.setupPackagePrice)}</td>
                </tr>
              )}

              {billing.avPackagePrice > 0 && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900 mb-0.5">AV Equipment Package</p>
                    <p className="text-[10px] text-slate-500 leading-snug">{avStrEn}</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.avPackagePrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">1</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.avPackagePrice)}</td>
                </tr>
              )}

              {billing.decorPackagePrice > 0 && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900 mb-0.5">Venue Decoration Package</p>
                    <p className="text-[10px] text-slate-500 leading-snug">{decorStrEn}</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.decorPackagePrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">1</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.decorPackagePrice)}</td>
                </tr>
              )}

              {/* 5. BUS ARRANGEMENT */}
              {billing.bus && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900 mb-0.5">Bus Arrangement (旅遊巴安排)</p>
                    <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">
                      {billing.bus.arrivals.length > 0 && `Arrivals: ${billing.bus.arrivals.length} Buses `}
                      {billing.bus.departures.length > 0 && `| Departures: ${billing.bus.departures.length} Buses`}
                    </p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.bus.amount)}</td>
                  <td className="py-2 text-center align-top text-slate-600">1</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">
                    {billing.bus.amount > 0 ? `$${formatMoney(billing.bus.amount)}` : 'FREE'}
                  </td>
                </tr>
              )}

              {/* 6. CUSTOM ITEMS */}
              {billing.parsedCustomItems.map((item, i) => (
                <tr key={`c-${i}`}>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900">{item.name}</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(item.cleanPrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">{item.cleanQty}</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-6 break-inside-avoid">
          <div className="w-1/2 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono">${formatMoney(billing.subtotal)}</span>
            </div>
            {billing.serviceChargeVal > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Service Charge (10%)</span>
                <span className="font-mono">+${formatMoney(billing.serviceChargeVal)}</span>
              </div>
            )}
            {billing.discountVal > 0 && (
              <div className="flex justify-between text-xs font-bold" style={{ color: BRAND_COLOR }}>
                <span>Discount</span>
                <span className="font-mono">-${formatMoney(billing.discountVal)}</span>
              </div>
            )}

            {/* Credit Card Surcharge Row */}
            {billing.ccSurcharge > 0 && (
              <div className="flex justify-between text-xs text-slate-600 font-bold">
                <span>Credit Card Surcharge (3%)</span>
                <span className="font-mono">+${formatMoney(billing.ccSurcharge)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="font-bold text-sm">Grand Total (HKD)</span>
              <span className="font-black text-xl font-mono">${formatMoney(billing.grandTotal)}</span>
            </div>

            {/* Payment Schedule */}
            {billing.grandTotal > 0 && (
              <div className="mt-4 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Schedule</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Due Date</span>
                </div>
                <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-100">
                  {[
                    { label: '1st Payment', date: data.deposit1Date, amount: billing.dep1 },
                    { label: '2nd Payment', date: data.deposit2Date, amount: billing.dep2 },
                    { label: '3rd Payment', date: data.deposit3Date, amount: billing.dep3 },
                  ].map((item, idx) => (
                    item.amount > 0 && (
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

                  {/* Final Balance */}
                  <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1">
                    <span className="text-slate-600 font-bold">Final Balance</span>
                    <div className="text-right">
                      <span className="font-mono font-bold mr-4 text-slate-700">
                        ${formatMoney(billing.balanceDue)}
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
            1. This quotation is valid for 14 days.<br />
            2. Cheques should be made payable to "best wish investment limited".<br />
            3. A 3% surcharge will be applied to all credit card payments.<br />
            4. This document is computer generated. No signature is required.
          </div>
          <div className="w-1/3 text-right">
            <div className="border-b border-slate-800 mb-2"></div>
            <p className="font-bold text-xs text-left">Confirmed & Accepted by</p>
            <p className="text-[10px] text-slate-500 mt-0.5 text-left">{data.clientName}</p>
            <p className="text-[8px] text-slate-300 mt-4 no-print">Page 1 of 1</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 4 & 5: CONTRACT MODE (EN & CHINESE) - REFINED VERSION
  // ==========================================
  if (printMode === 'CONTRACT' || printMode === 'CONTRACT_CN') {
    const isEn = printMode === 'CONTRACT';
    const BRAND_COLOR = '#A57C00';
    const minSpendInfo = data.minSpendInfo || null;

    // 🌟 Master Calculator
    const billing = generateBillingSummary(data);

    // 🌟 2. Generate Clean Strings for Selected Packages (Bilingual)
    const getEquipmentStr = (en) => {
      let items = Object.entries(data.equipment || {}).filter(([k, v]) => v === true && typeof equipmentMap !== 'undefined' && equipmentMap[k]).map(([k]) => {
        const fullStr = equipmentMap[k];
        const match = fullStr.match(/\((.*?)\)/);
        return en && match ? match[1] : fullStr.split(' (')[0];
      });
      if (data.equipment?.nameSign && data.nameSignText) items.push(en ? `Name Sign: ${data.nameSignText}` : `字牌: ${data.nameSignText}`);
      if (data.equipment?.hasCake && data.cakePounds) items.push(en ? `Cake: ${data.cakePounds} Lbs` : `蛋糕: ${data.cakePounds}磅`);
      return items.join(', ');
    };

    const getAVStr = (en) => {
      return Object.entries(data.equipment || {}).filter(([k, v]) => v === true && typeof avMap !== 'undefined' && avMap[k]).map(([k]) => {
        const fullStr = avMap[k];
        const match = fullStr.match(/\((.*?)\)/);
        return en && match ? match[1] : fullStr.split(' (')[0];
      }).join(', ');
    };

    const getDecorStr = (en) => {
      let items = Object.entries(data.decoration || {}).filter(([k, v]) => v === true && typeof decorationMap !== 'undefined' && decorationMap[k]).map(([k]) => {
        const fullStr = decorationMap[k];
        const match = fullStr.match(/\((.*?)\)/);
        return en && match ? match[1] : fullStr.split(' (')[0];
      });
      if (data.decoration?.hasFlowerPillar && data.flowerPillarQty) items.push(en ? `Pillars: ${data.flowerPillarQty}` : `花柱: ${data.flowerPillarQty}支`);
      if (data.decoration?.hasMahjong && data.mahjongTableQty) items.push(en ? `Mahjong: ${data.mahjongTableQty}` : `麻雀: ${data.mahjongTableQty}張`);
      if (data.decoration?.hasInvitation && data.invitationQty) items.push(en ? `Invitations: ${data.invitationQty}` : `喜帖: ${data.invitationQty}套`);
      if (data.decoration?.hasCeremonyChair && data.ceremonyChairQty) items.push(en ? `Chairs: ${data.ceremonyChairQty}` : `婚椅: ${data.ceremonyChairQty}張`);
      return items.join(', ');
    };

    const setupStr = getEquipmentStr(isEn);
    const avStr = getAVStr(isEn);
    const decorStr = getDecorStr(isEn);

    // Date logic for Balance Due
    let balanceDueDateDisplay = data.date;
    if (data.balanceDueDateType === 'manual' && data.balanceDueDateOverride) {
      balanceDueDateDisplay = data.balanceDueDateOverride;
    } else if (data.balanceDueDateType === '10daysPrior' && data.date) {
      const d = new Date(data.date);
      d.setDate(d.getDate() - 10);
      if (!isNaN(d.getTime())) balanceDueDateDisplay = d.toISOString().split('T')[0];
    }

    const SectionHeader = ({ title }) => (
      <div className="mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] pb-1 border-b-2 inline-block" style={{ color: BRAND_COLOR, borderColor: BRAND_COLOR }}>
          {title}
        </h3>
      </div>
    );

    return (
      <div className="font-sans text-slate-800 max-w-[210mm] mx-auto bg-white p-8 min-h-screen relative flex flex-col text-xs leading-relaxed">
        <style>{`
          @media print { 
            @page { margin: 10mm 15mm; size: A4; } 
            body { -webkit-print-color-adjust: exact; } 
            .page-break { page-break-before: always; }
            .legal-text { font-size: 8.5px; text-align: justify; line-height: 1.5; color: #475569; }
            .legal-header { font-weight: 800; margin-bottom: 3px; font-size: 9.5px; color: #1e293b; }
          }
        `}</style>

        {/* --- COMPACT HEADER --- */}
        <div className="flex justify-between items-start border-b pb-3 mb-6 border-slate-200">
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-2xl font-black tracking-tight leading-none" style={{ color: BRAND_COLOR }}>璟瓏軒</span>
              <span className="text-xs font-bold tracking-widest uppercase text-slate-400">King Lung Heen</span>
            </div>
            <div className="text-[8px] text-slate-400 font-medium uppercase tracking-tight">
              4/F, HK Palace Museum, West Kowloon <span className="mx-1">|</span> Tel: 2788 3939 <span className="mx-1">|</span> banquet@kinglungheen.com
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-700 font-mono tracking-tighter">REF: {data.orderId}</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest">{formatDateEn(new Date())}</div>
          </div>
        </div>

        {/* --- CENTERED WELCOMING SECTION --- */}
        <div className="mb-10 text-center mx-auto max-w-2xl">
          <h1 className="text-2xl font-light text-slate-800 uppercase tracking-[0.3em] mb-3">
            {isEn ? 'Banquet Agreement' : '宴會服務合約'}
          </h1>
          <div className="w-12 h-0.5 mx-auto mb-4" style={{ backgroundColor: BRAND_COLOR }}></div>
          <p className="text-[11px] text-slate-600 leading-relaxed italic px-4">
            {isEn
              ? `Thank you for choosing King Lung Heen as your event venue. We are truly honored to be part of your upcoming special occasion and are committed to providing you and your guests with an exceptional experience. This agreement outlines the confirmed arrangements and terms for your event, "${data.eventName || 'the event'}", to be held on ${formatDateEn(data.date)}.`
              : `感謝閣下選擇璟瓏軒作為您的宴會場地。我們深感榮幸能參與您的重要時刻，並承諾為您及賓客提供最優質的餐飲體驗。本合約旨在確認將於 ${formatDateEn(data.date)} 舉行的「${data.eventName || '閣下宴會'}」之相關安排與條款。`}
          </p>
        </div>

        {/* --- SECTION 1: EVENT PARTICULARS --- */}
        <div className="mb-8">
          <SectionHeader title={isEn ? 'Event Particulars' : '活動資料'} />
          <div className="bg-slate-50/80 px-4 py-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{isEn ? 'Client Name' : '客戶名稱'}</span>
              <span className="font-bold text-[11px] text-slate-900">{data.clientName}</span>
            </div>
            <div className="text-right">
              <span className="block text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{isEn ? 'Contact' : '聯絡電話'}</span>
              <span className="font-bold text-[11px] text-slate-900">{data.clientPhone}</span>
            </div>
            <div>
              <span className="block text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{isEn ? 'Date & Time' : '日期及時間'}</span>
              <span className="font-bold text-[11px] text-slate-900">{formatDateEn(data.date)} <span className="text-slate-300 mx-1">|</span> {data.startTime} - {data.endTime}</span>
            </div>
            <div className="text-right">
              <span className="block text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{isEn ? 'Venue & Attendance' : '場地及人數'}</span>
              <span className="font-bold text-[11px] text-slate-900">{getVenueEn(data.venueLocation)} <span className="text-slate-300 mx-1">|</span> {data.tableCount} {isEn ? 'Tables' : '席'} / {data.guestCount} {isEn ? 'Pax' : '位'}</span>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: MENU & ARRANGEMENTS --- */}
        <div className="mb-8 break-inside-avoid">
          <SectionHeader title={isEn ? 'Menu & Arrangements' : '餐單與佈置安排'} />
          <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-100 grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-[10px] uppercase tracking-widest border-b border-slate-200 pb-1">{isEn ? 'Food & Beverage' : '餐飲內容'}</h4>
              <div className="space-y-4">
                {data.menus && data.menus.map((m, i) => (
                  <div key={i} className="pl-1">
                    <p className="font-bold text-xs text-slate-800 mb-1">{m.title}</p>
                    <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                ))}
                {data.drinksPackage && (
                  <div className="pl-1 pt-2 border-t border-slate-200/50">
                    <p className="font-bold text-xs text-slate-800 mb-1">{isEn ? 'Beverage Package' : '酒水套餐'}</p>
                    <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-relaxed">{data.drinksPackage}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-[10px] uppercase tracking-widest border-b border-slate-200 pb-1">{isEn ? 'Setup & Logistics' : '場地與物流設置'}</h4>
              <div className="space-y-4 text-[10px] text-slate-700">
                <div className="flex gap-4">
                  <div className="flex-1 border-b border-slate-200 pb-1"><span className="block text-[8px] text-slate-400 uppercase font-bold mb-0.5">{isEn ? 'Table Cloth' : '檯布顏色'}</span><span className="font-bold text-slate-800 text-[11px]">{data.tableClothColor || 'Standard'}</span></div>
                  <div className="flex-1 border-b border-slate-200 pb-1"><span className="block text-[8px] text-slate-400 uppercase font-bold mb-0.5">{isEn ? 'Chair Cover' : '椅套顏色'}</span><span className="font-bold text-slate-800 text-[11px]">{data.chairCoverColor || 'Standard'}</span></div>
                </div>

                <div className="border-b border-slate-200 pb-1">
                  <span className="block text-[8px] text-slate-400 uppercase font-bold mb-0.5">{isEn ? 'Bridal / Changing Room' : '新娘 / 更衣室'}</span>
                  <span className="font-medium text-slate-800 text-[11px]">{data.bridalRoom ? `${isEn ? 'Reserved' : '使用'} ${data.bridalRoomHours ? `(${data.bridalRoomHours})` : ''}` : (isEn ? 'Not Required' : '不適用')}</span>
                </div>

                <div className="border-b border-slate-200 pb-1">
                  <span className="block text-[8px] text-slate-400 uppercase font-bold mb-0.5">{isEn ? 'Equipment & Decor' : '器材與佈置'}</span>
                  <p className="leading-snug font-medium text-slate-800 text-[11px]">
                    {[setupStr, avStr, decorStr].filter(Boolean).join(' / ') || (isEn ? 'Standard Setup' : '標準設置')}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="block text-[8px] text-slate-400 uppercase font-bold mb-1">{isEn ? 'Logistics & Remarks' : '物流與備註'}</span>
                  <p className="text-slate-700 text-[11px] leading-tight"><span className="text-slate-400">{isEn ? 'Free Parking:' : '免費泊車:'}</span> <span className="font-bold">{data.parkingInfo?.ticketQty || 0}</span> {isEn ? 'tickets' : '張'} x <span className="font-bold">{data.parkingInfo?.ticketHours || 0}</span> {isEn ? 'hrs' : '小時'}</p>
                  {data.busInfo?.enabled && (
                    <p className="text-slate-700 text-[11px] leading-tight">
                      <span className="text-slate-400 font-bold">{isEn ? 'Bus Arranged:' : '旅遊巴安排:'}</span> {data.busInfo.arrivals?.length || 0} {isEn ? 'Arrival' : '接載'}, {data.busInfo.departures?.length || 0} {isEn ? 'Departure' : '散席'}
                    </p>
                  )}
                  {data.otherNotes && <p className="text-slate-700 text-[11px] leading-tight"><span className="text-slate-400 font-bold">{isEn ? 'Remarks:' : '備註:'}</span> {data.otherNotes}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- SECTION 3: FINANCIALS & PAYMENT --- */}
        <div className="space-y-6 break-inside-avoid">
          <div className="w-full">
            <SectionHeader title={isEn ? 'Charges Detail' : '費用明細'} />
            <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-100">
              <div className="flex text-[8px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">
                <div className="flex-1">{isEn ? 'Item Description' : '項目'}</div>
                <div className="w-24 text-right">{isEn ? 'Unit Rate' : '單價'}</div>
                <div className="w-20 text-center">{isEn ? 'Quantity' : '數量'}</div>
                <div className="w-24 text-right">{isEn ? 'Amount' : '金額'}</div>
              </div>

              <div className="space-y-2.5 mb-4">
                {billing.parsedMenus.map((m, i) => (
                  <div key={`m-${i}`} className="flex text-[11px] items-baseline">
                    <div className="flex-1 pr-4 font-bold text-slate-800 leading-snug">{m.title}</div>
                    <div className="w-24 text-right font-mono text-slate-500">${formatMoney(m.cleanPrice)}</div>
                    <div className="w-20 text-center text-slate-600">{m.cleanQty}</div>
                    <div className="w-24 text-right font-mono font-bold text-slate-900">${formatMoney(m.amount)}</div>
                  </div>
                ))}

                {billing.plating && (
                  <div className="flex text-[11px] items-baseline text-slate-700">
                    <div className="flex-1 pr-4 font-medium">{isEn ? 'Plating Service Fee' : '位上服務費'}</div>
                    <div className="w-24 text-right font-mono text-slate-500">${formatMoney(billing.plating.price)}</div>
                    <div className="w-20 text-center text-slate-600">{billing.plating.qty}</div>
                    <div className="w-24 text-right font-mono font-bold">${formatMoney(billing.plating.amount)}</div>
                  </div>
                )}

                {billing.drinks && (
                  <div className="flex text-[11px] items-baseline text-slate-700">
                    <div className="flex-1 pr-4 font-medium">{billing.drinks.label}</div>
                    <div className="w-24 text-right font-mono text-slate-500">${formatMoney(billing.drinks.price)}</div>
                    <div className="w-20 text-center text-slate-600">{billing.drinks.qty}</div>
                    <div className="w-24 text-right font-mono font-bold">${formatMoney(billing.drinks.amount)}</div>
                  </div>
                )}

                {/* 🌟 NEW PACKAGES 🌟 */}
                {billing.setupPackagePrice > 0 && (
                  <div className="flex text-[11px] items-baseline text-slate-700">
                    <div className="flex-1 pr-4 font-medium">
                      {isEn ? 'Setup & Reception Package' : '舞台與接待設備套票'}
                      <div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{setupStr}</div>
                    </div>
                    <div className="w-24 text-right font-mono text-slate-500">${formatMoney(billing.setupPackagePrice)}</div>
                    <div className="w-20 text-center text-slate-600">1</div>
                    <div className="w-24 text-right font-mono font-bold">${formatMoney(billing.setupPackagePrice)}</div>
                  </div>
                )}

                {billing.avPackagePrice > 0 && (
                  <div className="flex text-[11px] items-baseline text-slate-700">
                    <div className="flex-1 pr-4 font-medium">
                      {isEn ? 'AV Equipment Package' : '影音設備套票'}
                      <div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{avStr}</div>
                    </div>
                    <div className="w-24 text-right font-mono text-slate-500">${formatMoney(billing.avPackagePrice)}</div>
                    <div className="w-20 text-center text-slate-600">1</div>
                    <div className="w-24 text-right font-mono font-bold">${formatMoney(billing.avPackagePrice)}</div>
                  </div>
                )}

                {billing.decorPackagePrice > 0 && (
                  <div className="flex text-[11px] items-baseline text-slate-700">
                    <div className="flex-1 pr-4 font-medium">
                      {isEn ? 'Venue Decoration Package' : '場地佈置套票'}
                      <div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{decorStr}</div>
                    </div>
                    <div className="w-24 text-right font-mono text-slate-500">${formatMoney(billing.decorPackagePrice)}</div>
                    <div className="w-20 text-center text-slate-600">1</div>
                    <div className="w-24 text-right font-mono font-bold">${formatMoney(billing.decorPackagePrice)}</div>
                  </div>
                )}

                {billing.bus && (
                  <div className="flex text-[11px] items-baseline text-slate-700">
                    <div className="flex-1 pr-4 font-medium">{isEn ? 'Bus Arrangement' : '旅遊巴安排'}</div>
                    <div className="w-24 text-right font-mono text-slate-500">${formatMoney(billing.bus.amount)}</div>
                    <div className="w-20 text-center text-slate-600">1</div>
                    <div className="w-24 text-right font-mono font-bold">{billing.bus.amount > 0 ? `$${formatMoney(billing.bus.amount)}` : (isEn ? 'COMP' : '免費')}</div>
                  </div>
                )}

                {billing.parsedCustomItems.map((item, i) => (
                  <div key={`c-${i}`} className="flex text-[11px] items-baseline text-slate-700">
                    <div className="flex-1 pr-4 font-medium">{item.name}</div>
                    <div className="w-24 text-right font-mono text-slate-500">${formatMoney(item.cleanPrice)}</div>
                    <div className="w-20 text-center text-slate-600">{item.cleanQty}</div>
                    <div className="w-24 text-right font-mono font-bold">${formatMoney(item.amount)}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 flex justify-end">
                <div className="w-64 space-y-1.5 text-[10px]">
                  <div className="flex justify-between text-slate-500"><span>{isEn ? 'Subtotal' : '小計'}</span><span className="font-mono">${formatMoney(billing.subtotal)}</span></div>
                  {billing.serviceChargeVal > 0 && <div className="flex justify-between text-slate-500"><span>{isEn ? `Service Charge (10%)` : `服務費 (10%)`}</span><span className="font-mono">+${formatMoney(billing.serviceChargeVal)}</span></div>}
                  {billing.discountVal > 0 && <div className="flex justify-between text-red-600 font-bold"><span>{isEn ? 'Discount' : '折扣'}</span><span className="font-mono">-${formatMoney(billing.discountVal)}</span></div>}
                  {billing.ccSurcharge > 0 && <div className="flex justify-between text-slate-600 font-bold"><span>{isEn ? 'Credit Card Surcharge (3%)' : '信用卡附加費 (3%)'}</span><span className="font-mono">+${formatMoney(billing.ccSurcharge)}</span></div>}
                  <div className="flex justify-between items-center text-sm font-black border-t-2 border-slate-800 pt-2 mt-2 text-slate-900 uppercase">
                    <span className="tracking-tight">{isEn ? 'Estimated Total' : '總金額'}</span>
                    <span className="font-mono text-lg">${formatMoney(billing.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full">
            <SectionHeader title={isEn ? 'Payment Schedule' : '付款時間表'} />
            <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <table className="w-full text-left">
                  <thead><tr className="text-[8px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200"><th className="pb-2">{isEn ? 'Installment' : '期數'}</th><th className="pb-2">{isEn ? 'Due Date' : '付款日期'}</th><th className="pb-2 text-right">{isEn ? 'Amount' : '金額'}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { l: isEn ? 'Initial Payment' : '第一期訂金', a: billing.dep1, d: data.deposit1Date },
                      { l: isEn ? 'Second Payment' : '第二期訂金', a: billing.dep2, d: data.deposit2Date },
                      { l: isEn ? 'Third Payment' : '第三期訂金', a: billing.dep3, d: data.deposit3Date },
                    ].map((item, i) => item.a > 0 && (
                      <tr key={i} className="text-xs">
                        <td className="py-2.5 font-bold text-slate-700">{item.l}</td>
                        <td className="py-2.5 text-slate-500 font-mono">{item.d || 'TBC'}</td>
                        <td className="py-2.5 text-right font-black text-slate-900 font-mono">${formatMoney(item.a)}</td>
                      </tr>
                    ))}
                    <tr className="text-xs">
                      <td className="py-3 font-black text-slate-900">
                        {isEn ? 'Final Balance' : '尾數餘額'}
                        <span className="block text-[8px] text-slate-400 font-normal uppercase mt-0.5">
                          {data.balanceDueDateType === '10daysPrior' ? (isEn ? '10 Days Prior' : '活動前10天') : (isEn ? 'On Event Day' : '活動當日')}
                        </span>
                      </td>
                      <td className="py-3 text-slate-900 font-mono font-bold underline decoration-slate-300 underline-offset-4">{balanceDueDateDisplay}</td>
                      <td className="py-3 text-right font-black text-slate-900 font-mono text-sm underline decoration-slate-300 underline-offset-4">${formatMoney(billing.balanceDue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="w-full md:w-64 border-l border-slate-200 md:pl-8">
                <p className="font-bold text-slate-800 mb-3 text-[9px] uppercase tracking-widest border-b border-slate-200 pb-1">{isEn ? 'Bank Transfer Info' : '銀行轉賬資料'}</p>
                <div className="space-y-2 text-[9px] text-slate-600 leading-tight">
                  <div>
                    <p className="font-bold text-slate-400 uppercase text-[7px] mb-0.5">{isEn ? 'Bank' : '銀行'}</p>
                    <p className="font-medium text-slate-800">Bank of China (HK) <span className="text-slate-400 ml-1">|</span> 璟瓏軒</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 uppercase text-[7px] mb-0.5">{isEn ? 'Account Number' : '戶口號碼'}</p>
                    <p className="font-mono font-black text-slate-900 text-sm">012-875-2-082180-1</p>
                  </div>
                  <p className="pt-2 text-[8px] text-slate-400 italic leading-snug">
                    {isEn ? '* Settlement by cash, credit card or bank transfer only.' : '* 活動當日尾數僅接受現金、信用卡或銀行轉賬。'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="page-break"></div>

        {/* --- PAGE 2: TERMS & CONDITIONS --- */}
        <div className="mt-8 px-4">
          <div className="text-center mb-6">
            <h3 className="inline-block font-black uppercase text-sm tracking-[0.2em] border-b-2 pb-1" style={{ color: BRAND_COLOR, borderColor: BRAND_COLOR }}>
              {isEn ? 'Terms and Conditions' : '條款及細則'}
            </h3>
          </div>

          <div className="columns-2 gap-10 legal-text text-slate-700">
            <div className="legal-header">1. Payment Terms</div>
            <p className="mb-3">
              {isEn
                ? "Payment Methods include Cash, Credit Card, or Bank Transfer (BOC 012-875-2-082180-1). Payments must be paid by the specified due dates. The final balance must be settled immediately upon conclusion. No personal cheques are accepted on the event day."
                : "付款方式包括現金、信用卡或銀行轉賬 (中銀 012-875-2-082180-1)。訂金須於指定日期前支付，尾數須於宴會結束後即時結清。恕不接受宴會當日以個人支票支付尾數。"}
            </p>

            <div className="legal-header">2. Postponement & Cancellation</div>
            <p className="mb-3">
              {isEn
                ? "Events may be postponed once with >3 months notice. Cancellation forfeit depends on notice: Confirmed period (1st & 2nd payment); 1 month prior (90% min spend); 1 week prior (100% min spend)."
                : "活動可於3個月前通知下延期一次。取消罰則：確認期內（扣除第一及二期訂金）；活動前1個月（扣除最低消費90%）；活動前1週（扣除最低消費100%）。"}
            </p>

            <div className="legal-header">3. Weather Policy</div>
            <p className="mb-3">
              {isEn
                ? "In Signal 8 or Black Rain, the event may be rescheduled within 3 months. In Signal 3 or Red/Yellow Rain, the event proceeds as scheduled; cancellation is treated as standard."
                : "八號風球或黑雨警告下，活動可於3個月內延期。三號風球或紅/黃雨警告下，活動如常舉行；如取消將視作一般取消處理。"}
            </p>

            <div className="legal-header">4. House Rules</div>
            <p className="mb-3">
              {isEn
                ? "No outside food/drink without consent. Decorations must only use 'Blu-tack'. Smoking is prohibited. The Venue reserves the right to stop unsafe activities."
                : "未經許可不得自攜飲食。佈置僅限使用寶貼(Blu-tack)。全場禁煙。場地保留終止不安全活動之權利。"}
            </p>

            <div className="legal-header">5. Liability</div>
            <p className="mb-3">
              {isEn
                ? "The Client is liable for damages caused by guests or contractors and agrees to indemnify the venue against losses arising from the event."
                : "客戶須對賓客或承辦商造成之損壞負責，並同意賠償因活動引起之場地損失。"}
            </p>

            <div className="legal-header">6. Force Majeure</div>
            <p className="mb-3">
              {isEn
                ? "If the event is cancelled due to government restrictions or acts of God, a full refund or free rescheduling will be offered."
                : "如因政府禁令或不可抗力導致活動取消，場地將提供全數退款或免費延期。"}
            </p>

            <div className="legal-header">7. General</div>
            <p className="mb-3">
              {isEn
                ? "Governed by HK laws. Terms are confidential. Credit card payments incur a 3% surcharge."
                : "受香港法律管轄。條款內容保密。信用卡付款需加收3%附加費。"}
            </p>
          </div>
        </div>

        {/* --- SIGNATURE SECTION --- */}
        <div className="mt-12 px-8 pt-8 border-t-2 border-slate-200 break-inside-avoid bg-slate-50/50 rounded-t-2xl">
          <p className="text-[10px] font-bold mb-4 tracking-widest text-slate-500 uppercase">{isEn ? 'Acknowledgement & Agreement' : '確認條款及簽署'}</p>
          <div className="grid grid-cols-2 gap-20">
            <div>
              <div className="border-b border-slate-400 h-16 mb-3"></div>
              <p className="font-bold text-xs text-slate-800 tracking-wide">{isEn ? 'For and on behalf of' : '璟瓏軒 代表'}<br />
                <span className="text-sm font-black text-slate-900 uppercase">KING LUNG HEEN</span>
              </p>
              <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">{isEn ? 'Authorized Signature & Chop' : '授權簽署及蓋章'}</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-16 mb-3"></div>
              <p className="font-bold text-xs text-slate-800 tracking-wide">{isEn ? 'Confirmed & Accepted by' : '客戶確認'}<br />
                <span className="text-sm font-black text-slate-900 uppercase">{data.clientName}</span>
              </p>
              <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">{isEn ? 'Client Signature / Company Chop' : '客戶簽署 / 公司蓋章'}</p>
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

    // 🌟 CALL THE MASTER CALCULATOR ONCE! 🌟
    const billing = generateBillingSummary(data);

    // 🌟 Generate Clean English Strings for Selected Packages
    const getEquipmentEnStr = () => {
      let items = Object.entries(data.equipment || {}).filter(([k, v]) => v === true && typeof equipmentMap !== 'undefined' && equipmentMap[k]).map(([k]) => {
        const match = equipmentMap[k].match(/\((.*?)\)/);
        return match ? match[1] : equipmentMap[k];
      });
      if (data.equipment?.nameSign && data.nameSignText) items.push(`Name Sign: ${data.nameSignText}`);
      if (data.equipment?.hasCake && data.cakePounds) items.push(`Wedding Cake: ${data.cakePounds} Lbs`);
      return items.join(', ');
    };

    const getAVEnStr = () => {
      return Object.entries(data.equipment || {}).filter(([k, v]) => v === true && typeof avMap !== 'undefined' && avMap[k]).map(([k]) => {
        const match = avMap[k].match(/\((.*?)\)/);
        return match ? match[1] : avMap[k];
      }).join(', ');
    };

    const getDecorEnStr = () => {
      let items = Object.entries(data.decoration || {}).filter(([k, v]) => v === true && typeof decorationMap !== 'undefined' && decorationMap[k]).map(([k]) => {
        const match = decorationMap[k].match(/\((.*?)\)/);
        return match ? match[1] : decorationMap[k];
      });
      if (data.decoration?.hasFlowerPillar && data.flowerPillarQty) items.push(`Floral Pillars: ${data.flowerPillarQty}`);
      if (data.decoration?.hasMahjong && data.mahjongTableQty) items.push(`Mahjong: ${data.mahjongTableQty} sets`);
      if (data.decoration?.hasInvitation && data.invitationQty) items.push(`Invitations: ${data.invitationQty} sets`);
      if (data.decoration?.hasCeremonyChair && data.ceremonyChairQty) items.push(`Ceremony Chairs: ${data.ceremonyChairQty}`);
      return items.join(', ');
    };

    const setupStrEn = getEquipmentEnStr();
    const avStrEn = getAVEnStr();
    const decorStrEn = getDecorEnStr();

    // Date Logic
    let balanceDueDateDisplay = data.date;
    if (data.balanceDueDateType === 'manual' && data.balanceDueDateOverride) {
      balanceDueDateDisplay = data.balanceDueDateOverride;
    } else if (data.balanceDueDateType === '10daysPrior' && data.date) {
      const d = new Date(data.date);
      d.setDate(d.getDate() - 10);
      if (!isNaN(d.getTime())) {
        balanceDueDateDisplay = d.toISOString().split('T')[0];
      }
    }

    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white p-8 min-h-screen relative flex flex-col text-xs leading-tight">
        <style>{`@media print { @page { margin: 10mm; size: A4; @bottom-center { content: "${data.orderId}"; font-size: 10px; font-weight: bold; color: #000; font-family: monospace; } } body { -webkit-print-color-adjust: exact; } }`}</style>

        {/* Header */}
        <div className="flex justify-between items-start border-b-4 pb-4 mb-6" style={{ borderColor: BRAND_COLOR }}>
          <div className="max-w-[60%]">
            <div className="mb-1" style={{ color: BRAND_COLOR }}><span className="text-3xl font-black tracking-tight block leading-none">璟瓏軒</span><span className="text-xs font-bold tracking-widest uppercase block mt-1">King Lung Heen</span></div>
            <div className="text-[10px] text-slate-500 mt-2 font-medium"><p>4/F, Hong Kong Palace Museum, 8 Museum Drive, West Kowloon</p><p>Tel: +852 2788 3939 | Email: banquet@kinglungheen.com</p></div>
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-light text-slate-800 uppercase tracking-widest mb-1">INVOICE</h1>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">發票</h2>
            <div className="text-right space-y-1"><p className="text-xs"><span className="font-bold text-slate-600">Invoice No:</span> {data.orderId}</p><p className="text-xs"><span className="font-bold text-slate-600">Date:</span> {formatDateEn(new Date())}</p></div>
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
              <span className="text-slate-500">Event:</span><span className="font-bold">{data.eventName}</span>
              <span className="text-slate-500">Date:</span><span className="font-bold">{formatDateEn(data.date)}</span>
              <span className="text-slate-500">Venue:</span><span className="font-bold">{getVenueEn(data.venueLocation)}</span>
              <span className="text-slate-500">Pax:</span><span className="font-bold">{data.guestCount} Pax / {data.tableCount} Tables</span>
            </div>
          </div>
        </div>

        {/* Item Table (NO MATH REQUIRED HERE) */}
        <div className="mb-6 flex-1">
          <table className="w-full text-xs">
            <thead><tr className="border-b-2 border-slate-800 text-slate-600"><th className="text-left py-1 w-[55%]">Description</th><th className="text-right py-1 w-[15%]">Unit Price</th><th className="text-center py-1 w-[10%]">Qty</th><th className="text-right py-1 w-[20%]">Amount (HKD)</th></tr></thead>
            <tbody className="divide-y divide-slate-100">

              {/* 1. MENUS */}
              {billing.parsedMenus.map((m, i) => (
                <tr key={`m-${i}`}>
                  <td className="py-2 pr-4 align-top"><p className="font-bold text-slate-900">{m.title}</p></td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(m.cleanPrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">{m.cleanQty}</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(m.amount)}</td>
                </tr>
              ))}

              {/* 2. PLATING FEE */}
              {billing.plating && (
                <tr>
                  <td className="py-2 pr-4"><p className="font-bold text-slate-900">Plating Service Fee</p></td>
                  <td className="py-2 text-right font-mono text-slate-600">${formatMoney(billing.plating.price)}</td>
                  <td className="py-2 text-center text-slate-600">{billing.plating.qty}</td>
                  <td className="py-2 text-right font-bold text-slate-900 font-mono">${formatMoney(billing.plating.amount)}</td>
                </tr>
              )}

              {/* 3. BEVERAGE PACKAGE */}
              {billing.drinks && (
                <tr>
                  <td className="py-2 pr-4">
                    <p className="font-bold text-slate-900">Beverage Package</p>
                    <p className="text-[10px] text-slate-500 leading-snug">{billing.drinks.label}</p>
                  </td>
                  <td className="py-2 text-right font-mono text-slate-600 align-top">${formatMoney(billing.drinks.price)}</td>
                  <td className="py-2 text-center text-slate-600 align-top">{billing.drinks.qty}</td>
                  <td className="py-2 text-right font-bold text-slate-900 font-mono align-top">${formatMoney(billing.drinks.amount)}</td>
                </tr>
              )}

              {/* 🌟 4. NEW CATEGORY PACKAGES FOR INVOICE 🌟 */}
              {billing.setupPackagePrice > 0 && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900">Setup & Reception Package</p>
                    <p className="text-[10px] text-slate-500 leading-snug">{setupStrEn}</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.setupPackagePrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">1</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.setupPackagePrice)}</td>
                </tr>
              )}

              {billing.avPackagePrice > 0 && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900">AV Equipment Package</p>
                    <p className="text-[10px] text-slate-500 leading-snug">{avStrEn}</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.avPackagePrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">1</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.avPackagePrice)}</td>
                </tr>
              )}

              {billing.decorPackagePrice > 0 && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900">Venue Decoration Package</p>
                    <p className="text-[10px] text-slate-500 leading-snug">{decorStrEn}</p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.decorPackagePrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">1</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(billing.decorPackagePrice)}</td>
                </tr>
              )}

              {/* 5. BUS ARRANGEMENT */}
              {billing.bus && (
                <tr>
                  <td className="py-2 pr-4 align-top">
                    <p className="font-bold text-slate-900 mb-0.5">Bus Arrangement</p>
                    <p className="text-[10px] text-slate-500 whitespace-pre-wrap leading-snug">
                      {billing.bus.arrivals.length > 0 && `Arrivals: ${billing.bus.arrivals.length} Buses `}
                      {billing.bus.departures.length > 0 && `| Departures: ${billing.bus.departures.length} Buses`}
                    </p>
                  </td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(billing.bus.amount)}</td>
                  <td className="py-2 text-center align-top text-slate-600">1</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">
                    {billing.bus.amount > 0 ? `$${formatMoney(billing.bus.amount)}` : 'FREE'}
                  </td>
                </tr>
              )}

              {/* 6. CUSTOM ITEMS */}
              {billing.parsedCustomItems.map((item, i) => (
                <tr key={`c-${i}`}>
                  <td className="py-2 pr-4 align-top"><p className="font-bold text-slate-900">{item.name}</p></td>
                  <td className="py-2 text-right align-top font-mono text-slate-600">${formatMoney(item.cleanPrice)}</td>
                  <td className="py-2 text-center align-top text-slate-600">{item.cleanQty}</td>
                  <td className="py-2 text-right align-top font-bold text-slate-900 font-mono">${formatMoney(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end mb-8 border-t border-slate-200 pt-6 break-inside-avoid">
          <div className="flex-1 space-y-1.5 text-right w-1/2">
            <div className="flex justify-between text-xs text-slate-600"><span>Subtotal</span><span className="font-mono">${formatMoney(billing.subtotal)}</span></div>
            {billing.serviceChargeVal > 0 && <div className="flex justify-between text-xs text-slate-600"><span>Service Charge (10%)</span><span className="font-mono">+${formatMoney(billing.serviceChargeVal)}</span></div>}
            {billing.discountVal > 0 && <div className="flex justify-between text-xs text-red-600 font-bold"><span>Discount</span><span className="font-mono">-${formatMoney(billing.discountVal)}</span></div>}
            {billing.ccSurcharge > 0 && <div className="flex justify-between text-xs text-slate-600 font-bold"><span>Credit Card Surcharge (3%)</span><span className="font-mono">+${formatMoney(billing.ccSurcharge)}</span></div>}

            <div className="border-t border-slate-800 my-2"></div>

            <div className="flex justify-between text-base font-bold text-slate-900"><span>Total Amount</span><span className="font-mono">${formatMoney(billing.grandTotal)}</span></div>
            <div className="flex justify-between text-xs text-emerald-600 font-bold mt-2"><span>Less: Paid Amount</span><span className="font-mono">-${formatMoney(billing.totalPaid)}</span></div>

            <div className="border-t-2 border-slate-800 mt-2 pt-2">
              <div className="flex justify-between text-xl font-black text-slate-900"><span>TOTAL DUE</span><span className="font-mono">${formatMoney(billing.balanceDue > 0 ? billing.balanceDue : 0)}</span></div>
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
  // VIEW: RECEIPT MODE (NEW)
  // ==========================================
  if (printMode === 'RECEIPT') {
    const BRAND_COLOR = '#A57C00';
    const billing = generateBillingSummary(data);

    // Calculate actual received payments dynamically
    const paidItems = [];
    let totalPaid = 0;

    if (data.deposit1Received && safeFloat(data.deposit1) > 0) {
      totalPaid += safeFloat(data.deposit1);
      paidItems.push({ label: '第一期訂金 (1st Deposit)', amount: safeFloat(data.deposit1), date: data.deposit1Date });
    }
    if (data.deposit2Received && safeFloat(data.deposit2) > 0) {
      totalPaid += safeFloat(data.deposit2);
      paidItems.push({ label: '第二期訂金 (2nd Deposit)', amount: safeFloat(data.deposit2), date: data.deposit2Date });
    }
    if (data.deposit3Received && safeFloat(data.deposit3) > 0) {
      totalPaid += safeFloat(data.deposit3);
      paidItems.push({ label: '第三期訂金 (3rd Deposit)', amount: safeFloat(data.deposit3), date: data.deposit3Date });
    }
    if (data.balanceReceived) {
      // If balance is marked received, calculate exactly how much that remainder was
      const remainder = billing.grandTotal - totalPaid;
      if (remainder > 0) {
        totalPaid += remainder;
        paidItems.push({ label: '尾數結算 (Balance Payment)', amount: remainder, date: data.balanceDate || formatDateEn(new Date()) });
      }
    }

    const isFullyPaid = data.balanceReceived || (totalPaid > 0 && totalPaid >= billing.grandTotal);

    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white p-8 min-h-screen relative flex flex-col text-xs leading-tight">
        <style>{`@media print { @page { margin: 10mm; size: A4; @bottom-center { content: "${data.orderId}"; font-size: 10px; font-weight: bold; color: #000; font-family: monospace; } } body { -webkit-print-color-adjust: exact; } }`}</style>

        {/* 🌟 PAID WATERMARK 🌟 */}
        {isFullyPaid && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 z-0">
            <span className="text-9xl font-black text-emerald-500 border-8 border-emerald-500 rounded-3xl px-12 py-6 rotate-[-15deg] tracking-widest">
              PAID
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start border-b-4 pb-4 mb-6 relative z-10" style={{ borderColor: BRAND_COLOR }}>
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
            <h1 className="text-4xl font-light text-slate-800 uppercase tracking-widest mb-1">RECEIPT</h1>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">官方收據</h2>
            <div className="text-right space-y-1">
              <p className="text-xs"><span className="font-bold text-slate-600">Receipt No:</span> {data.orderId}</p>
              <p className="text-xs"><span className="font-bold text-slate-600">Date:</span> {formatDateEn(new Date())}</p>
            </div>
          </div>
        </div>

        {/* Bill To & Event Info */}
        <div className="flex gap-8 mb-8 bg-slate-50 p-4 rounded border border-slate-100 relative z-10">
          <div className="flex-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Received From (付款人):</h3>
            <p className="font-bold text-sm text-slate-900">{data.clientName}</p>
            {data.companyName && <p className="text-xs text-slate-600">{data.companyName}</p>}
            <p className="text-xs text-slate-500 mt-1">{data.clientPhone}</p>
          </div>
          <div className="flex-1 border-l border-slate-200 pl-8">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Event Details (活動):</h3>
            <div className="grid grid-cols-[60px_1fr] gap-y-1 text-xs">
              <span className="text-slate-500">Event:</span><span className="font-bold">{data.eventName}</span>
              <span className="text-slate-500">Date:</span><span className="font-bold">{formatDateEn(data.date)}</span>
              <span className="text-slate-500">Venue:</span><span className="font-bold">{getVenueEn(data.venueLocation)}</span>
            </div>
          </div>
        </div>

        {/* Payment Breakdown Table */}
        <div className="mb-6 flex-1 relative z-10">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-600">
                <th className="text-left py-2 w-[40%]">Payment Description (付款項目)</th>
                <th className="text-center py-2 w-[30%]">Payment Date (收款日期)</th>
                <th className="text-right py-2 w-[30%]">Amount (金額)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paidItems.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-slate-400 italic">系統中暫無已確認的收款記錄 (No confirmed payments found).</td>
                </tr>
              ) : (
                paidItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 font-bold text-slate-900">{item.label}</td>
                    <td className="py-3 text-center text-slate-600 font-mono">{item.date || '-'}</td>
                    <td className="py-3 text-right font-bold text-slate-900 font-mono">${formatMoney(item.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8 border-t border-slate-200 pt-6 relative z-10 break-inside-avoid">
          <div className="flex-1 space-y-2 text-right w-1/2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Grand Total (活動總額)</span>
              <span className="font-mono">${formatMoney(billing.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-emerald-600 border-b-2 border-slate-800 pb-2">
              <span>Total Received (已收總額)</span>
              <span className="font-mono">${formatMoney(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-red-600 pt-1">
              <span>Balance Due (尚欠尾數)</span>
              <span className="font-mono">${formatMoney(Math.max(0, billing.grandTotal - totalPaid))}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="mt-auto pt-8 border-t border-slate-200 flex justify-between items-end relative z-10">
          <div>
            <p className="text-[10px] text-slate-400 italic">This is a computer-generated receipt. No signature is required.</p>
            <p className="text-[10px] text-slate-400 italic mt-1">此收據由電腦自動生成，毋須簽名。</p>
          </div>
        </div>
      </div>
    );
  }
  // ==========================================
  // VIEW 8: MENU CONFIRMATION (BOXES IN FOOTER)
  // ==========================================
  // ==========================================
  // ==========================================
  // VIEW 8: MENU CONFIRMATION (ORGANIZED FOOTER)
  // ==========================================
  if (printMode === 'MENU_CONFIRM') {
    const BRAND_COLOR = '#A57C00';
    const verNum = (data.menuVersions?.length || 0) + 1;
    const versionLabel = `v${verNum}`;

    const fontSizePx = data.printSettings?.menu?.fontSizeOverride || 18;
    const defaultExpiry = new Date(new Date().setDate(new Date().getDate() + 14)).toLocaleDateString('zh-HK');

    const formatMenuDate = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('zh-HK')} (${d.toLocaleDateString('en-US', { weekday: 'short' })})`;
    };

    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white p-6 h-screen flex flex-col justify-between overflow-hidden relative">
        <style>{`
        @media print { 
          @page { margin: 5mm; size: A4; } 
          body { -webkit-print-color-adjust: exact; } 
          html, body { height: 100%; overflow: hidden; }
        }
      `}</style>

        {/* --- 1. HEADER --- */}
        <div className="flex-shrink-0 flex justify-between items-start border-b border-slate-200 pb-2 mb-2">
          <div>
            <span className="text-lg font-black uppercase tracking-widest" style={{ color: BRAND_COLOR }}>璟瓏軒</span>
            <span className="text-xs text-slate-400 font-bold ml-2">King Lung Heen</span>
          </div>
          <div className="text-right text-[10px] text-slate-400 font-mono leading-tight">
            Ref: {data.orderId}<br />
            {new Date().toLocaleDateString('zh-HK')}
          </div>
        </div>

        {/* --- 2. EVENT INFO --- */}
        <div className="flex-shrink-0 text-center mb-2">
          <h1 className="text-3xl font-black text-slate-900 mb-1 uppercase tracking-tight leading-none">
            {data.eventName}
          </h1>
          <div className="flex flex-col justify-center items-center border-y border-slate-900 py-1 mx-auto">
            <div className="flex gap-3 text-sm font-bold text-slate-600">
              <span>{data.clientName}</span>
              <span className="text-slate-300">|</span>
              <span>{formatMenuDate(data.date)}</span>
              <span className="text-slate-300">|</span>
              <span>{data.tableCount} 席 ({data.guestCount} Pax)</span>
            </div>
          </div>
        </div>

        {/* --- 3. THE MENU CONTENT --- */}
        <div className="flex-1 flex flex-col items-center justify-center w-full overflow-hidden min-h-0 py-2">
          {(data.menus || []).map((menu, i) => (
            <div key={i} className="w-full text-center flex flex-col h-full justify-center">
              <div className="flex-shrink-0 mb-3">
                <div className="flex items-baseline justify-center gap-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest">{menu.title}</h3>
                  <span className="text-xs font-bold text-slate-400 border border-slate-200 px-1 rounded">{versionLabel}</span>
                </div>
                <div className="h-0.5 w-10 bg-slate-900 mx-auto rounded-full mt-2"></div>
              </div>

              <div className="px-4 flex-1 flex flex-col justify-center">
                <p className="font-medium text-slate-800 whitespace-pre-wrap leading-relaxed font-serif"
                  style={{ fontSize: `${fontSizePx}px` }}>
                  {menu.content || '(暫無菜單內容 / No Menu Content)'}
                </p>
              </div>
            </div>
          ))}

          {/* ALLERGY WARNING ABOVE RSVP */}
          <div className="flex-shrink-0 mt-6 text-center">
            <p className="text-[8px] font-bold text-slate-500 italic">
              食物可能有微量致敏原，如對食物有過敏反應，請通知服務員。
            </p>
            <p className="text-[8px] font-bold text-slate-500 mb-2 italic">
              Food may contain trace amounts of allergens. If you have an allergic reaction, please inform the server.
            </p>
            <p className="text-sm font-black text-slate-900 tracking-[0.3em] border-b border-slate-300 pb-1 inline-block">
              **敬候賜覆 RSVP**
            </p>
          </div>
        </div>

        {/* --- 4. FOOTER (Organized Section) --- */}
        <div className="flex-shrink-0 mt-4 pt-4 border-t-2 border-slate-900">
          <div className="grid grid-cols-2 gap-8 items-stretch">

            {/* LEFT SIDE: Requirements & Style */}
            <div className="flex flex-col justify-between">
              <div className="space-y-3">
                {/* SERVING STYLE SECTION */}
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <p className="font-black text-slate-900 text-[11px] mb-2 uppercase">上菜方式 Serving Style</p>
                  {data.servingStyle && data.servingStyle.trim() !== "" ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-900 rounded-sm flex items-center justify-center">
                        <div className="w-1.5 h-2.5 border-r-2 border-b-2 border-white rotate-45 mb-0.5"></div>
                      </div>
                      <span className="font-black text-slate-900 text-sm underline decoration-2 underline-offset-4">{data.servingStyle}</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {['位上', '圍餐', '分菜', '自助餐'].map(style => (
                        <div key={style} className="flex items-center gap-1.5">
                          <div className="w-4 h-4 border-2 border-slate-900 rounded-sm"></div>
                          <span className="text-[11px] font-black text-slate-800">{style}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DISCLAIMERS */}
                <div className="text-[9px] text-slate-600 leading-tight space-y-1 pl-1">
                  <p className="flex items-start gap-1">
                    <span className="font-bold">•</span>
                    <span>上列內容有效期至: <span className="font-bold underline text-slate-900">{data.printSettings?.menu?.validityDateOverride || defaultExpiry}</span></span>
                  </p>
                  <p className="flex items-start gap-1">
                    <span className="font-bold">•</span>
                    <span>同桌個別特別餐膳需另收費用及加一服務費；菜單如有更改，費用只加不減。</span>
                  </p>

                  {!data.servingStyle && (
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-1.5 mt-2">
                      <p className="font-bold text-slate-900">
                        如需分菜位上, 每桌需額外收取 HKD800 及加一服務費
                      </p>
                      <p className="text-[8px] text-slate-500 font-medium">Individual plating service: HKD800/table + 10% service charge.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Signature Box */}
            <div className="border-2 border-slate-900 p-4 rounded-xl flex flex-col justify-between bg-slate-50/30">
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">客戶確認 Confirmation</p>
                <p className="text-[9px] text-slate-400 mt-1 italic">I confirm the above menu and arrangements.</p>
              </div>

              <div className="flex justify-between items-end gap-6 mt-8">
                <div className="flex-1 text-center">
                  <div className="border-b-2 border-slate-900 mb-1 h-8"></div>
                  <p className="text-[9px] font-black text-slate-900 uppercase">簽署 Signature</p>
                </div>
                <div className="w-28 text-center">
                  <div className="border-b-2 border-slate-900 mb-1 h-8"></div>
                  <p className="text-[9px] font-black text-slate-900 uppercase">日期 Date</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Contact / Drinks */}
          <div className="mt-6 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] font-bold text-slate-400">
            <div className="flex gap-6 uppercase tracking-widest">
              {data.drinksPackage && <span><span className="text-slate-300 mr-1">Beverage:</span> {data.drinksPackage}</span>}
              {data.venueLocation && <span><span className="text-slate-300 mr-1">Venue:</span> {data.venueLocation}</span>}
            </div>
            <div className="font-mono">{data.orderId}</div>
          </div>
        </div>
      </div>
    );
  }
  // ==========================================
  // VIEW 7: STANDARD EO (HYBRID: STANDARD MANAGER/FINANCE + BRIEFING STYLE BANQUET)
  // ==========================================
  if (!printMode || printMode === 'EO') {

    const COPIES = [
      { name: '行政存檔 (Manager Copy)', type: 'STD', showBilling: false, showOps: true, showAllocation: false, color: 'bg-slate-800' },
      { name: '會計帳務單 (Finance Copy)', type: 'FIN', showBilling: true, showOps: false, showAllocation: true, color: 'bg-emerald-700' },
      { name: '樓面工作單 (Banquet Copy)', type: 'BQT', showBilling: false, showOps: true, showAllocation: false, color: 'bg-indigo-600' }
    ];

    // 🌟 1. Call the Master Calculator
    const billing = generateBillingSummary(data);

    // 🌟 2. Generate Clean Strings for Selected Packages
    const getEquipmentStr = () => {
      let items = Object.entries(data.equipment || {}).filter(([k, v]) => v === true && typeof equipmentMap !== 'undefined' && equipmentMap[k]).map(([k]) => equipmentMap[k].split(' (')[0]);
      if (data.equipment?.nameSign && data.nameSignText) items.push(`字牌: ${data.nameSignText}`);
      if (data.equipment?.hasCake && data.cakePounds) items.push(`蛋糕: ${data.cakePounds}磅`);
      return items.join(', ');
    };
    const getAVStr = () => {
      return Object.entries(data.equipment || {}).filter(([k, v]) => v === true && typeof avMap !== 'undefined' && avMap[k]).map(([k]) => avMap[k].split(' (')[0]).join(', ');
    };
    const getDecorStr = () => {
      let items = Object.entries(data.decoration || {}).filter(([k, v]) => v === true && typeof decorationMap !== 'undefined' && decorationMap[k]).map(([k]) => decorationMap[k].split(' (')[0]);
      if (data.decoration?.hasFlowerPillar && data.flowerPillarQty) items.push(`花柱: ${data.flowerPillarQty}支`);
      if (data.decoration?.hasMahjong && data.mahjongTableQty) items.push(`麻雀: ${data.mahjongTableQty}張`);
      if (data.decoration?.hasInvitation && data.invitationQty) items.push(`喜帖: ${data.invitationQty}套`);
      if (data.decoration?.hasCeremonyChair && data.ceremonyChairQty) items.push(`婚椅: ${data.ceremonyChairQty}張`);
      return items.join(', ');
    };

    const setupStr = getEquipmentStr();
    const avStr = getAVStr();
    const decorStr = getDecorStr();

    // 🌟 3. Allocation Logic (For Finance Copy)
    let displayAlloc = JSON.parse(JSON.stringify(detailedAlloc || {}));
    let otherKey = Object.keys(displayAlloc).find(k => k === 'others' || displayAlloc[k].label.includes('其他') || displayAlloc[k].label.toLowerCase().includes('other'));
    if (!otherKey) { otherKey = 'others'; displayAlloc[otherKey] = { label: '其他 (Others)', items: [], total: 0 }; }
    else { displayAlloc[otherKey].label = '其他 (Others)'; }

    const addToDept = (key, name, amount) => {
      if (!displayAlloc[key]) displayAlloc[key] = { label: '其他 (Others)', items: [], total: 0 };
      displayAlloc[key].items.push({ name, unit: amount, qty: 1, amount: amount });
      displayAlloc[key].total += amount;
    };

    if (billing.bus) addToDept(otherKey, '旅遊巴安排', billing.bus.amount);
    if (billing.setupPackagePrice > 0) addToDept(otherKey, '舞台與接待設備', billing.setupPackagePrice);
    if (billing.avPackagePrice > 0) addToDept(otherKey, '影音設備', billing.avPackagePrice);
    if (billing.decorPackagePrice > 0) addToDept(otherKey, '場地佈置', billing.decorPackagePrice);
    if (billing.serviceChargeVal > 0) addToDept(otherKey, '服務費 (10%)', billing.serviceChargeVal);
    if (billing.ccSurcharge > 0) addToDept(otherKey, '信用卡附加費 (3%)', billing.ccSurcharge);
    if (billing.discountVal > 0) {
      if (!displayAlloc['adjustments']) displayAlloc['adjustments'] = { label: '調整 (Adjustments)', items: [], total: 0 };
      displayAlloc['adjustments'].items.push({ name: '折扣優惠 (Discount)', unit: -billing.discountVal, qty: 1, amount: -billing.discountVal });
      displayAlloc['adjustments'].total -= billing.discountVal;
    }
    const totalAllocation = Object.values(displayAlloc).reduce((acc, dept) => acc + dept.total, 0);

    return (
      <div className="font-sans text-slate-900 max-w-[210mm] mx-auto bg-white text-sm">
        <style>{`
          @media print { 
            body, html { height: auto !important; overflow: visible !important; background: white !important; } 
            .no-print, aside, nav, button, .modal-overlay { display: none !important; } 
            .print-only { display: block !important; position: absolute; top: 0; left: 0; width: 100%; z-index: 9999; background: white; } 
            
            @page { 
              margin: 10mm; 
              size: A4; 
              @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #94a3b8; font-family: sans-serif; }
              @bottom-center { content: "${data.orderId}"; font-size: 10px; font-weight: bold; color: #000; font-family: monospace; }
              @bottom-left { content: "${data.eventName || ''}"; font-size: 9px; font-weight: bold; color: #64748b; font-family: sans-serif; text-transform: uppercase; }
            }
            .page-break { page-break-after: always !important; display: block; height: 1px; width: 100%; clear: both; }
            .print-page { position: relative; width: 100%; background: white; margin-bottom: 20px; } 
            .break-inside-avoid { break-inside: avoid; }
            .compact-table th, .compact-table td { padding: 3px 6px; border-bottom: 1px solid #e2e8f0; }
            .compact-table th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #64748b; }
          }
        `}</style>

        {/* --- LOOP THROUGH COPIES --- */}
        {COPIES.map((copy, idx) => (
          <div key={idx}>
            <div className="print-page">

              {/* ========================================================
                  LAYOUT TYPE 1: BANQUET COPY (Briefing Style)
                 ======================================================== */}
              {copy.type === 'BQT' ? (
                <div className="relative">
                  {/* Header (Briefing Style) */}
                  <div className="border-b-4 border-black pb-2 mb-4">
                    <div className="flex justify-between items-end">
                      <div className="w-[70%]">
                        <div className="flex items-center gap-3 mb-1">
                          <h1 className="text-4xl font-black uppercase leading-none tracking-tight">{data.eventName}</h1>
                        </div>
                        <div className="text-xl font-bold text-slate-600 flex items-center gap-2">
                          <span>{cleanLocation(data.venueLocation)}</span>
                          <span className="text-slate-300">|</span>
                          <span>{formatDateWithDay(data.date)}</span>
                        </div>
                      </div>
                      <div className="w-[30%] flex flex-col items-end">
                        <span className={`text-white px-3 py-1 text-[10px] font-bold rounded uppercase tracking-wider mb-2 ${copy.color}`}>
                          {copy.name}
                        </span>
                        <div className="bg-black text-white text-center p-2 rounded-lg shadow-sm w-full">
                          <div className="text-xs uppercase font-bold text-slate-400">Time</div>
                          <div className="text-2xl font-black leading-none">{data.startTime} - {data.endTime}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                    <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-800">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Tables (席數)</span>
                      <span className="block text-3xl font-black">{data.tableCount}</span>
                    </div>
                    <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-600">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Guests (人數)</span>
                      <span className="block text-3xl font-black">{data.guestCount}</span>
                    </div>
                    <div className="bg-slate-100 p-2 rounded border-l-4 border-indigo-600">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Style (上菜)</span>
                      <span className="block text-xl font-bold mt-1">{data.servingStyle || 'Standard'}</span>
                    </div>
                    <div className="bg-slate-100 p-2 rounded border-l-4 border-amber-600">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Serving (起菜)</span>
                      <span className="block text-xl font-bold mt-1">{data.servingTime || 'TBC'}</span>
                    </div>
                  </div>

                  {/* Alerts */}
                  {(data.specialMenuReq || data.allergies) && (
                    <div className="mb-4 p-3 border-4 border-red-600 bg-red-50 rounded-lg flex items-start gap-3">
                      <div className="bg-red-600 text-white p-2 rounded font-black text-xl"><AlertTriangle size={24} /></div>
                      <div>
                        <h3 className="text-red-700 font-bold text-sm uppercase underline">Allergy / Special Diet Alert</h3>
                        <p className="text-2xl font-black text-red-900 leading-tight">{data.specialMenuReq} {data.allergies}</p>
                      </div>
                    </div>
                  )}

                  {/* Main Content (Briefing Layout) */}
                  <div className="grid grid-cols-2 gap-6 items-start">
                    {/* LEFT: MENU */}
                    <div className="border-2 border-slate-800 rounded-xl overflow-hidden h-full flex flex-col">
                      <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm uppercase">🍽️ Menu (菜單)</div>
                      <div className="p-4 bg-slate-50 flex-1">
                        <div className="space-y-4">
                          {data.menus && data.menus.map((m, i) => (
                            <div key={i}>
                              {m.title && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{m.title}</div>}
                              <p className="text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-wrap font-serif border-l-2 border-slate-300 pl-3">{onlyChinese(m.content)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 border-t border-blue-100">
                        <div className="flex items-start gap-3">
                          <Coffee size={20} className="text-blue-600 mt-0.5" />
                          <div><span className="block text-xs font-bold text-blue-800 uppercase">Beverage Package</span><span className="block text-base font-bold text-slate-800">{data.drinksPackage || 'None'}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: RUNDOWN -> LOGISTICS -> SETUP */}
                    <div className="flex flex-col gap-4">
                      {/* Rundown */}
                      <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-800 text-white px-3 py-1.5 font-bold text-sm uppercase flex justify-between items-center"><span>📋 Rundown (流程)</span></div>
                        <div className="p-3">
                          {(!data.rundown || data.rundown.length === 0) ? <p className="text-center text-slate-400 italic py-2">No Rundown Provided</p> : (
                            <table className="w-full text-xs"><tbody className="divide-y divide-slate-100">{data.rundown.map((item, i) => (<tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}><td className="py-2 pl-2 w-14 font-mono font-bold text-slate-900 align-top">{item.time}</td><td className="py-2 pr-2 font-bold text-slate-700">{item.activity}</td></tr>))}</tbody></table>
                          )}
                        </div>
                      </div>
                      {/* Logistics */}
                      <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 px-3 py-1.5 font-bold text-sm text-slate-700 uppercase border-b border-slate-200">🚍 Logistics (物流)</div>
                        <div className="p-3 space-y-3">
                          {data.busInfo?.enabled ? (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-indigo-50 p-2 rounded border border-indigo-100"><span className="block font-bold text-indigo-800 mb-1">Arrival (接載)</span>{data.busInfo.arrivals?.length > 0 ? data.busInfo.arrivals.map((b, i) => (<div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>)) : <span className="text-slate-400">-</span>}</div>
                              <div className="bg-indigo-50 p-2 rounded border border-indigo-100"><span className="block font-bold text-indigo-800 mb-1">Departure (散席)</span>{data.busInfo.departures?.length > 0 ? data.busInfo.departures.map((b, i) => (<div key={i} className="font-mono font-bold">{b.time} <span className="font-sans font-normal text-[10px]">({b.location})</span></div>)) : <span className="text-slate-400">-</span>}</div>
                            </div>
                          ) : <div className="text-xs text-slate-400 text-center italic">No Bus Arrangement</div>}
                          <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs"><span className="font-bold text-slate-600">Parking:</span><span className="font-bold bg-slate-100 px-2 py-0.5 rounded">{data.parkingInfo?.ticketQty || 0} Tickets ({data.parkingInfo?.ticketHours || 0} hrs)</span></div>
                        </div>
                      </div>
                      {/* Setup */}
                      <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 px-3 py-1.5 font-bold text-sm text-slate-700 uppercase border-b border-slate-200">🛠️ Setup (場地)</div>
                        <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-white border border-slate-200 rounded text-center"><span className="block text-[9px] text-slate-400 uppercase">Table Cloth</span><span className="block font-bold text-slate-900">{data.tableClothColor || 'Std'}</span></div>
                          <div className="p-2 bg-white border border-slate-200 rounded text-center"><span className="block text-[9px] text-slate-400 uppercase">Chair Cover</span><span className="block font-bold text-slate-900">{data.chairCoverColor || 'Std'}</span></div>

                          {/* 🌟 INTEGRATED PACKAGES FOR OPS 🌟 */}
                          <div className="col-span-2 p-2 bg-white border border-slate-200 rounded">
                            <span className="block text-[9px] text-slate-400 uppercase">設備與佈置 (Equipment & Decor)</span>
                            <div className="text-[10px] font-bold text-slate-800 leading-snug mt-1">
                              {[setupStr, avStr, decorStr].filter(Boolean).join(' / ') || 'Standard Setup'}
                            </div>
                          </div>

                          {data.otherNotes && (<div className="col-span-2 mt-2 pt-2 border-t border-slate-100"><span className="block text-[9px] text-red-500 font-bold uppercase mb-1">Remarks / Attention</span><p className="font-bold text-slate-900">{data.otherNotes}</p></div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ========================================================
                   LAYOUT TYPE 2: MANAGER & FINANCE (Standard Table Style)
                   ======================================================== */
                <div>
                  {/* Standard Header */}
                  <div className="flex justify-between items-start mb-2 border-b-2 border-slate-900 pb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black uppercase tracking-tight leading-none">{data.eventName}</h1>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs font-bold text-slate-600 font-mono">
                        <span>編號: {data.orderId}</span>
                        <span>建立日期: {new Date().toLocaleDateString('zh-HK')}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`text-white px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider mb-1 ${copy.color}`}>
                        {copy.name}
                      </span>
                      <div className="text-sm font-bold text-slate-900">{formatDateWithDay(data.date)}</div>
                      <div className="text-xs text-slate-500">{data.startTime} - {data.endTime}</div>
                    </div>
                  </div>

                  {/* Info Bar (Hidden for Finance) */}
                  {copy.type !== 'FIN' && (
                    <div className="bg-slate-100 border border-slate-200 p-2 rounded mb-4 grid grid-cols-4 gap-4 text-xs">
                      <div className="border-r border-slate-300 pr-2"><span className="block text-[9px] text-slate-400 font-bold uppercase">客戶</span><div className="font-bold truncate">{data.clientName}</div><div className="truncate text-[10px]">{data.clientPhone}</div></div>
                      <div className="border-r border-slate-300 pr-2"><span className="block text-[9px] text-slate-400 font-bold uppercase">場地</span><div className="font-bold truncate">{cleanLocation(data.venueLocation)}</div></div>
                      <div className="border-r border-slate-300 pr-2"><span className="block text-[9px] text-slate-400 font-bold uppercase">席數 / 人數</span><div className="font-bold">{data.tableCount} 席 / {data.guestCount} 人</div></div>
                      <div><span className="block text-[9px] text-slate-400 font-bold uppercase">負責人</span><div className="font-bold">{data.salesRep || '-'}</div></div>
                    </div>
                  )}

                  {/* OPS CONTENT (Manager Copy Only) */}
                  {copy.showOps && (
                    <div className="flex gap-6 items-start mb-4">
                      <div className="w-1/2 flex flex-col gap-4">
                        <div className="border border-slate-300 rounded overflow-hidden h-full">
                          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-700 text-xs">餐飲安排 (Food & Beverage)</span>
                            <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 rounded text-slate-600">{data.servingStyle}</span>
                          </div>
                          <div className="p-3">
                            <div className="bg-blue-50 border border-blue-100 rounded p-2 mb-3 text-xs flex gap-2">
                              <Coffee size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                              <div><span className="font-bold text-blue-700 block text-[10px] uppercase">酒水套餐</span><span className="font-medium text-slate-700">{data.drinksPackage || '標準 / 無'}</span></div>
                            </div>
                            <div className="space-y-3">
                              {data.menus && data.menus.length > 0 ? (
                                data.menus.map((m, mIdx) => (
                                  <div key={mIdx} className="break-inside-avoid">
                                    {m.title && <div className="font-bold text-slate-800 text-sm underline decoration-slate-300 mb-1">{m.title}</div>}
                                    <div className="text-sm font-medium leading-snug text-slate-700 whitespace-pre-wrap pl-2 border-l-2 border-slate-200">{onlyChinese(m.content)}</div>
                                  </div>
                                ))
                              ) : <div className="text-slate-400 italic text-xs">未選擇菜單</div>}
                            </div>
                          </div>
                        </div>
                        {(data.specialMenuReq || data.allergies) && (
                          <div className="border-2 border-red-200 bg-red-50 rounded p-3 text-xs break-inside-avoid">
                            <div className="font-black text-red-600 flex items-center gap-1 mb-1"><AlertTriangle size={14} /> 特別要求 / 過敏</div>
                            <div className="font-bold text-red-900 whitespace-pre-wrap">{data.specialMenuReq}{data.specialMenuReq && data.allergies && ' | '}{data.allergies}</div>
                          </div>
                        )}
                      </div>
                      <div className="w-1/2 flex flex-col gap-4">
                        <div className="border border-slate-300 rounded overflow-hidden break-inside-avoid">
                          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 font-bold text-slate-700 text-xs">活動流程 (Rundown)</div>
                          <div className="p-2">
                            {(!data.rundown || data.rundown.length === 0) ? <span className="text-[10px] text-slate-400 italic">無</span> : (
                              <table className="w-full text-xs"><tbody className="divide-y divide-slate-100">{data.rundown.map((item, i) => (<tr key={i}><td className="py-1 font-mono text-slate-500 w-16 align-top">{item.time}</td><td className="py-1 font-bold text-slate-700">{item.activity}</td></tr>))}</tbody></table>
                            )}
                          </div>
                        </div>

                        {/* 🌟 INTEGRATED PACKAGES FOR MANAGER OPS 🌟 */}
                        <div className="border border-slate-300 rounded overflow-hidden break-inside-avoid">
                          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 font-bold text-slate-700 text-xs">場地、影音與佈置</div>
                          <div className="p-3 text-xs space-y-2">
                            <div className="grid grid-cols-2 gap-2 mb-2"><div><span className="text-[9px] text-slate-400 block font-bold">檯布顏色</span>{data.tableClothColor || '標準'}</div><div><span className="text-[9px] text-slate-400 block font-bold">椅套顏色</span>{data.chairCoverColor || '標準'}</div></div>
                            <div><span className="text-[9px] text-slate-400 block font-bold">主家席</span>{data.headTableColorType === 'custom' ? data.headTableCustomColor : '同客席'}</div>
                            {data.venueDecor && <div className="bg-slate-50 p-2 rounded italic text-[10px] border border-slate-100"><span className="font-bold not-italic">佈置備註:</span> {data.venueDecor}</div>}

                            <div className="border-t border-slate-100 pt-2 space-y-1">
                              {setupStr && <div><span className="text-[9px] text-slate-400 font-bold">舞台與接待設備:</span> <span className="text-[10px] font-medium text-slate-700">{setupStr}</span></div>}
                              {avStr && <div><span className="text-[9px] text-slate-400 font-bold">影音設備:</span> <span className="text-[10px] font-medium text-slate-700">{avStr}</span></div>}
                              {decorStr && <div><span className="text-[9px] text-slate-400 font-bold">場地佈置:</span> <span className="text-[10px] font-medium text-slate-700">{decorStr}</span></div>}
                              {data.avNotes && <p className="text-[10px] text-slate-500 mt-1">*{data.avNotes}</p>}
                            </div>
                          </div>
                        </div>

                        <div className="border border-slate-300 rounded overflow-hidden break-inside-avoid">
                          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 font-bold text-slate-700 text-xs">物流與泊車</div>
                          <div className="p-3 text-xs space-y-3">
                            {data.busInfo?.enabled && (
                              <div className="bg-indigo-50 border border-indigo-100 rounded p-2 text-[10px] mb-2">
                                <span className="font-bold text-indigo-700 block mb-1 border-b border-indigo-200 pb-0.5">🚌 旅遊巴安排</span>
                                <div className="grid grid-cols-2 gap-3">
                                  <div><span className="font-bold text-indigo-600 block text-[9px] mb-0.5">接載:</span>{(!data.busInfo.arrivals || data.busInfo.arrivals.length === 0) ? <span className="text-slate-400 italic text-[9px]">-</span> : data.busInfo.arrivals.map((bus, i) => (<div key={i} className="mb-1 leading-tight"><div className="flex gap-1 items-baseline"><span className="font-mono font-bold text-black">{bus.time}</span>{bus.plate && <span className="text-slate-500 text-[9px]">({bus.plate})</span>}</div><div className="text-slate-700 break-words">{bus.location || '---'}</div></div>))}</div>
                                  <div><span className="font-bold text-indigo-600 block text-[9px] mb-0.5">散席:</span>{(!data.busInfo.departures || data.busInfo.departures.length === 0) ? <span className="text-slate-400 italic text-[9px]">-</span> : data.busInfo.departures.map((bus, i) => (<div key={i} className="mb-1 leading-tight"><div className="flex gap-1 items-baseline"><span className="font-mono font-bold text-black">{bus.time}</span>{bus.plate && <span className="text-slate-500 text-[9px]">({bus.plate})</span>}</div><div className="text-slate-700 break-words">{bus.location || '---'}</div></div>))}</div>
                                </div>
                              </div>
                            )}
                            <div className="flex justify-between items-center"><span className="font-bold text-slate-500">泊車安排</span><span className="bg-slate-100 px-2 rounded font-bold">{data.parkingInfo?.ticketQty || 0} 張 x {data.parkingInfo?.ticketHours || 0} 小時</span></div>
                            {data.parkingInfo?.plates && <div className="text-[10px] bg-slate-50 p-1 rounded font-mono break-all">車牌: {data.parkingInfo.plates}</div>}
                            <div className="border-t border-slate-100 pt-2"><span className="text-[9px] text-slate-400 block font-bold mb-1">送貨安排</span>{(!data.deliveries || data.deliveries.length === 0) ? <span className="text-[10px] text-slate-400 italic">無</span> : (<div className="space-y-1">{data.deliveries.map((d, i) => (<div key={i} className="flex justify-between text-[10px] bg-slate-50 p-1.5 rounded"><span className="font-bold truncate mr-2">{d.unit}</span><span className="font-mono text-slate-500 whitespace-nowrap">{d.time}</span></div>))}</div>)}</div>
                          </div>
                        </div>
                        {data.otherNotes && <div className="border border-yellow-200 bg-yellow-50 rounded p-2 text-xs"><span className="font-bold text-yellow-700 text-[10px] block uppercase">備註</span><p className="leading-tight text-yellow-900 whitespace-pre-wrap">{data.otherNotes}</p></div>}
                      </div>
                    </div>
                  )}

                  {/* 4. BILLING (FINANCE COPY) */}
                  {copy.showBilling && (
                    <div className={`${copy.showOps ? "mt-auto" : "mt-4"} border-t-2 border-slate-800 pt-2`}>
                      <div className="flex justify-between items-end mb-2">
                        <h3 className="font-bold text-slate-800 text-xs uppercase">費用明細 (Billing Summary)</h3>
                      </div>
                      <table className="w-full text-xs compact-table">
                        <thead><tr><th className="text-left w-[50%]">項目</th><th className="text-right w-[15%]">單價</th><th className="text-center w-[10%]">數量</th><th className="text-right w-[25%]">金額</th></tr></thead>
                        <tbody>
                          {billing.parsedMenus.map((m, i) => (<tr key={`m-${i}`}><td className="font-medium">{m.title}</td><td className="text-right font-mono text-slate-500">${formatMoney(m.cleanPrice)}</td><td className="text-center text-slate-500">{m.cleanQty}</td><td className="text-right font-mono font-bold">${formatMoney(m.amount)}</td></tr>))}
                          {billing.drinks && (<tr><td className="font-medium">酒水套餐 ({billing.drinks.label})</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.drinks.price)}</td><td className="text-center text-slate-500">{billing.drinks.qty}</td><td className="text-right font-mono font-bold">${formatMoney(billing.drinks.amount)}</td></tr>)}
                          {billing.plating && (<tr><td className="font-medium">位上服務費</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.plating.price)}</td><td className="text-center text-slate-500">{billing.plating.qty}</td><td className="text-right font-mono font-bold">${formatMoney(billing.plating.amount)}</td></tr>)}

                          {/* 🌟 NEW PACKAGE ROWS FOR FINANCE 🌟 */}
                          {billing.setupPackagePrice > 0 && (
                            <tr>
                              <td className="font-medium pt-1">舞台與接待設備套票<div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{setupStr}</div></td>
                              <td className="text-right font-mono text-slate-500 align-top pt-1">${formatMoney(billing.setupPackagePrice)}</td>
                              <td className="text-center text-slate-500 align-top pt-1">1</td>
                              <td className="text-right font-mono font-bold align-top pt-1">${formatMoney(billing.setupPackagePrice)}</td>
                            </tr>
                          )}
                          {billing.avPackagePrice > 0 && (
                            <tr>
                              <td className="font-medium pt-1">影音設備套票<div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{avStr}</div></td>
                              <td className="text-right font-mono text-slate-500 align-top pt-1">${formatMoney(billing.avPackagePrice)}</td>
                              <td className="text-center text-slate-500 align-top pt-1">1</td>
                              <td className="text-right font-mono font-bold align-top pt-1">${formatMoney(billing.avPackagePrice)}</td>
                            </tr>
                          )}
                          {billing.decorPackagePrice > 0 && (
                            <tr>
                              <td className="font-medium pt-1">場地佈置套票<div className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5">{decorStr}</div></td>
                              <td className="text-right font-mono text-slate-500 align-top pt-1">${formatMoney(billing.decorPackagePrice)}</td>
                              <td className="text-center text-slate-500 align-top pt-1">1</td>
                              <td className="text-right font-mono font-bold align-top pt-1">${formatMoney(billing.decorPackagePrice)}</td>
                            </tr>
                          )}

                          {billing.parsedCustomItems.map((item, i) => (<tr key={`c-${i}`}><td>{item.name}</td><td className="text-right font-mono text-slate-500">${formatMoney(item.cleanPrice)}</td><td className="text-center text-slate-500">{item.cleanQty}</td><td className="text-right font-mono font-bold">${formatMoney(item.amount)}</td></tr>))}
                          {billing.bus && (<tr><td className="font-bold">旅遊巴安排</td><td className="text-right font-mono text-slate-500">${formatMoney(billing.bus.amount)}</td><td className="text-center text-slate-500">1</td><td className="text-right font-mono font-bold">${formatMoney(billing.bus.amount)}</td></tr>)}
                        </tbody>
                        <tfoot className="break-inside-avoid">
                          <tr className="border-t-2 border-slate-300"><td colSpan="3" className="text-right font-bold pt-2 text-slate-500 text-[10px]">小計 (Subtotal)</td><td className="text-right font-mono pt-2 text-slate-500">${formatMoney(billing.subtotal)}</td></tr>
                          {billing.serviceChargeVal > 0 && (<tr><td colSpan="3" className="text-right font-bold text-slate-500 text-[10px]">服務費 (10%)</td><td className="text-right font-mono text-slate-500">+${formatMoney(billing.serviceChargeVal)}</td></tr>)}
                          {billing.discountVal > 0 && (<tr><td colSpan="3" className="text-right font-bold text-red-500 text-[10px]">折扣 (Discount)</td><td className="text-right font-mono text-red-500">-${formatMoney(billing.discountVal)}</td></tr>)}
                          {billing.ccSurcharge > 0 && (<tr><td colSpan="3" className="text-right font-bold text-amber-700 text-[10px]">信用卡附加費 (3%)</td><td className="text-right font-mono text-amber-700">+${formatMoney(billing.ccSurcharge)}</td></tr>)}
                          <tr className="border-t border-slate-800"><td colSpan="3" className="text-right font-bold pt-1 text-sm">總金額 (TOTAL)</td><td className="text-right font-bold font-mono pt-1 text-sm text-black">${formatMoney(billing.grandTotal)}</td></tr>

                          {[
                            { l: '訂金 1', a: billing.dep1, d: data.deposit1Date, received: data.deposit1Received },
                            { l: '訂金 2', a: billing.dep2, d: data.deposit2Date, received: data.deposit2Received },
                            { l: '訂金 3', a: billing.dep3, d: data.deposit3Date, received: data.deposit3Received }
                          ].map((item, i) => (item.a > 0 ? (
                            <tr key={i}>
                              <td colSpan="3" className="text-right text-slate-500 text-[10px] py-1">
                                {item.l} {item.d && <span className="ml-1 font-mono">[{item.d}]</span>}
                                {item.received ? <span className="ml-2 font-bold text-emerald-600 border border-emerald-600 px-1 rounded text-[9px]">已收款 PAID</span> : <span className="ml-2 font-bold text-red-400 border border-red-400 px-1 rounded text-[9px]">未收款 UNPAID</span>}
                              </td>
                              <td className="text-right font-mono text-slate-500 text-[10px] py-1">{item.received ? `-$${formatMoney(item.a)}` : '$0'}</td>
                            </tr>
                          ) : null))}
                          <tr><td colSpan="3" className="text-right font-bold text-red-600 pt-2">尚餘尾數 (Outstanding Balance)</td><td className="text-right font-bold font-mono text-red-600 pt-2 text-base">${formatMoney(billing.balanceDue)}</td></tr>
                        </tfoot>
                      </table>

                      {copy.showAllocation && (
                        <div className="mt-4 pt-2 border-t border-slate-200">
                          <h3 className="font-bold text-slate-800 text-xs uppercase">部門拆帳詳情 (Revenue Allocation)</h3>
                          <div className="w-full">
                            <table className="w-full text-[10px] border-collapse table-fixed">
                              <colgroup><col className="w-[15%]" /><col className="w-[40%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[15%]" /><col className="w-[5%]" /></colgroup>
                              <thead><tr className="border-b-2 border-slate-800 bg-slate-50 text-slate-600"><th className="text-left py-1 px-2">部門</th><th className="text-left py-1 px-2">項目</th><th className="text-right py-1 px-2">單價</th><th className="text-center py-1 px-2">數量</th><th className="text-right py-1 px-2">總額</th><th className="text-right py-1 px-2">%</th></tr></thead>
                              <tbody className="divide-y divide-slate-100">
                                {Object.values(displayAlloc).map((dept, i) => {
                                  if (dept.total === 0 && dept.items.length === 0) return null;
                                  return (<React.Fragment key={i}>
                                    {dept.items.map((item, idx) => (<tr key={`${i}-${idx}`} className={idx === 0 ? "border-t border-slate-200" : ""}><td className={`py-1 px-2 align-top ${idx === 0 ? 'font-bold' : ''}`}>{idx === 0 ? dept.label : ''}</td><td className="py-1 px-2 align-top text-slate-600">{item.name}</td><td className="py-1 px-2 text-right font-mono text-slate-500">${formatMoney(item.unit)}</td><td className="py-1 px-2 text-center text-slate-500">{item.qty}</td><td className="py-1 px-2 text-right font-mono font-medium">${formatMoney(item.amount)}</td><td className="py-1 px-2"></td></tr>))}
                                    <tr className="bg-slate-50/50"><td colSpan="4" className="py-1 px-2 text-right text-[9px] uppercase font-bold text-slate-400">{dept.label.split(' ')[0]} 小計</td><td className="py-1 px-2 text-right font-mono font-bold">${formatMoney(dept.total)}</td><td className="py-1 px-2 text-right font-bold text-[9px] text-slate-500">{billing.subtotal > 0 ? ((dept.total / billing.subtotal) * 100).toFixed(1) : 0}%</td></tr>
                                  </React.Fragment>);
                                })}
                              </tbody>
                              <tfoot><tr className="border-t-2 border-slate-800 bg-slate-100 font-bold"><td colSpan="4" className="py-1 px-2 text-right uppercase">拆帳總計</td><td className="py-1 px-2 text-right font-mono">${formatMoney(totalAllocation)}</td><td className="py-1 px-2 text-right">100%</td></tr></tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="page-break"></div>
          </div>
        ))}

        {/* --- PAGE 4: APPENDIX (Now handles arrays of photos) --- */}
        {((data.stageDecorPhotos && data.stageDecorPhotos.length > 0) || (data.venueDecorPhotos && data.venueDecorPhotos.length > 0) || data.stageDecorPhoto || data.venueDecorPhoto) && (
          <>
            <div className="print-page">
              <Header title="附錄 (Appendix)" copyType="參考圖片" badgeColor="bg-slate-500" />

              {/* We use a 2-column grid so multiple images fit nicely on one page */}
              <div className="grid grid-cols-2 gap-6 mt-4">

                {/* Map stage decor photos (merges new arrays with old legacy string) */}
                {(data.stageDecorPhotos || (data.stageDecorPhoto ? [data.stageDecorPhoto] : [])).map((url, idx) => (
                  <div key={`stage-${idx}`} className="break-inside-avoid border border-slate-200 rounded p-2 bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">舞台/花藝參考圖 {idx + 1}</h3>
                    <img src={url} alt={`Stage ${idx}`} className="w-full h-auto max-h-[110mm] object-contain mx-auto" />
                  </div>
                ))}

                {/* Map venue decor photos (merges new arrays with old legacy string) */}
                {(data.venueDecorPhotos || (data.venueDecorPhoto ? [data.venueDecorPhoto] : [])).map((url, idx) => (
                  <div key={`venue-${idx}`} className="break-inside-avoid border border-slate-200 rounded p-2 bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">場地佈置參考圖 {idx + 1}</h3>
                    <img src={url} alt={`Venue ${idx}`} className="w-full h-auto max-h-[110mm] object-contain mx-auto" />
                  </div>
                ))}

              </div>
            </div>
            <div className="page-break"></div>
          </>
        )}

        {/* --- PAGE 5: KITCHEN COPY --- */}
        <div className="print-page">
          <div className="flex justify-between items-end border-b-4 border-black pb-2 mb-4">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">廚房出品單</h1>
              <p className="text-lg font-bold text-slate-500 mt-1">KITCHEN COPY</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold bg-black text-white px-4 py-1 inline-block mb-1">{data.servingTime ? `${data.servingTime} 起菜` : '時間待定'}</div>
              <div className="text-sm font-mono font-bold">{formatDateWithDay(data.date)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-100 p-4 border-l-8 border-slate-800">
              <span className="block text-xs font-bold text-slate-500 uppercase">活動名稱</span>
              <span className="block text-xs font-bold leading-tight">{data.eventName}</span>
            </div>
            <div className="bg-slate-100 p-4 border-l-8 border-black text-center">
              <span className="block text-xs font-bold text-slate-500 uppercase">席數</span>
              <span className="block text-4xl font-black leading-none">{data.tableCount}</span>
            </div>
            <div className="bg-slate-100 p-4 border-l-8 border-slate-600 text-center">
              <span className="block text-xs font-bold text-slate-500 uppercase">人數</span>
              <span className="block text-4xl font-black leading-none">{data.guestCount}</span>
            </div>
          </div>

          {(data.specialMenuReq || data.allergies) && (
            <div className="mb-6 p-4 border-4 border-red-600 bg-red-50">
              <h3 className="text-lg font-black text-red-600 uppercase underline mb-2 flex items-center"><AlertTriangle className="mr-2" /> 特別飲食 / 過敏</h3>
              <p className="text-2xl font-bold text-red-900 leading-tight">
                {data.specialMenuReq}{data.specialMenuReq && data.allergies && '\n'}{data.allergies}
              </p>
            </div>
          )}

          <div className="border-4 border-black p-4">
            <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
              <h3 className="text-2xl font-bold uppercase">餐單內容</h3>
              <span className="text-lg font-bold bg-slate-200 px-3 py-1">{data.servingStyle}</span>
            </div>
            <div className="space-y-6">
              {data.menus && data.menus.map((menu, idx) => (
                <div key={idx}>
                  {menu.title && <div className="font-bold text-xl underline mb-2">{menu.title}</div>}
                  <p className="text-2xl font-semibold leading-relaxed whitespace-pre-wrap font-serif">
                    {onlyChinese(menu.content)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    );
  }
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
          <h1 className="text-2xl font-bold text-white">璟瓏軒</h1>
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
      Mon: { lunch: '', dinner: '' }, Tue: { lunch: '', dinner: '' }, Wed: { lunch: '', dinner: '' },
      Thu: { lunch: '', dinner: '' }, Fri: { lunch: '', dinner: '' }, Sat: { lunch: '', dinner: '' }, Sun: { lunch: '', dinner: '' }
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
    setEditingRule({ id: null, locations: [], prices: { Mon: { lunch: '', dinner: '' }, Tue: { lunch: '', dinner: '' }, Wed: { lunch: '', dinner: '' }, Thu: { lunch: '', dinner: '' }, Fri: { lunch: '', dinner: '' }, Sat: { lunch: '', dinner: '' }, Sun: { lunch: '', dinner: '' } } });
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
  const handleSavePaymentRule = () => { /* (Keep existing logic) */ if (!editingPaymentRule.name) return addToast("請輸入規則名稱", "error"); const totalPercent = editingPaymentRule.deposit1 + editingPaymentRule.deposit2 + editingPaymentRule.deposit3; if (totalPercent > 100) return addToast("錯誤：訂金總比例不能超過 100%", "error"); const newRules = [...(localSettings.paymentRules || [])]; if (editingPaymentRule.id) { const idx = newRules.findIndex(r => r.id === editingPaymentRule.id); if (idx !== -1) newRules[idx] = editingPaymentRule; } else { newRules.push({ ...editingPaymentRule, id: Date.now() }); } newRules.sort((a, b) => b.minMonthsInAdvance - a.minMonthsInAdvance); const updatedSettings = { ...localSettings, paymentRules: newRules }; setLocalSettings(updatedSettings); onSave(updatedSettings); setEditingPaymentRule({ id: null, name: '', minMonthsInAdvance: 0, deposit1: 30, deposit1Offset: 0, deposit2: 30, deposit2Offset: 3, deposit3: 30, deposit3Offset: 6 }); addToast("付款規則已儲存", "success"); };
  const handleDeletePaymentRule = (id) => { const updatedSettings = { ...localSettings, paymentRules: localSettings.paymentRules.filter(r => r.id !== id) }; setLocalSettings(updatedSettings); onSave(updatedSettings); };

  // Helper to safely get nested price
  const getPriceVal = (rule, day, type) => {
    if (typeof rule.prices[day] === 'object') return rule.prices[day][type];
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
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">{editingRule.id ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}{editingRule.id ? "編輯規則" : "新增規則"}</h3>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">1. 選擇區域組合</label>
                  <div className="flex flex-wrap gap-2">{LOCATION_CHECKBOXES.map(loc => (<button key={loc} onClick={() => setEditingRule(p => ({ ...p, locations: p.locations.includes(loc) ? p.locations.filter(l => l !== loc) : [...p.locations, loc] }))} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${editingRule.locations.includes(loc) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}>{loc}</button>))}</div>
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
                            onChange={(e) => setEditingRule(p => ({ ...p, prices: { ...p.prices, [day]: { ...p.prices[day], lunch: e.target.value } } }))}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded outline-none focus:border-blue-500 text-center"
                            placeholder="Lunch"
                          />
                        </div>
                        {/* Dinner Input */}
                        <div className="relative flex-1">
                          <input type="number"
                            value={editingRule.prices[day]?.dinner || ''}
                            onChange={(e) => setEditingRule(p => ({ ...p, prices: { ...p.prices, [day]: { ...p.prices[day], dinner: e.target.value } } }))}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded outline-none focus:border-blue-500 text-center bg-blue-50/30"
                            placeholder="Dinner"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2"><button onClick={handleSaveRule} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">更新/新增</button>{editingRule.id && <button onClick={() => setEditingRule({ id: null, locations: [], prices: { Mon: { lunch: '', dinner: '' }, Tue: { lunch: '', dinner: '' }, Wed: { lunch: '', dinner: '' }, Thu: { lunch: '', dinner: '' }, Fri: { lunch: '', dinner: '' }, Sat: { lunch: '', dinner: '' }, Sun: { lunch: '', dinner: '' } } })} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold">取消</button>}</div>
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
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingRule(rule)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14} /></button><button onClick={() => handleDeleteRule(rule.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14} /></button></div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-600 text-center">
                        {DAYS_OF_WEEK.map(day => (
                          <div key={day} className="flex flex-col border rounded bg-slate-50 p-1">
                            <span className="font-bold mb-1">{day}</span>
                            <span className="text-slate-400">L: {getPriceVal(rule, day, 'lunch') ? `$${parseInt(getPriceVal(rule, day, 'lunch') / 1000)}k` : '-'}</span>
                            <span className="text-blue-600 font-bold">D: {getPriceVal(rule, day, 'dinner') ? `$${parseInt(getPriceVal(rule, day, 'dinner') / 1000)}k` : '-'}</span>
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
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">{editingMenu.id ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}{editingMenu.id ? "編輯預設" : "新增預設"}</h3>
                <div className="space-y-4">
                  <div className="flex space-x-2"><button onClick={() => setEditingMenu(p => ({ ...p, type: 'food' }))} className={`flex-1 py-2 rounded border text-sm font-bold ${editingMenu.type === 'food' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-slate-300'}`}><Utensils size={14} className="inline mr-1" /> Menu</button><button onClick={() => setEditingMenu(p => ({ ...p, type: 'drink' }))} className={`flex-1 py-2 rounded border text-sm font-bold ${editingMenu.type === 'drink' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-slate-300'}`}><Coffee size={14} className="inline mr-1" /> Drink</button></div>
                  <FormInput label="標題" value={editingMenu.title} onChange={e => setEditingMenu(p => ({ ...p, title: e.target.value }))} />

                  {/* DUAL PRICES */}
                  <div className="grid grid-cols-2 gap-4">
                    <MoneyInput label="平日價 (Mon-Thu)" name="priceWeekday" value={editingMenu.priceWeekday} onChange={e => setEditingMenu(p => ({ ...p, priceWeekday: e.target.value }))} />
                    <MoneyInput label="週末價 (Fri-Sun)" name="priceWeekend" value={editingMenu.priceWeekend} onChange={e => setEditingMenu(p => ({ ...p, priceWeekend: e.target.value }))} />
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center"><PieChart size={14} className="mr-1.5" /> 部門拆帳 (金額)</h4>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
                      {DEPARTMENTS.map(dept => (
                        <div key={dept.key}>
                          <label className="block text-xs font-medium text-slate-500 mb-1">{dept.label.split(' ')[0]}</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input type="number" value={editingMenu.allocation?.[dept.key] || ''} onChange={e => setEditingMenu(prev => ({ ...prev, allocation: { ...prev.allocation, [dept.key]: e.target.value } }))} className="w-full pl-5 pr-2 py-1 text-sm border border-slate-300 rounded outline-none" placeholder="0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {editingMenu.type === 'food' ? (<FormTextArea label="內容" value={editingMenu.content} onChange={e => setEditingMenu(p => ({ ...p, content: e.target.value }))} rows={6} placeholder="輸入詳細菜色..." />) : (<FormInput label="酒水內容" value={editingMenu.content} onChange={e => setEditingMenu(p => ({ ...p, content: e.target.value }))} />)}
                  <div className="flex gap-2"><button onClick={handleSaveMenu} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold">儲存</button>{editingMenu.id && <button onClick={() => setEditingMenu({ id: null, title: '', content: '', type: 'food', priceWeekday: '', priceWeekend: '', allocation: {} })} className="px-4 bg-slate-100 rounded-lg text-slate-600 font-bold">取消</button>}</div>
                </div>
              </Card>
            </div>
            <div className="md:col-span-7">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-700">預設列表</h3></div>
                {/* PRESETS LIST (Updated with Allocation Status) */}
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {localSettings.defaultMenus.map(m => {
                    // --- CALCULATION LOGIC ---
                    const price = parseFloat(m.priceWeekday) || parseFloat(m.price) || 0;
                    const allocSum = Object.values(m.allocation || {}).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                    let allocBadge = null;

                    if (m.type === 'food') {
                      if (allocSum === 0) {
                        allocBadge = <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-200">未分拆</span>;
                      } else if (Math.abs(price - allocSum) > 1) {
                        allocBadge = <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200">⚠️ 待分拆 ${Math.round(price - allocSum)}</span>;
                      }
                    }
                    // -------------------------

                    return (
                      <div key={m.id} className="p-4 hover:bg-emerald-50/50 transition-colors group">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${m.type === 'food' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {m.type === 'food' ? 'MENU' : 'DRINK'}
                            </span>
                            <span className="font-bold text-slate-800">{m.title}</span>
                            {allocBadge} {/* ✅ DISPLAY BADGE HERE */}
                          </div>
                          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingMenu(m)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteMenu(m.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center text-[10px] text-slate-500 mb-1">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">平日 ${formatMoney(m.priceWeekday)}</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">週末 ${formatMoney(m.priceWeekend)}</span>
                        </div>
                        {m.allocation && (
                          <div className="flex gap-2 text-[10px] text-slate-400 mb-1">
                            {Object.entries(m.allocation).map(([k, v]) => v > 0 && (
                              <span key={k} className="border border-slate-200 px-1 rounded">
                                {DEPARTMENTS.find(d => d.key === k)?.label.split(' ')[0]}:${v}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-500 whitespace-pre-wrap line-clamp-2">{m.content}</p>
                      </div>
                    );
                  })}
                </div>
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
                  {editingPaymentRule.id ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
                  {editingPaymentRule.id ? "編輯付款規則" : "新增付款規則"}
                </h3>

                <div className="space-y-4">
                  <FormInput
                    label="規則名稱 (Rule Name)"
                    placeholder="e.g. Standard Wedding, Last Minute"
                    value={editingPaymentRule.name}
                    onChange={e => setEditingPaymentRule(p => ({ ...p, name: e.target.value }))}
                  />

                  <FormInput
                    label="最少提前月數 (Min Months in Advance)"
                    type="number"
                    placeholder="0 = 適用於所有"
                    value={editingPaymentRule.minMonthsInAdvance}
                    onChange={e => setEditingPaymentRule(p => ({ ...p, minMonthsInAdvance: parseInt(e.target.value) || 0 }))}
                  />

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">分期設定 (Installments)</div>

                    {/* Deposit 1 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-600">訂金 1 (%)</label>
                        <div className="relative">
                          <input type="number" value={editingPaymentRule.deposit1} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit1: parseFloat(e.target.value) || 0 }))} className="w-full pl-2 pr-6 py-1 text-sm border rounded outline-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">付款限期 (Offset)</label>
                        <select value={editingPaymentRule.deposit1Offset} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit1Offset: parseInt(e.target.value) }))} className="w-full py-1 text-sm border rounded outline-none bg-white">
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
                          <input type="number" value={editingPaymentRule.deposit2} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit2: parseFloat(e.target.value) || 0 }))} className="w-full pl-2 pr-6 py-1 text-sm border rounded outline-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">付款限期 (Offset)</label>
                        <select value={editingPaymentRule.deposit2Offset} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit2Offset: parseInt(e.target.value) }))} className="w-full py-1 text-sm border rounded outline-none bg-white">
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
                          <input type="number" value={editingPaymentRule.deposit3} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit3: parseFloat(e.target.value) || 0 }))} className="w-full pl-2 pr-6 py-1 text-sm border rounded outline-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">付款限期 (Offset)</label>
                        <select value={editingPaymentRule.deposit3Offset} onChange={e => setEditingPaymentRule(p => ({ ...p, deposit3Offset: parseInt(e.target.value) }))} className="w-full py-1 text-sm border rounded outline-none bg-white">
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
                            <button onClick={() => setEditingPaymentRule(rule)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeletePaymentRule(rule.id)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        {/* Visual Timeline Bar */}
                        <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 mt-3">
                          <div style={{ width: `${rule.deposit1}%` }} className="bg-emerald-400" title={`1st Payment: ${rule.deposit1}%`}></div>
                          <div style={{ width: `${rule.deposit2}%` }} className="bg-emerald-300" title={`2nd Payment: ${rule.deposit2}%`}></div>
                          <div style={{ width: `${rule.deposit3}%` }} className="bg-emerald-200" title={`3rd Payment: ${rule.deposit3}%`}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                          <span>Dep 1: {rule.deposit1}%</span>
                          <span>Dep 2: {rule.deposit2}%</span>
                          <span>Dep 3: {rule.deposit3}%</span>
                          <span className="text-red-400 font-bold">Bal: {100 - (rule.deposit1 + rule.deposit2 + rule.deposit3)}%</span>
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

const DashboardView = ({ events, openEditModal, setIsDataAiOpen }) => {
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
      const balanceVal = Number(e.totalAmount) - Number(e.deposit1 || 0) - Number(e.deposit2 || 0) - Number(e.deposit3 || 0);
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
      const balanceVal = Number(e.totalAmount) - Number(e.deposit1 || 0) - Number(e.deposit2 || 0) - Number(e.deposit3 || 0);
      if (balanceVal > 0 && !e.balanceReceived) {
        const checkDate = balanceDate || e.date;
        if (checkDate >= todayStr && checkDate <= next14DaysStr) {
          list.push({ id: e.id, name: e.eventName, type: '尾數 (Balance)', date: checkDate, amount: balanceVal });
        }
      }
    });
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">儀表板 (Dashboard)</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">實時營業數據與訂單追蹤</p>
        </div>
        <button
          onClick={() => setIsDataAiOpen(true)}
          className="group relative px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 text-sm"
        >
          <BarChart3 size={18} className="text-emerald-100 group-hover:-translate-y-0.5 transition-transform" />
          <span>AI 數據分析 (Ask DB)</span>
        </button>
      </div>
      {/* 0. Payment Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {overduePayments.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-pulse-slow">
            <h3 className="text-red-800 font-bold flex items-center mb-3">
              <AlertTriangle size={20} className="mr-2" /> 逾期款項 (Overdue Payments)
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

        <Card className={`border-t-4 border-t-amber-400 ${overduePayments.length === 0 ? 'lg:col-span-2' : ''}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center">
              <Bell size={18} className="mr-2 text-amber-500" /> 即將到期款項 (14 Days)
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
          <Card className="border-t-4 border-t-blue-500">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center">
                <CalendarIcon size={18} className="mr-2 text-blue-500" /> 近期活動 (Upcoming Events)
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
                        <Clock size={12} className="mr-1" /> {event.startTime} - {event.endTime}
                        <span className="mx-2 text-slate-300">|</span>
                        <MapPin size={12} className="mr-1" /> {event.venueLocation || '未定'}
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
                <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><ChevronLeft size={16} /></button>
                <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><ChevronRight size={16} /></button>
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
                              <Clock size={10} className="mr-1" /> {event.startTime}-{event.endTime}
                              {event.venueLocation && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span className="truncate">{event.venueLocation}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${event.status === 'confirmed' ? 'bg-emerald-500' :
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
  const [printData, setPrintData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isDataAiOpen, setIsDataAiOpen] = useState(false);
  const [isTranslatingDrinks, setIsTranslatingDrinks] = useState(false);
  const { generate, loading } = useAI();
  // ✅ PASTE THIS INSIDE App()
  const handleAiAction = async (channel, intent) => {
    if (!formData.clientName || !formData.date) {
      addToast("請先填寫客戶名稱及日期 (Client Name & Date required)", "error"); // Use your addToast helper
      return;
    }

    // 1. Build Context
    const eventDetails = `
      Client: ${formData.clientName}
      Date: ${formData.date}
      Venue: ${formData.venueLocation || "King Lung Heen"}
      Tables: ${formData.tableCount || "TBD"}
      Deposit: ${formData.deposit1 || "0"}
      Total Balance: ${formData.totalAmount || "TBD"}
    `;

    let systemPrompt = "";
    let userPrompt = "";

    // 2. Define Prompts
    if (channel === 'EMAIL') {
      systemPrompt = "You are a professional Banquet Manager at King Lung Heen. Write a formal, polite email in Traditional Chinese (Cantonese context). Return JSON format with keys: 'subject' and 'body'.";
      if (intent === 'payment') userPrompt = `Write a payment reminder. Event details: ${eventDetails}. Balance is due.`;
      else if (intent === 'summary') userPrompt = `Write an event summary confirmation. Details: ${eventDetails}. Ask for confirmation.`;
    } else if (channel === 'WHATSAPP') {
      systemPrompt = "You are a helpful assistant. Write a short, friendly WhatsApp message in Traditional Chinese. Use emojis 🎂🥂. Do not include a subject line.";
      if (intent === 'payment') userPrompt = `Friendly reminder to settle balance for event on ${formData.date}.`;
      else if (intent === 'summary') userPrompt = `Confirmation message looking forward to event on ${formData.date}.`;
    }

    // 3. Call AI
    const aiResponse = await generate(
      userPrompt + (channel === 'EMAIL' ? " Output as JSON." : ""),
      systemPrompt
    );

    // 4. Update State
    if (aiResponse) {
      if (channel === 'EMAIL') {
        try {
          const json = JSON.parse(aiResponse);
          setFormData(prev => ({ ...prev, emailSubject: json.subject, emailBody: json.body }));
          addToast("Email Draft Generated!", "success");
        } catch (e) {
          setFormData(prev => ({ ...prev, emailBody: aiResponse }));
        }
      } else {
        setFormData(prev => ({ ...prev, whatsappDraft: aiResponse }));
        addToast("WhatsApp Draft Generated!", "success");
      }
    }
  };
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
    defaultMenus: [],
    paymentRules: []
  });

  const [isMenuSelectOpen, setIsMenuSelectOpen] = useState(false); // Control the modal
  const [tempPrintData, setTempPrintData] = useState(null); // Hold data for printing
  const [previewVersion, setPreviewVersion] = useState(null); // Track which version is being previewed

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
      qty: 1,
      applySC: true        // NEW: Service Charge Toggle per menu
    }],
    menuVersions: [],
    specialMenuReq: '',
    staffMeals: '',
    drinksPackage: '',
    preDinnerSnacks: '',
    allergies: '',
    servingStyle: '圍餐',
    platingFee: '',
    platingFeeApplySC: true,
    enableHandCarry: false, // Toggle for Hand Carry
    handCarryStaffQty: '',  // Number of staff
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
    balanceDate: '',
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
    // ✅ NEW: Rundown
    rundown: [
      { id: 1, time: '18:00', activity: '恭候 (Reception)' },
      { id: 2, time: '20:00', activity: '入席 (March In)' }
    ],
    busCharge: '',
    // ✅ UPDATED BUS STRUCTURE (Arrays for multiple buses)
    busInfo: {
      enabled: false,
      arrivals: [{ id: 1, time: '18:30', location: '', plate: '' }],
      departures: [{ id: 1, time: '22:30', location: '', plate: '' }],
      customRoutes: []
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
    //AI feature
    emailSubject: '',
    emailBody: '',
    whatsappDraft: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formTab, setFormTab] = useState('basic');

  // --- JUMP TO ALLOCATION LOGIC ---
  const [highlightTarget, setHighlightTarget] = useState(null);

  const jumpToAllocation = (target) => {
    setHighlightTarget(target);
    setFormTab('fnb');
  };

  useEffect(() => {
    if (formTab === 'fnb' && highlightTarget) {
      setTimeout(() => {
        if (highlightTarget.type === 'menu') {
          setFormData(prev => ({
            ...prev,
            menus: prev.menus.map(m => m.id === highlightTarget.id ? { ...m, showAllocation: true } : m)
          }));
          const el = document.getElementById(`menu-item-${highlightTarget.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        else if (highlightTarget.type === 'drinks') {
          setFormData(prev => ({ ...prev, showDrinkAllocation: true }));
          const el = document.getElementById('drinks-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setHighlightTarget(null);
      }, 100);
    }
  }, [formTab, highlightTarget]);

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

    try {
      const systemPrompt = `You are a professional banquet menu translator. 
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
        King Lung Heen Fried Rice`;

      // ✅ Use your secure backend hook instead of a raw fetch
      let translatedText = await generate(content, systemPrompt);

      if (!translatedText) throw new Error("Translation API Failed");

      // Cleanup formatting
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

  // --- NEW: Beverage Translation Handler ---
  const handleTranslateDrinks = async () => {
    const content = formData.drinksPackage;
    if (!content) {
      addToast("請先輸入酒水內容", "error");
      return;
    }

    setIsTranslatingDrinks(true);

    try {
      const systemPrompt = `You are a professional banquet translator. 
        Task: Translate the beverage list from Chinese to English line by line.
        
        STRICT RULES:
        1. **Format:** Output the original Chinese line, followed immediately by the English translation on the next line.
        2. **Spacing:** Remove ALL empty lines.
        3. **Punctuation:** Do NOT add full stops.
        
        Example:
        無限量供應汽水
        Unlimited Soft Drinks
        指定紅酒
        House Red Wine`;

      // ✅ Use your secure backend hook
      let translatedText = await generate(content, systemPrompt);

      if (!translatedText) throw new Error("Translation API Failed");

      // Cleanup formatting
      translatedText = translatedText.replace(/\n\s*\n/g, '\n').trim();

      setFormData(prev => ({ ...prev, drinksPackage: translatedText }));
      addToast("酒水翻譯完成！", "success");

    } catch (error) {
      console.error(error);
      addToast("翻譯失敗，請稍後再試", "error");
    } finally {
      setIsTranslatingDrinks(false);
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

  const handleMenuPrintSelection = (selection) => {
    // 1. Prepare data based on selection
    let dataToPrint = { ...formData };

    if (selection !== 'all') {
      // User selected a specific index -> Filter the menus array
      dataToPrint.menus = [formData.menus[selection]];
    }

    // 2. Set temporary data for the Print View
    setTempPrintData(dataToPrint);

    // 3. Trigger Print
    setPrintMode('MENU_CONFIRM');
    setIsMenuSelectOpen(false);

    // Slight delay to allow React to render the tempPrintData
    setTimeout(() => {
      window.print();
      // Optional: Reset temp data after printing if you want, 
      // but keeping it ensures the background view doesn't flicker back.
    }, 200);
  };

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

    // 1. Get the percentages from the rule
    const p1 = matchingRule.deposit1 || 0;
    const p2 = matchingRule.deposit2 || 0;
    const p3 = matchingRule.deposit3 || 0;

    // 2. Calculate the base rounded amounts
    let dep1 = p1 > 0 ? Math.round(currentTotal * (p1 / 100)) : '';
    let dep2 = p2 > 0 ? Math.round(currentTotal * (p2 / 100)) : '';
    let dep3 = p3 > 0 ? Math.round(currentTotal * (p3 / 100)) : '';

    // 🌟 3. THE REMAINDER FIX 🌟
    // If the deposits are supposed to equal 100% of the bill, force the last deposit to be the exact remainder.
    if (p1 + p2 + p3 === 100) {
      if (p3 > 0) {
        dep3 = currentTotal - (Number(dep1) || 0) - (Number(dep2) || 0);
      } else if (p2 > 0) {
        dep2 = currentTotal - (Number(dep1) || 0);
      } else if (p1 > 0) {
        dep1 = currentTotal;
      }
    }

    return {
      deposit1: dep1,
      deposit1Date: p1 > 0 ? addMonths(orderDate, matchingRule.deposit1Offset || 0) : '',
      deposit2: dep2,
      deposit2Date: p2 > 0 ? addMonths(orderDate, matchingRule.deposit2Offset || 0) : '',
      deposit3: dep3,
      deposit3Date: p3 > 0 ? addMonths(orderDate, matchingRule.deposit3Offset || 0) : '',
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
        const userRef = doc(db, 'artifacts', appId, 'private', 'data', 'users', u.uid);
        const userSnap = await getDoc(userRef);

        let profileData = {
          uid: u.uid,
          lastLogin: serverTimestamp(),
          role: 'staff',
          displayName: u.displayName || u.email || `User ${u.uid.slice(0, 4)}`,
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
    setTempPrintData(formData);
    setPrintMode('QUOTATION');
    setTimeout(() => window.print(), 100);
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
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
    const q = query(collection(db, 'artifacts', appId, 'private', 'data', 'events'));
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
  useEffect(() => {
    if (events.length === 0) return;

    // Get today's date in strictly YYYY-MM-DD format (local timezone)
    const todayStr = new Date().toLocaleDateString('en-CA');

    events.forEach(async (event) => {
      // If the event date is strictly in the past, and it's not already completed or cancelled
      if (event.date && event.date < todayStr && (event.status === 'confirmed' || event.status === 'tentative')) {
        try {
          // 1. Update the main private database
          const eventRef = doc(db, 'artifacts', appId, 'private', 'data', 'events', event.id);
          await updateDoc(eventRef, { status: 'completed' });

          // 2. Update the public calendar (so SleekFlow knows the date is free again)
          const publicRef = doc(db, 'artifacts', appId, 'public_calendar', event.id);
          await updateDoc(publicRef, { status: 'completed' });

          console.log(`Auto-completed past event: ${event.eventName}`);
        } catch (err) {
          console.error("Auto-complete failed:", err);
        }
      }
    });
  }, [events]);
  // Fetch Settings
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'private', 'data', 'settings', 'config');
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

      // 4. Recalculate Total Amount using the newly built newData object
      return {
        ...newData,
        totalAmount: generateBillingSummary(newData).grandTotal
      };
    });
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = value.toString().replace(/,/g, '');

    setFormData(prev => {
      const newData = { ...prev, [name]: cleanValue };
      return updateFinanceState(newData); // 🔥 Instantly syncs total AND deposits!
    });
  };

  // 🌟 MASTER FINANCE UPDATER 🌟
  // This automatically keeps the Grand Total and the Payment Schedule perfectly in sync
  const updateFinanceState = (newData) => {
    // 1. Get the true total
    const newTotal = generateBillingSummary(newData).grandTotal;
    let updates = { totalAmount: newTotal };

    // 2. If Auto-Schedule is ON, instantly recalculate the deposits to match the new total
    if (newData.autoSchedulePayment) {
      const terms = calculatePaymentTerms(newTotal, newData.date);
      if (terms) {
        updates = { ...updates, ...terms };
      }
    }

    // 3. Return the fully synchronized state
    return { ...newData, ...updates };
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
        return { ...newData, totalAmount: generateBillingSummary(newData).grandTotal };
      });
      addToast(`已載入: ${preset.title}`, "success");
    }
  };

  const addMenu = () => {
    setFormData(prev => {
      // 1. Create new menu item
      const newMenu = {
        id: Date.now(),
        title: '',
        content: '',
        price: '',
        priceType: 'perTable',
        qty: prev.tableCount || 1,
        applySC: true
      };

      const newMenus = [...(prev.menus || []), newMenu];

      // 2. Build the state object first so the calculator can see the new menu
      const updatedState = {
        ...prev,
        menus: newMenus
      };

      // 3. Return the state with the calculated grandTotal
      return updateFinanceState(newData);
    });
  };

  // --- Updated removeMenu with Recalculation ---
  const removeMenu = (id) => {
    setFormData(prev => {
      const newMenus = prev.menus.filter(m => m.id !== id);
      const newData = { ...prev, menus: newMenus };

      return updateFinanceState(newData);
    });
  };
  // --- MENU VERSIONING HANDLERS ---
  const saveMenuSnapshot = () => {
    if (!formData.menus || formData.menus.length === 0) return addToast("沒有菜單可儲存", "error");

    // 1. Calculate next version number based on existing list length
    const nextVerNum = (formData.menuVersions?.length || 0) + 1;
    const defaultName = `Ver ${nextVerNum}`;

    // 2. Ask user for a name (default to "Ver X")
    let snapshotName = prompt("請輸入版本名稱 (Enter Version Name):", defaultName);

    // If user cancels prompt, stop. If empty, use default.
    if (snapshotName === null) return;
    if (snapshotName.trim() === "") snapshotName = defaultName;

    // 3. Create Snapshot
    const newSnapshot = {
      id: Date.now(),
      name: snapshotName,
      data: JSON.parse(JSON.stringify(formData.menus)), // Deep copy menu data
      totalAmount: formData.totalAmount, // Save price state
      timestamp: new Date().toISOString()
    };

    setFormData(prev => ({
      ...prev,
      menuVersions: [newSnapshot, ...(prev.menuVersions || [])] // Add to top of list
    }));

    addToast(`已儲存: ${snapshotName}`, "success");
  };

  const restoreMenuSnapshot = (snapshot) => {
    setFormData(prev => ({
      ...prev,
      menus: snapshot.data,
      totalAmount: generateBillingSummary({ ...prev, menus: snapshot.data }) // Recalculate total immediately
    }));
    addToast(`已還原至版本: ${snapshot.name}`, "success");
    setPreviewVersion(null); // Close modal
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
      return updateFinanceState(newData);
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
    setTempPrintData(null); // ✅ FIX: Clear leftover print data
    setPrintMode('EO');     // ✅ FIX: Reset print mode

    setEditingEvent(null);
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
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
    setTempPrintData(null); // ✅ FIX: Clear any leftover print data from previous clients
    setPrintMode('EO');     // ✅ FIX: Reset print mode to default

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
      stageDecorPhotos: event.stageDecorPhotos || (event.stageDecorPhoto ? [event.stageDecorPhoto] : []),
      venueDecorPhotos: event.venueDecorPhotos || (event.venueDecorPhoto ? [event.venueDecorPhoto] : []),
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

  const handleMultiImageUpload = async (files, fieldName) => {
    if (!user || !files || files.length === 0) return;

    addToast(`正在上傳 ${files.length} 張圖片... (Uploading...)`, "info");
    const newUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      } catch (e) {
        addToast(`上傳 ${file.name} 失敗`, "error");
      }
    }

    if (newUrls.length > 0) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), ...newUrls]
      }));
      addToast("圖片上傳完成！", "success");
    }
  };

  const handleRemoveProof = (key) => {
    setConfirmConfig({
      isOpen: true,
      title: "移除收據",
      message: "確定要移除此收據嗎？此操作無法還原。",
      onConfirm: () => {
        setFormData(prev => ({ ...prev, [key]: '' }));
        setConfirmConfig({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const privateRef = collection(db, 'artifacts', appId, 'private', 'data', 'events');
    const publicCalendarRef = collection(db, 'artifacts', appId, 'public_calendar');

    try {
      let docId;
      if (editingEvent) {
        docId = editingEvent.id;
        await updateDoc(doc(privateRef, docId), formData);
      } else {
        const newDoc = await addDoc(privateRef, { ...formData, createdAt: serverTimestamp() });
        docId = newDoc.id;
      }

      // --- SYNC TO PUBLIC CALENDAR FOR SLEEKFLOW ---
      await setDoc(doc(publicCalendarRef, docId), {
        date: formData.date,
        venue: formData.venueLocation || "Main Hall",
        // Only send 'busy' if the status is confirmed or tentative
        isAvailable: formData.status === 'cancelled' ? true : false,
        status: formData.status
      });

      addToast("Saved & Calendar Synced", "success");
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast("Save failed", "error");
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
          await deleteDoc(doc(db, 'artifacts', appId, 'private', 'data', 'events', id));
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
    setTempPrintData(formData);
    setPrintMode('EO');
    setTimeout(() => window.print(), 100);
  };
  const handlePrintReceipt = () => {
    setTempPrintData(formData);
    setPrintMode('RECEIPT');
    setTimeout(() => window.print(), 100);
  };

  // --- Briefing Sheet Handlers ---
  const handlePrintBriefing = () => {
    setTempPrintData(formData);
    setPrintMode('BRIEFING');
    setTimeout(() => window.print(), 100);
  };

  // --- Views ---

  const EventsListView = () => {
    const [filter, setFilter] = useState('');
    // 1. New State for Status Filter & Pagination
    const [statusFilter, setStatusFilter] = useState('incomplete'); // 'incomplete', 'completed', 'all'
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 30;

    // Reset to page 1 whenever filters change
    useEffect(() => {
      setCurrentPage(1);
    }, [filter, statusFilter]);

    // 2. Filter & Sort Logic
    const filteredAndSorted = useMemo(() => {
      return events.filter(e => {
        // Status Filter Logic
        // "未完成" (Incomplete) = Tentative or Confirmed. Excludes Completed & Cancelled.
        if (statusFilter === 'completed' && e.status !== 'completed') return false;
        if (statusFilter === 'incomplete' && (e.status === 'completed' || e.status === 'cancelled')) return false;

        // Text Search Filter
        const searchLower = filter.toLowerCase();
        const matchesSearch =
          (e.eventName || '').toLowerCase().includes(searchLower) ||
          (e.clientName || '').toLowerCase().includes(searchLower) ||
          (e.orderId || '').toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;

        return true;
      });
    }, [events, filter, statusFilter]);

    // 3. Pagination Logic
    const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
    const paginatedEvents = filteredAndSorted.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    // 4. Inject "Month Header" Rows
    const tableRows = useMemo(() => {
      const rows = [];
      let currentMonthStr = '';

      paginatedEvents.forEach(event => {
        if (!event.date) {
          rows.push({ type: 'event', data: event, id: event.id });
          return;
        }

        const dateObj = new Date(event.date);
        const monthStr = `${dateObj.getFullYear()}年 ${dateObj.getMonth() + 1}月`;

        // If the month changes, push a Header Row first
        if (monthStr !== currentMonthStr) {
          rows.push({ type: 'month-header', label: monthStr, id: `header-${monthStr}-${event.id}` });
          currentMonthStr = monthStr;
        }

        // Then push the actual event
        rows.push({ type: 'event', data: event, id: event.id });
      });

      return rows;
    }, [paginatedEvents]);

    return (
      <Card className="animate-in fade-in flex flex-col h-full">
        {/* TOP BAR: Search & Filters */}
        <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">

          {/* Search Box */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜尋訂單編號、活動名稱或客戶..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {/* Filter & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Status Filter Toggles */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('incomplete')}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-md transition-all ${statusFilter === 'incomplete' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                未完成
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-md transition-all ${statusFilter === 'completed' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                已完成
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-md transition-all ${statusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                全部
              </button>
            </div>

            <button onClick={openNewEventModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-sm whitespace-nowrap w-full sm:w-auto justify-center">
              <Plus size={18} className="mr-2" /> 新增訂單 (New EO)
            </button>
          </div>
        </div>

        {/* TABLE AREA */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
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
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    找不到符合條件的訂單 (No records found)
                  </td>
                </tr>
              ) : (
                tableRows.map(row => {

                  // A. Render Month Separator Row
                  if (row.type === 'month-header') {
                    return (
                      <tr key={row.id} className="bg-indigo-50/50 border-y border-indigo-100">
                        <td colSpan="6" className="px-6 py-2">
                          <div className="flex items-center text-sm font-black text-indigo-800 tracking-widest">
                            <CalendarIcon size={16} className="mr-2 text-indigo-500" />
                            {row.label}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // B. Render Standard Event Row
                  const event = row.data;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-base">{event.eventName}</span>
                          <span className="text-xs text-blue-600 font-mono mt-1">{event.orderId}</span>
                          <div className="text-xs text-slate-500 mt-1 flex items-center">
                            <Clock size={12} className="mr-1" /> {event.date}
                            <span className="mx-1">•</span>
                            {event.startTime}-{event.endTime}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{event.clientName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{event.clientPhone}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="font-bold">{event.tableCount ? `${event.tableCount} 席` : '-'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{event.guestCount ? `${event.guestCount} 人` : '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={event.status} />
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono">
                        ${formatMoney(event.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={() => openEditModal(event)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="編輯">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(event.id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="刪除">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM BAR: Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0">
            <span className="text-sm font-bold text-slate-500">
              顯示第 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} 項，共 {filteredAndSorted.length} 項
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors flex items-center"
              >
                <ChevronLeft size={16} className="mr-1" /> 上一頁
              </button>
              <div className="text-sm font-bold text-slate-700 px-3 font-mono">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors flex items-center"
              >
                下一頁 <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        )}
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
            <span className="text-l font-bold">璟瓏軒宴會管理系統</span>
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
                {userProfile?.displayName?.slice(0, 2).toUpperCase() || user?.uid?.slice(0, 2)}
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
            <span className="font-bold text-slate-900 flex items-center"><MapPin size={18} className="mr-2 text-blue-600" /> 璟瓏軒宴會管理系統</span>
            <div className="space-x-4 text-sm font-medium">
              <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'}>Home</button>
              <button onClick={() => setActiveTab('events')} className={activeTab === 'events' ? 'text-blue-600' : 'text-slate-500'}>EOs</button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
              {activeTab === 'dashboard' && <DashboardView events={events} openEditModal={openEditModal} setIsDataAiOpen={setIsDataAiOpen} />}
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
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${formTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
                          <Save size={16} className="mr-1" /> 儲存版本
                        </button>
                        <button
                          type="button"
                          onClick={addMenu}
                          className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-bold flex items-center transition-colors border border-blue-200"
                        >
                          <Plus size={16} className="mr-1" /> 新增菜單
                        </button>
                      </div>
                    </div>

                    {/* --- 2. VERSION HISTORY LIST --- */}
                    {formData.menuVersions && formData.menuVersions.length > 0 && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 animate-in fade-in">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase flex items-center">
                            <History size={14} className="mr-1" /> 版本紀錄 (Version History)
                          </span>
                          <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {formData.menuVersions.length} Saved
                          </span>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                          {formData.menuVersions.map(v => (
                            <div key={v.id} className="flex-shrink-0 bg-white border border-slate-300 rounded-lg p-3 text-xs flex flex-col gap-2 shadow-sm min-w-[140px] group hover:border-blue-400 transition-colors">
                              <div>
                                <div className="font-bold text-slate-800 text-sm truncate" title={v.name}>{v.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(v.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {v.data.length} Items
                                </div>
                              </div>

                              <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                                {/* PREVIEW / RESTORE BUTTON */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewVersion(v)} // ✅ Opens Modal
                                  className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded py-1.5 font-bold border border-blue-100 transition-colors flex items-center justify-center"
                                >
                                  <Eye size={12} className="mr-1" /> 查看
                                </button>

                                {/* DELETE BUTTON */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('確定刪除此版本?')) deleteMenuSnapshot(v.id);
                                  }}
                                  className="px-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* --- 3. MENU ITEMS LIST (With Allocation Status) --- */}
                    <div className="space-y-4">
                      {formData.menus && formData.menus.map((menu, index) => {
                        // --- STATUS CALCULATION LOGIC ---
                        const price = parseFloat(menu.price) || 0;
                        const allocSum = Object.values(menu.allocation || {}).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                        const diff = price - allocSum;

                        // Create Badge Element based on math
                        let statusBadge = null;
                        if (price > 0) {
                          if (allocSum === 0) {
                            statusBadge = (
                              <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-200 flex items-center animate-pulse">
                                <AlertCircle size={10} className="mr-1" /> 未分拆 (Unallocated)
                              </span>
                            );
                          } else if (Math.abs(diff) > 1) { // Tolerance for float rounding
                            statusBadge = (
                              <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200 flex items-center">
                                <AlertTriangle size={10} className="mr-1" /> 剩餘 ${formatMoney(diff)}
                              </span>
                            );
                          } else {
                            statusBadge = (
                              <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 flex items-center">
                                <CheckCircle size={10} className="mr-1" /> OK
                              </span>
                            );
                          }
                        }
                        // --------------------------------

                        return (
                          <div
                            key={menu.id || index}
                            id={`menu-item-${menu.id}`} // ✅ ADD THIS ID
                            className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative group transition-all hover:border-blue-200 hover:shadow-sm"
                          >
                            {/* ROW 1: HEADER & CONTROLS */}
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center flex-1 gap-2">
                                {/* Reordering Arrows */}
                                <div className="flex flex-col mr-2">
                                  <button type="button" onClick={() => moveMenu(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronLeft size={14} className="rotate-90" /></button>
                                  <button type="button" onClick={() => moveMenu(index, 'down')} disabled={index === formData.menus.length - 1} className="text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronRight size={14} className="rotate-90" /></button>
                                </div>

                                {/* Menu Title Input */}
                                <input
                                  type="text"
                                  placeholder="菜單標題 (e.g. Main Menu)"
                                  value={menu.title}
                                  onChange={(e) => handleMenuChange(menu.id, 'title', e.target.value)}
                                  className="font-bold text-slate-700 bg-transparent border-b border-dashed border-slate-400 focus:border-blue-500 focus:outline-none flex-1"
                                />

                                {/* Preset Loader */}
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

                                {/* Delete Button */}
                                {formData.menus.length > 1 && (
                                  <button type="button" onClick={() => removeMenu(menu.id)} className="text-slate-400 hover:text-red-500 p-1 rounded ml-2">
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* ROW 2: CONTENT & TRANSLATE TOOL */}
                            <div className="flex justify-between items-end mb-1">
                              <label className="text-xs font-bold text-slate-500">菜單內容 (一行一項)</label>
                              <button
                                type="button"
                                onClick={() => handleTranslateMenu(menu.id, menu.content)}
                                disabled={translatingMenuId === menu.id || !menu.content}
                                className="flex items-center text-[10px] bg-violet-100 text-violet-700 px-2 py-1 rounded hover:bg-violet-200 disabled:opacity-50 transition-colors"
                              >
                                {translatingMenuId === menu.id ? <><Loader2 size={12} className="animate-spin mr-1" /> 翻譯中...</> : <><Languages size={12} className="mr-1" /> AI 中英對照翻譯</>}
                              </button>
                            </div>

                            {/* Content Textarea */}
                            <textarea
                              rows={8}
                              placeholder="輸入詳細菜色..."
                              value={menu.content}
                              onChange={(e) => handleMenuChange(menu.id, 'content', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white mb-3 font-mono leading-relaxed"
                            />

                            {/* ROW 3: FOOTER BAR (Price & Allocation Toggle) */}
                            <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                              {/* Toggle Button */}
                              <button
                                type="button"
                                onClick={() => toggleMenuAllocation(menu.id)}
                                className={`flex items-center text-xs font-bold px-3 py-1.5 rounded transition-colors ${menu.showAllocation ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`}
                              >
                                <PieChart size={14} className="mr-1.5" />
                                {menu.showAllocation ? "隱藏拆帳 (Hide)" : "設定拆帳 (Allocation)"}
                                {/* Show badge INSIDE button if panel is closed, so user sees status immediately */}
                                {!menu.showAllocation && statusBadge}
                              </button>

                              {/* Price Info */}
                              <div className="text-xs text-slate-400 flex items-center">
                                <span className="mr-2">{menu.priceType === 'perTable' ? '每席' : menu.priceType === 'perPerson' ? '每位' : '固定'}價:</span>
                                <span className="font-mono text-slate-700 font-bold text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  ${formatMoney(menu.price)}
                                </span>
                                {/* Show badge NEXT to price if panel is open */}
                                {menu.showAllocation && statusBadge}
                              </div>
                            </div>

                            {/* ROW 4: ALLOCATION PANEL (Conditional) */}
                            {menu.showAllocation && (
                              <div className="mt-3 bg-white p-3 rounded border border-slate-200 animate-in slide-in-from-top-2 shadow-sm">
                                {/* Helper Header */}
                                <div className="flex justify-between text-[10px] text-slate-400 mb-2 border-b border-slate-100 pb-1">
                                  <span>總金額 (Total): ${formatMoney(price)}</span>
                                  <span className={Math.abs(diff) > 1 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                                    {Math.abs(diff) < 1 ? "✅ 平衡 (Balanced)" : `⚠️ 剩餘未分: $${formatMoney(diff)}`}
                                  </span>
                                </div>

                                {/* ✅ UPDATED: Only show Kitchen, Dim Sum, Roast */}
                                <div className="grid grid-cols-3 gap-3">
                                  {DEPARTMENTS.filter(d => FOOD_DEPTS.includes(d.key)).map(dept => (
                                    <div key={dept.key}>
                                      <label className="block text-[9px] font-bold text-slate-500 mb-0.5">{dept.label}</label>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]">$</span>
                                        <input
                                          type="number"
                                          value={menu.allocation?.[dept.key] || ''}
                                          onChange={e => handleMenuAllocationChange(menu.id, dept.key, e.target.value)}
                                          className={`w-full border rounded pl-4 pr-1 py-1 text-xs outline-none focus:ring-1 transition-colors ${menu.allocation?.[dept.key] ? 'border-emerald-300 bg-emerald-50 font-bold text-emerald-700' : 'border-slate-200 text-slate-600'}`}
                                          placeholder="0"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* --- 4. SERVING STYLE & DRINKS (RESTORED) --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100">

                      {/* Left Col: Serving Style, Plating Fee & Hand Carry */}
                      <div className="space-y-4">
                        {/* 1. Main Serving Style Selection */}
                        <FormSelect
                          label="上菜方式 (Serving Style)"
                          name="servingStyle"
                          options={SERVING_STYLES}
                          value={formData.servingStyle}
                          onChange={(e) => {
                            const newStyle = e.target.value;
                            setFormData(prev => {
                              // Only reset plating fee if not '位上'. 
                              // We keep enableHandCarry as is, in case you want hand carry for other styles.
                              const isPlating = newStyle === '位上';
                              const newData = {
                                ...prev,
                                servingStyle: newStyle,
                                platingFee: isPlating ? prev.platingFee : ''
                              };
                              return { ...newData, totalAmount: generateBillingSummary(newData).grandTotal };
                            });
                          }}
                        />

                        {/* 2. Plating Fee Input (Only shows if '位上') */}
                        {formData.servingStyle === '位上' && (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2 shadow-sm">
                            <MoneyInput
                              label="位上服務費 (每席計算)"
                              name="platingFee"
                              value={formData.platingFee}
                              onChange={handlePriceChange}
                              required
                            />
                            <div className="text-right text-xs text-blue-600 font-mono mt-1 font-bold">
                              = ${formatMoney((parseFloat(formData.platingFee) || 0) * (parseFloat(formData.tableCount) || 0))}
                            </div>
                          </div>
                        )}

                        {/* 3. Hand Carry Service (Renamed to 酒會手捧) */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between transition-all hover:border-purple-200">
                          <label className="flex items-center space-x-3 cursor-pointer select-none group">
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.enableHandCarry || false}
                                onChange={(e) => setFormData(prev => ({ ...prev, enableHandCarry: e.target.checked }))}
                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded bg-white checked:bg-purple-600 checked:border-purple-600 transition-all cursor-pointer"
                              />
                              <svg className="absolute w-3.5 h-3.5 text-white left-[3px] top-[3px] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className={`text-sm font-bold transition-colors ${formData.enableHandCarry ? 'text-purple-700' : 'text-slate-500 group-hover:text-slate-700'}`}>
                              酒會手捧 (Butler Style)
                            </span>
                          </label>

                          {/* Staff Quantity Input */}
                          {formData.enableHandCarry && (
                            <div className="flex items-center animate-in fade-in slide-in-from-left-2 duration-300 bg-white px-3 py-1.5 rounded border border-purple-100 shadow-sm">
                              <span className="text-xs text-purple-600 mr-2 font-medium">人手:</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={formData.handCarryStaffQty || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, handCarryStaffQty: e.target.value }))}
                                className="w-12 border-b-2 border-purple-200 text-center text-sm font-bold text-purple-800 focus:outline-none bg-transparent focus:border-purple-500 transition-colors"
                              />
                              <span className="text-xs text-purple-600 ml-1">Pax</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Col: Drinks Package */}
                      <div id="drinks-section">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">酒水安排 (Drinks)</label>

                        {/* Preset Selector */}
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

                        {/* Translate Button */}
                        <div className="flex justify-end mb-1">
                          <button
                            type="button"
                            onClick={handleTranslateDrinks}
                            disabled={isTranslatingDrinks || !formData.drinksPackage}
                            className="flex items-center text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
                          >
                            {isTranslatingDrinks ? (
                              <><Loader2 size={12} className="animate-spin mr-1" /> 翻譯中...</>
                            ) : (
                              <><Languages size={12} className="mr-1" /> AI 中英翻譯</>
                            )}
                          </button>
                        </div>

                        {/* Description Textarea */}
                        <textarea
                          name="drinksPackage"
                          rows={4}
                          value={formData.drinksPackage || ''}
                          onChange={handleInputChange}
                          placeholder="酒水內容詳細描述..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />

                        {/* ✅ NEW: DRINKS ALLOCATION CONTROLS (Placed here as requested) */}
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, showDrinkAllocation: !prev.showDrinkAllocation }))}
                            className={`w-full flex justify-center items-center text-xs font-bold px-3 py-1.5 rounded transition-colors border ${formData.showDrinkAllocation ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                          >
                            <PieChart size={14} className="mr-1.5" />
                            {formData.showDrinkAllocation ? "隱藏酒水拆帳" : "設定酒水拆帳 (Allocation)"}
                          </button>

                          {/* Allocation Panel */}
                          {formData.showDrinkAllocation && (
                            <div className="mt-2 bg-blue-50/50 p-3 rounded border border-blue-100 animate-in slide-in-from-top-1">
                              {(() => {
                                const dPrice = parseFloat(formData.drinksPrice) || 0;
                                const dAllocSum = Object.values(formData.drinkAllocation || {}).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                                const dDiff = dPrice - dAllocSum;

                                return (
                                  <>
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-2 border-b border-blue-100 pb-1">
                                      <span>單價: ${formatMoney(dPrice)}</span>
                                      <span className={Math.abs(dDiff) > 1 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                                        {Math.abs(dDiff) < 1 ? "✅ 平衡" : `⚠️ 剩餘: $${formatMoney(dDiff)}`}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      {/* Only show Bar, Tea, Wine */}
                                      {DEPARTMENTS.filter(d => DRINK_DEPTS.includes(d.key)).map(dept => (
                                        <div key={dept.key}>
                                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5">{dept.label.split(' ')[0]}</label>
                                          <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">$</span>
                                            <input
                                              type="number"
                                              value={formData.drinkAllocation?.[dept.key] || ''}
                                              onChange={e => setFormData(prev => ({
                                                ...prev,
                                                drinkAllocation: { ...prev.drinkAllocation, [dept.key]: e.target.value }
                                              }))}
                                              className={`w-full border rounded pl-3 pr-1 py-1 text-[10px] outline-none focus:ring-1 transition-colors ${formData.drinkAllocation?.[dept.key] ? 'border-blue-400 bg-white font-bold text-blue-700' : 'border-slate-300 bg-slate-50 text-slate-600'}`}
                                              placeholder="0"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* --- 5. REQUESTS & ALLERGIES --- */}
                    <FormTextArea label="特殊餐單需求 (Special Req)" name="specialMenuReq" value={formData.specialMenuReq} onChange={handleInputChange} />
                    <FormTextArea label="食物過敏 (Allergies)" name="allergies" rows={2} className="bg-red-50 p-2 rounded-lg" value={formData.allergies} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              {/* TAB 3: BILLING - FINAL CONSISTENT VERSION */}
              {formTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white p-0 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800">收費明細 (Charges Detail)</h3>
                      <div className="text-xs text-slate-500 font-mono">
                        系統將自動計算總額及服務費
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">

                      {/* 1. MENU ITEMS */}
                      {(formData.menus || []).map((menu, idx) => {
                        const subtotal = safeFloat(menu.price) * safeFloat(menu.qty);
                        const price = safeFloat(menu.price);
                        const allocSum = Object.values(menu.allocation || {}).reduce((a, b) => a + safeFloat(b), 0);
                        const diff = price - allocSum;
                        const isAllocated = Math.abs(diff) < 1;

                        return (
                          <div key={menu.id || idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                            <div className="col-span-5">
                              <div className="flex items-center">
                                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded mr-3 flex-shrink-0"><Utensils size={14} /></div>
                                <div>
                                  <div className="flex items-center">
                                    <span className="font-bold text-slate-700 block text-sm mr-2">{menu.title || `Menu ${idx + 1}`}</span>
                                    {price > 0 && !isAllocated && (
                                      <div className="relative group z-10 cursor-pointer" onClick={() => jumpToAllocation({ type: 'menu', id: menu.id })}>
                                        <div className="flex items-center justify-center w-4 h-4 bg-red-100 text-red-600 rounded-full border border-red-200 animate-pulse hover:bg-red-200 hover:scale-110 transition-transform"><span className="text-[10px] font-bold">!</span></div>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-400">來源: 餐飲分頁</span>
                                </div>
                              </div>
                            </div>
                            <div className="col-span-2 flex items-center justify-end">
                              <span className="text-slate-400 text-xs mr-1">$</span>
                              <input type="number" value={menu.price} onChange={e => {
                                const newMenus = [...formData.menus];
                                newMenus[idx].price = e.target.value;
                                setFormData(prev => {
                                  const newData = { ...prev, menus: newMenus };
                                  return { ...newData, totalAmount: generateBillingSummary(newData).grandTotal };
                                });
                              }} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono" placeholder="0" />
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden shadow-sm">
                                <select value={menu.priceType} onChange={e => {
                                  const type = e.target.value;
                                  let newQty = menu.qty || 1;
                                  if (type === 'perTable') newQty = formData.tableCount || 1;
                                  if (type === 'perPerson') newQty = formData.guestCount || 1;
                                  const newMenus = [...formData.menus];
                                  newMenus[idx] = { ...menu, priceType: type, qty: newQty };
                                  setFormData(prev => {
                                    const newData = { ...prev, menus: newMenus };
                                    return { ...newData, totalAmount: generateBillingSummary(newData).grandTotal };
                                  });
                                }} className="bg-slate-50 border-r border-slate-300 h-full px-2 text-[10px] outline-none text-slate-600 cursor-pointer min-w-[60px]"><option value="perTable">席</option><option value="perPerson">位</option><option value="total">固定</option></select>
                                <input type="number" value={menu.qty || ''} onChange={e => {
                                  const newMenus = [...formData.menus];
                                  newMenus[idx].qty = e.target.value;
                                  setFormData(prev => {
                                    const newData = { ...prev, menus: newMenus };
                                    return { ...newData, totalAmount: generateBillingSummary(newData).grandTotal };
                                  });
                                }} className="w-full h-full text-center outline-none text-sm font-bold text-slate-700 focus:bg-blue-50 transition-colors" />
                              </div>
                            </div>
                            <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(subtotal)}</div>
                            <div className="col-span-1 flex justify-center"><button type="button" onClick={() => {
                              const newMenus = [...formData.menus];
                              newMenus[idx].applySC = !menu.applySC;
                              setFormData(prev => {
                                const newData = { ...prev, menus: newMenus };
                                return { ...newData, totalAmount: generateBillingSummary(newData).grandTotal };
                              });
                            }} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${menu.applySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 opacity-50'}`}>SC</button></div>
                          </div>
                        );
                      })}

                      {/* 2. PLATING FEE (Conditional) */}
                      {formData.servingStyle === '位上' && (
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                          <div className="col-span-5">
                            <div className="flex items-center">
                              <div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Utensils size={14} /></div>
                              <div><span className="font-bold text-slate-700 block text-sm">位上服務費 (Plating Fee)</span><span className="text-xs text-slate-400">來源: 上菜方式設定</span></div>
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <span className="text-slate-400 text-xs mr-1">$</span>
                            <input type="number" name="platingFee" value={formData.platingFee} onChange={handlePriceChange} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700" placeholder="0" />
                          </div>
                          <div className="col-span-2 text-center text-sm text-slate-500">{formData.tableCount} (每席)</div>
                          <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.platingFee) * safeFloat(formData.tableCount))}</div>
                          <div className="col-span-1 flex justify-center"><button type="button" onClick={() => setFormData(prev => ({ ...prev, platingFeeApplySC: !prev.platingFeeApplySC, totalAmount: generateBillingSummary({ ...prev, platingFeeApplySC: !prev.platingFeeApplySC }) }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.platingFeeApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div>
                        </div>
                      )}

                      {/* 3. BEVERAGE PACKAGE */}
                      <div id="drinks-section" className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                        <div className="col-span-5">
                          <div className="flex items-center">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Coffee size={14} /></div>
                            <div className="flex-1">
                              <div className="flex items-center">
                                <input type="text" name="drinksPackage" value={formData.drinksPackage || ''} onChange={handleInputChange} placeholder="酒水套餐" className="bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 w-full" />
                                {(() => {
                                  const dPrice = safeFloat(formData.drinksPrice);
                                  const dAllocSum = Object.values(formData.drinkAllocation || {}).reduce((a, b) => a + safeFloat(b), 0);
                                  if (dPrice > 0 && Math.abs(dPrice - dAllocSum) >= 1) {
                                    return (
                                      <div className="relative group ml-2 z-10 cursor-pointer" onClick={() => jumpToAllocation({ type: 'drinks' })}>
                                        <div className="flex items-center justify-center w-4 h-4 bg-red-100 text-red-600 rounded-full border border-red-200 animate-pulse hover:bg-red-200 hover:scale-110 transition-transform"><span className="text-[10px] font-bold">!</span></div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <span className="text-xs text-slate-400">來源: 餐飲分頁</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-end"><span className="text-slate-400 text-xs mr-1">$</span><input type="number" name="drinksPrice" value={formData.drinksPrice} onChange={handlePriceChange} className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-blue-800" placeholder="0" /></div>
                        <div className="col-span-2"><div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden shadow-sm"><select name="drinksPriceType" value={formData.drinksPriceType} onChange={e => { const type = e.target.value; let newQty = 1; if (type === 'perTable') newQty = formData.tableCount; if (type === 'perPerson') newQty = formData.guestCount; setFormData(prev => ({ ...prev, drinksPriceType: type, drinksQty: newQty, totalAmount: generateBillingSummary({ ...prev, drinksPriceType: type, drinksQty: newQty }) })); }} className="bg-slate-50 border-r border-slate-300 h-full px-2 text-[10px] outline-none text-slate-600"><option value="perTable">席</option><option value="perPerson">位</option><option value="total">固定</option></select><input type="number" value={formData.drinksQty || ''} onChange={e => setFormData(prev => ({ ...prev, drinksQty: e.target.value, totalAmount: generateBillingSummary({ ...prev, drinksQty: e.target.value }) }))} className="w-full h-full text-center outline-none text-sm font-bold text-slate-700 focus:bg-blue-50 transition-colors" /></div></div>
                        <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.drinksPrice) * safeFloat(formData.drinksQty))}</div>
                        <div className="col-span-1 flex justify-center"><button type="button" onClick={() => setFormData(prev => ({ ...prev, drinksApplySC: !prev.drinksApplySC, totalAmount: generateBillingSummary({ ...prev, drinksApplySC: !prev.drinksApplySC }) }))} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.drinksApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}>SC</button></div>
                      </div>

                      {/* 4. SETUP & RECEPTION PACKAGE */}
                      {Object.entries(formData.equipment || {}).some(([k, v]) => v === true && equipmentMap[k]) && (
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                          <div className="col-span-5">
                            <div className="flex items-center">
                              <div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-3 flex-shrink-0"><Layout size={14} /></div>
                              <div>
                                <span className="font-bold block text-sm text-slate-700">舞台與接待設備 (Setup & Reception)</span>
                                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                                  {Object.entries(formData.equipment || {})
                                    .filter(([key, value]) => value === true && equipmentMap[key])
                                    .map(([key]) => equipmentMap[key].split(' (')[0])
                                    .join(', ')}
                                  {formData.equipment?.nameSign && formData.nameSignText && `, 字牌: ${formData.nameSignText}`}
                                  {formData.equipment?.hasCake && formData.cakePounds && `, 蛋糕: ${formData.cakePounds}磅`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <span className="text-slate-400 text-xs mr-1">$</span>
                            <input
                              type="number"
                              value={formData.setupPackagePrice || ''}
                              onChange={e => setFormData(prev => updateFinanceState({ ...prev, setupPackagePrice: e.target.value }))}
                              className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700"
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">固定套票</div>
                          <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.setupPackagePrice))}</div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => updateFinanceState({ ...prev, setupApplySC: !prev.setupApplySC }))}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.setupApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}
                            >SC</button>
                          </div>
                        </div>
                      )}

                      {/* 5. AV EQUIPMENT PACKAGE */}
                      {Object.entries(formData.equipment || {}).some(([k, v]) => v === true && avMap[k]) && (
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                          <div className="col-span-5">
                            <div className="flex items-center">
                              <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded mr-3 flex-shrink-0"><Tv size={14} /></div>
                              <div>
                                <span className="font-bold block text-sm text-slate-700">影音設備套票 (AV Package)</span>
                                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                                  {Object.entries(formData.equipment || {})
                                    .filter(([key, value]) => value === true && avMap[key])
                                    .map(([key]) => avMap[key].split(' (')[0])
                                    .join(', ')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <span className="text-slate-400 text-xs mr-1">$</span>
                            <input
                              type="number"
                              value={formData.avPackagePrice || ''}
                              onChange={e => setFormData(prev => updateFinanceState({ ...prev, avPackagePrice: e.target.value }))}
                              className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none text-sm font-mono text-slate-700"
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">固定套票</div>
                          <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.avPackagePrice))}</div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => updateFinanceState({ ...prev, avApplySC: !prev.avApplySC }))}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.avApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}
                            >SC</button>
                          </div>
                        </div>
                      )}

                      {/* 6. DECORATION PACKAGE */}

                      {Object.values(formData.decoration || {}).some(v => v === true) && (
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                          <div className="col-span-5">
                            <div className="flex items-center">
                              <div className="p-1.5 bg-rose-100 text-rose-600 rounded mr-3 flex-shrink-0"><Star size={14} /></div>
                              <div>
                                <span className="font-bold block text-sm text-slate-700">場地佈置套票 (Decoration)</span>
                                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                                  {Object.entries(formData.decoration || {})
                                    .filter(([key, value]) => value === true && decorationMap[key])
                                    .map(([key]) => decorationMap[key].split(' (')[0])
                                    .join(', ')}
                                  {formData.decoration?.hasFlowerPillar && formData.flowerPillarQty && `, 花柱: ${formData.flowerPillarQty}支`}
                                  {formData.decoration?.hasMahjong && formData.mahjongTableQty && `, 麻雀: ${formData.mahjongTableQty}張`}
                                  {formData.decoration?.hasInvitation && formData.invitationQty && `, 喜帖: ${formData.invitationQty}套`}
                                  {formData.decoration?.hasCeremonyChair && formData.ceremonyChairQty && `, 婚椅: ${formData.ceremonyChairQty}張`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <span className="text-slate-400 text-xs mr-1">$</span>
                            <input
                              type="number"
                              value={formData.decorPackagePrice || ''}
                              onChange={e => setFormData(prev => updateFinanceState({ ...prev, decorPackagePrice: e.target.value }))}
                              className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-rose-500 outline-none text-sm font-mono text-slate-700"
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">固定套票</div>
                          <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(formData.decorPackagePrice))}</div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => updateFinanceState({ ...prev, decorApplySC: !prev.decorApplySC }))}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${formData.decorApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200'}`}
                            >SC</button>
                          </div>
                        </div>
                      )}

                      {/* 7. CUSTOM ITEMS */}
                      {(formData.customItems || []).map((item, idx) => (
                        <div key={item.id || idx} className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-slate-50 transition-colors border-t border-slate-50">
                          <div className="col-span-5 flex items-center">
                            <div className="p-1.5 bg-slate-100 text-slate-500 rounded mr-3 flex-shrink-0"><Plus size={14} /></div>
                            <input
                              type="text"
                              value={item.name}
                              placeholder="額外項目名稱"
                              onChange={e => setFormData(prev => {
                                const newItems = [...prev.customItems];
                                newItems[idx].name = e.target.value;
                                return { ...prev, customItems: newItems };
                              })}
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-700"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <span className="text-slate-400 text-xs mr-1">$</span>
                            <input
                              type="number"
                              value={item.price}
                              onChange={e => setFormData(prev => {
                                const newItems = [...prev.customItems];
                                newItems[idx].price = e.target.value;
                                return updateFinanceState({ ...prev, customItems: newItems });
                              })}
                              className="w-20 text-right bg-transparent border-b border-slate-200 outline-none text-sm font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center border border-slate-300 rounded-md bg-white h-9 overflow-hidden">
                              <select
                                value={item.unitType || 'fixed'}
                                onChange={e => setFormData(prev => {
                                  const newItems = [...prev.customItems];
                                  newItems[idx].unitType = e.target.value;
                                  return updateFinanceState({ ...prev, customItems: newItems });
                                })}
                                className="bg-slate-100 border-r border-slate-300 h-full px-2 text-[10px]"
                              >
                                <option value="fixed">固定</option>
                                <option value="perTable">席</option>
                              </select>
                              <input
                                type="number"
                                value={item.qty || ''}
                                onChange={e => setFormData(prev => {
                                  const newItems = [...prev.customItems];
                                  newItems[idx].qty = e.target.value;
                                  return updateFinanceState({ ...prev, customItems: newItems });
                                })}
                                className="w-full h-full text-center outline-none text-sm font-bold"
                              />
                            </div>
                          </div>
                          <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">${formatMoney(safeFloat(item.price) * safeFloat(item.qty))}</div>
                          <div className="col-span-1 flex justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => {
                                const newItems = [...prev.customItems];
                                newItems[idx].applySC = !item.applySC;
                                return updateFinanceState({ ...prev, customItems: newItems });
                              })}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.applySC ? 'text-blue-600 bg-blue-50' : 'text-slate-300'}`}
                            >SC</button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => {
                                const newItems = prev.customItems.filter((_, i) => i !== idx);
                                return updateFinanceState({ ...prev, customItems: newItems });
                              })}
                              className="text-slate-300 hover:text-red-500 p-1"
                            ><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}

                      {/* 8. BUS FEE ROW */}
                      {formData.busInfo?.enabled && (
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                          <div className="col-span-5">
                            <div className="flex items-center">
                              <div className="p-1.5 bg-slate-100 text-slate-500 rounded mr-3 flex-shrink-0">
                                <Truck size={14} />
                              </div>
                              <div>
                                <span className="font-bold text-slate-700 block text-sm">旅遊巴安排 (Bus Fee)</span>
                                <span className="text-xs text-slate-400">來源: 物流分頁</span>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            <span className="text-slate-400 text-xs mr-1">$</span>
                            <input
                              type="number"
                              value={formData.busCharge}
                              onChange={e => setFormData(prev => updateFinanceState({ ...prev, busCharge: e.target.value }))}
                              className="w-20 text-right bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-mono text-slate-700"
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-2 text-center text-sm text-slate-500">1</div>
                          <div className="col-span-2 text-right text-sm font-bold font-mono text-slate-800">
                            ${formatMoney(safeFloat(formData.busCharge))}
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => updateFinanceState({ ...prev, busApplySC: !prev.busApplySC }))}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${formData.busApplySC !== false ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-300 border-slate-200 opacity-50'}`}
                            >
                              SC
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ADD ITEM BUTTON */}
                      <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100">
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, customItems: [...(prev.customItems || []), { id: Date.now(), name: '', price: '', qty: 1, applySC: true }] }))} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center transition-colors">
                          <Plus size={14} className="mr-1" /> 新增額外項目
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* 7. TOTALS SUMMARY */}
                  <div className="flex flex-col md:flex-row gap-6 mt-6">
                    {/* Min Spend Alert */}
                    <div className="flex-1">
                      {minSpendInfo && (Number(formData.totalAmount) < minSpendInfo.amount) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm flex items-start shadow-sm">
                          <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-bold">未達最低消費</p>
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
                    {(() => {
                      let scBase = 0;
                      let subTotal = 0;

                      // 1. Menus
                      (formData.menus || []).forEach(m => {
                        const amt = safeFloat(m.price) * safeFloat(m.qty);
                        subTotal += amt;
                        if (m.applySC !== false) scBase += amt;
                      });

                      // 2. Plating
                      const platingTotal = (formData.servingStyle === '位上') ? safeFloat(formData.platingFee) * safeFloat(formData.tableCount) : 0;
                      if (platingTotal > 0) {
                        subTotal += platingTotal;
                        if (formData.platingFeeApplySC !== false) scBase += platingTotal;
                      }

                      // 3. Drinks
                      const drinksTotal = safeFloat(formData.drinksPrice) * safeFloat(formData.drinksQty);
                      subTotal += drinksTotal;
                      if (formData.drinksApplySC !== false) scBase += drinksTotal;

                      // 4. Custom Items
                      (formData.customItems || []).forEach(i => {
                        const amt = safeFloat(i.price) * safeFloat(i.qty);
                        subTotal += amt;
                        if (i.applySC) scBase += amt;
                      });

                      // 5. Bus Arrangement
                      const busTotal = formData.busInfo?.enabled ? safeFloat(formData.busCharge) : 0;
                      if (formData.busInfo?.enabled) {
                        subTotal += busTotal;
                        if (formData.busApplySC) scBase += busTotal;
                      }

                      // 🌟 6. CATEGORY PACKAGES (Setup, AV, Decor) 🌟
                      const setupTotal = safeFloat(formData.setupPackagePrice);
                      if (setupTotal > 0) {
                        subTotal += setupTotal;
                        if (formData.setupApplySC !== false) scBase += setupTotal;
                      }

                      const avTotal = safeFloat(formData.avPackagePrice);
                      if (avTotal > 0) {
                        subTotal += avTotal;
                        if (formData.avApplySC !== false) scBase += avTotal;
                      }

                      const decorTotal = safeFloat(formData.decorPackagePrice);
                      if (decorTotal > 0) {
                        subTotal += decorTotal;
                        if (formData.decorApplySC !== false) scBase += decorTotal;
                      }

                      // ✅ STRICT 10% CALCULATION
                      let scAmount = 0;
                      if (formData.enableServiceCharge !== false) {
                        scAmount = scBase * 0.1;
                      }

                      const discountAmt = safeFloat(formData.discount);
                      const baseTotal = subTotal + scAmount - discountAmt;
                      const ccSurcharge = formData.paymentMethod === '信用卡' ? baseTotal * 0.03 : 0;
                      const grandTotal = Math.round(baseTotal + ccSurcharge);

                      return (
                        <div className="w-full md:w-80 space-y-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <label className="flex items-center cursor-pointer text-sm text-slate-600 select-none hover:text-blue-600 transition-colors">
                              <input
                                type="checkbox"
                                checked={formData.enableServiceCharge !== false}
                                onChange={e => setFormData(prev => ({ ...prev, enableServiceCharge: e.target.checked, totalAmount: generateBillingSummary({ ...prev, enableServiceCharge: e.target.checked }) }))}
                                className="mr-2 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="font-bold">服務費 (10%)</span>
                            </label>
                            <div className="text-right">
                              <span className={`font-mono font-bold text-sm ${formData.enableServiceCharge !== false ? 'text-slate-700' : 'text-slate-300 line-through'}`}>
                                + ${formatMoney(scAmount)}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <span className="text-sm font-bold text-slate-600">折扣 (Discount)</span>
                            <div className="relative w-28">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-red-400 text-xs">- $</span>
                              <input type="text" value={formData.discount || ''} onChange={handlePriceChange} name="discount" className="w-full text-right text-sm border-b border-slate-300 hover:border-red-300 focus:border-red-500 outline-none text-red-600 font-mono font-bold pl-6 pb-1 bg-transparent" placeholder="0" />
                            </div>
                          </div>

                          {ccSurcharge > 0 && (
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 bg-amber-50/50 -mx-5 px-5 pt-3">
                              <span className="text-sm font-bold text-amber-700">信用卡附加費 (3%)</span>
                              <span className="font-mono text-sm text-amber-700 font-bold">+ ${formatMoney(ccSurcharge)}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2">
                            <span className="text-base font-bold text-slate-800">總金額 (Total)</span>
                            <span className="text-2xl font-black text-blue-700 font-mono tracking-tight">${formatMoney(grandTotal)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 8. PAYMENT SCHEDULE */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-700">付款進度 (Payment Schedule)</h4>
                      {/* Auto-Schedule Toggle */}
                      <label className="flex items-center cursor-pointer select-none">
                        <div className="relative">
                          <input type="checkbox" className="sr-only peer" checked={formData.autoSchedulePayment || false} onChange={e => {
                            const isChecked = e.target.checked;
                            setFormData(prev => {
                              const currentTotal = generateBillingSummary(prev).grandTotal;
                              let updates = { autoSchedulePayment: isChecked, totalAmount: currentTotal };
                              if (isChecked) {
                                const terms = calculatePaymentTerms(currentTotal, prev.date);
                                if (terms) {
                                  updates = { ...updates, ...terms };
                                  addToast("已啟用自動付款排程", "success");
                                }
                              }
                              return { ...prev, ...updates };
                            });
                          }} />
                          <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                        </div>
                        <span className={`text-xs font-bold ml-2 ${formData.autoSchedulePayment ? 'text-violet-600' : 'text-slate-400'}`}>{formData.autoSchedulePayment ? "自動更新" : "手動"}</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <DepositField label="訂金一" prefix="deposit1" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} addToast={addToast} onRemoveProof={handleRemoveProof} />
                      <DepositField label="訂金二" prefix="deposit2" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} addToast={addToast} onRemoveProof={handleRemoveProof} />
                      <DepositField label="訂金三" prefix="deposit3" formData={formData} setFormData={setFormData} onUpload={handleUploadProof} addToast={addToast} onRemoveProof={handleRemoveProof} />

                      <div className="bg-white p-5 rounded-lg border-2 border-slate-200 shadow-sm mt-2 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 bottom-0 w-2 ${formData.balanceReceived ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <div className="flex flex-col md:flex-row gap-6 pl-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-lg font-bold text-slate-800">
                                {formData.balanceReceived ? '已收總額 (Total Settled)' : '尚欠尾數 (Outstanding Balance)'}
                              </h4>
                              <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${formData.balanceReceived ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {formData.balanceReceived ? 'Fully Paid' : 'Pending'}
                              </span>
                            </div>

                            {/* ✅ DYNAMIC CALCULATION LOGIC */}
                            {(() => {
                              const total = safeFloat(formData.totalAmount);

                              // Only count deposits that are actually marked as received
                              let amountAlreadyPaid = 0;
                              if (formData.deposit1Received) amountAlreadyPaid += safeFloat(formData.deposit1);
                              if (formData.deposit2Received) amountAlreadyPaid += safeFloat(formData.deposit2);
                              if (formData.deposit3Received) amountAlreadyPaid += safeFloat(formData.deposit3);

                              // If the final balance itself is marked received, the whole thing is paid
                              if (formData.balanceReceived) {
                                return (
                                  <div className="text-3xl font-black text-emerald-600 font-mono mb-3">
                                    ${formatMoney(total)}
                                  </div>
                                );
                              }

                              // Otherwise, show what is actually still owed
                              const remainingOwed = total - amountAlreadyPaid;
                              return (
                                <div className="text-3xl font-black text-red-600 font-mono mb-3">
                                  ${formatMoney(remainingOwed)}
                                </div>
                              );
                            })()}

                            <p className="text-[10px] text-slate-400">
                              * 系統僅計算標記為「已收款」的項目
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 w-full md:w-auto min-w-[280px]">
                            {/* ... (Payment Method and Date inputs stay the same) ... */}
                            <div className="grid grid-cols-2 gap-2">
                              <div><label className="block text-xs font-bold text-slate-400 mb-1">付款方式</label><FormSelect label="" name="paymentMethod" options={['現金', '信用卡', '支票', '轉數快']} value={formData.paymentMethod} onChange={handleInputChange} className="w-full text-sm" /></div>
                              <div><label className="block text-xs font-bold text-slate-400 mb-1">付款日期</label><input type="date" value={formData.balanceDate || ''} onChange={e => setFormData(prev => ({ ...prev, balanceDate: e.target.value }))} className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500" /></div>
                            </div>
                            <label className={`flex items-center justify-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.balanceReceived ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                              <input type="checkbox" checked={formData.balanceReceived || false} onChange={e => setFormData(prev => ({ ...prev, balanceReceived: e.target.checked }))} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500" />
                              <span className={`font-bold ${formData.balanceReceived ? 'text-emerald-700' : 'text-slate-600'}`}>
                                {formData.balanceReceived ? "確認已收全數尾數" : "標記尾數為已收款"}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: VENUE & DECOR */}
              {formTab === 'venue' && (
                <div className="space-y-6 animate-in fade-in">

                  {/* 1. MAIN DECOR SETTINGS */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">場地佈置 (Main Setup)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormSelect label="檯布顏色 (Table Cloth)" name="tableClothColor" options={DECOR_COLORS} value={formData.tableClothColor} onChange={handleInputChange} />
                      <FormSelect label="椅套顏色 (Chair Cover)" name="chairCoverColor" options={DECOR_COLORS} value={formData.chairCoverColor} onChange={handleInputChange} />
                    </div>

                    {/* Head Table & Bridal Room */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 pt-4 border-t border-slate-100">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">主家席顏色 (Head Table Color)</label>
                        <div className="flex gap-4 mb-2">
                          <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input type="radio" name="headTableColorType" value="same" checked={formData.headTableColorType === 'same'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
                            <span>同客席 (Same as Guest)</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input type="radio" name="headTableColorType" value="custom" checked={formData.headTableColorType === 'custom'} onChange={handleInputChange} className="text-blue-600 focus:ring-blue-500" />
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
                            <input type="checkbox" name="bridalRoom" checked={formData.bridalRoom} onChange={e => setFormData(prev => ({ ...prev, bridalRoom: e.target.checked }))} className="rounded text-pink-500" />
                            <span className="text-xs text-slate-500">使用</span>
                          </label>
                        </div>
                        {formData.bridalRoom && (
                          <input type="text" name="bridalRoomHours" value={formData.bridalRoomHours} onChange={handleInputChange} placeholder="使用時間 e.g. 17:00 - 23:00" className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm bg-white" />
                        )}
                      </div>
                    </div>

                    {/* MULTI-PHOTO: General Decor */}
                    <div className="border-t border-slate-100 pt-4 mt-4">
                      <label className="block text-sm font-bold text-slate-700 mb-2">佈置參考圖與備註 (Decor References & Notes)</label>
                      <textarea
                        rows={2}
                        placeholder="文字描述 (Description)..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none mb-3"
                        value={formData.venueDecor || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, venueDecor: e.target.value }))}
                      />
                      <div className="flex flex-wrap gap-3">
                        {(formData.venueDecorPhotos || []).map((url, idx) => (
                          <div key={idx} className="relative w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                            <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full cursor-zoom-in" title="點擊放大">
                              <img src={url} alt="Venue Decor" className="w-full h-full object-cover" />
                            </a>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, venueDecorPhotos: prev.venueDecorPhotos.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={12} /></button>
                          </div>
                        ))}
                        <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <ImageIcon size={20} className="mb-1" />
                          <span className="text-[10px] font-bold">新增照片 (多選)</span>
                          <input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleMultiImageUpload(e.target.files, 'venueDecorPhotos')} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 2. ADVANCED EQUIPMENT & DECOR LIST */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center">
                      <Layout size={18} className="mr-2 text-slate-500" />
                      設備與佈置清單 (Equipment & Packages)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Column 1: Setup & Reception */}
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest border-b border-blue-200 pb-1 mb-2 flex items-center gap-1">
                          <Users size={14} /> 舞台與接待設備
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Monitor size={14} /></div><FormCheckbox label="禮堂舞台 (7.2x2.5m)" name="equipment.stage" checked={formData.equipment?.stage} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, stage: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Mic2 size={14} /></div><FormCheckbox label="講台" name="equipment.podium" checked={formData.equipment?.podium} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, podium: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Coffee size={14} /></div><FormCheckbox label="接待桌 (180x60cm)" name="equipment.receptionTable" checked={formData.equipment?.receptionTable} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, receptionTable: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Info size={14} /></div><FormCheckbox label="標示牌 (2個)" name="equipment.signage" checked={formData.equipment?.signage} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, signage: e.target.checked } }))} /></div>

                          {/* 禮堂字牌 */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-slate-400"><Type size={14} /></div>
                            <FormCheckbox label="禮堂字牌" name="equipment.nameSign" checked={formData.equipment?.nameSign} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, nameSign: e.target.checked } }))} />
                            {formData.equipment?.nameSign && (
                              <input className="flex-1 text-[10px] border rounded px-2 py-1 bg-white outline-none focus:border-blue-400 transition-all" placeholder="輸入字牌內容..." value={formData.nameSignText || ''} onChange={(e) => setFormData({ ...formData, nameSignText: e.target.value })} />
                            )}
                          </div>

                          {/* 婚宴蛋糕 */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-slate-400"><Cake size={14} /></div>
                            <FormCheckbox label="婚宴蛋糕" name="equipment.hasCake" checked={formData.equipment?.hasCake} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, hasCake: e.target.checked } }))} />
                            {formData.equipment?.hasCake && (
                              <div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200">
                                <input type="number" className="w-10 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" placeholder="0" value={formData.cakePounds || ''} onChange={(e) => setFormData({ ...formData, cakePounds: e.target.value })} />
                                <span className="text-[9px] text-slate-400 font-bold ml-1">Lbs</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Column 2: AV Equipment */}
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-200 pb-1 mb-2 flex items-center gap-1">
                          <Tv size={14} /> 影音設備 (AV)
                        </h4>
                        <div className="grid grid-cols-1 gap-1.5">
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Video size={14} /></div><FormCheckbox label="大禮堂投影機" name="equipment.grandHallProjector" checked={formData.equipment?.grandHallProjector} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, grandHallProjector: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Monitor size={14} /></div><FormCheckbox label="小禮堂 LED Screen" name="equipment.smallHallLED" checked={formData.equipment?.smallHallLED} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, smallHallLED: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Maximize size={14} /></div><FormCheckbox label="LED 顯示屏 W6.4 x H4m" name="equipment.ledScreen" checked={formData.equipment?.ledScreen} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, ledScreen: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Smartphone size={14} className="rotate-90" /></div><FormCheckbox label="60寸電視 (直)" name="equipment.tvVertical" checked={formData.equipment?.tvVertical} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, tvVertical: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Smartphone size={14} /></div><FormCheckbox label="60寸電視 (橫)" name="equipment.tvHorizontal" checked={formData.equipment?.tvHorizontal} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, tvHorizontal: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Sun size={14} /></div><FormCheckbox label="聚光燈" name="equipment.spotlight" checked={formData.equipment?.spotlight} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, spotlight: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><RotateCw size={14} /></div><FormCheckbox label="電腦燈" name="equipment.movingHead" checked={formData.equipment?.movingHead} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, movingHead: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Zap size={14} /></div><FormCheckbox label="進場燈" name="equipment.entranceLight" checked={formData.equipment?.entranceLight} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, entranceLight: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Mic size={14} /></div><FormCheckbox label="無線麥克風 (4支)" name="equipment.wirelessMic" checked={formData.equipment?.wirelessMic} onChange={(e) => setFormData(prev => ({ ...prev, equipment: { ...prev.equipment, wirelessMic: e.target.checked } }))} /></div>
                        </div>
                        <input type="text" placeholder="其他 AV 補充" className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs mt-2" value={formData.avOther || ''} onChange={e => setFormData(prev => ({ ...prev, avOther: e.target.value }))} />
                      </div>

                      {/* Column 3: Decor & Quantities */}
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest border-b border-rose-200 pb-1 mb-2 flex items-center gap-1">
                          <Palette size={14} /> 場地佈置與細項
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center gap-2"><div className="text-slate-400"><ImageIcon size={14} /></div><FormCheckbox label="舞台背景佈置" name="decoration.backdrop" checked={formData.decoration?.backdrop} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, backdrop: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Star size={14} /></div><FormCheckbox label="接待處佈置" name="decoration.receptionDecor" checked={formData.decoration?.receptionDecor} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, receptionDecor: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Flower2 size={14} /></div><FormCheckbox label="絲花擺設" name="decoration.silkFlower" checked={formData.decoration?.silkFlower} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, silkFlower: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><FileText size={14} /></div><FormCheckbox label="證婚桌" name="decoration.ceremonyTable" checked={formData.decoration?.ceremonyTable} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, ceremonyTable: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><PenTool size={14} /></div><FormCheckbox label="簽名冊" name="decoration.signingBook" checked={formData.decoration?.signingBook} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, signingBook: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Wind size={14} /></div><FormCheckbox label="花圈" name="decoration.flowerAisle" checked={formData.decoration?.flowerAisle} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, flowerAisle: e.target.checked } }))} /></div>
                          <div className="flex items-center gap-2"><div className="text-slate-400"><Frame size={14} /></div><FormCheckbox label="畫架" name="decoration.easel" checked={formData.decoration?.easel} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, easel: e.target.checked } }))} /></div>

                          {/* 花柱 */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-slate-400"><Columns size={14} /></div>
                            <FormCheckbox label="花柱佈置" name="decoration.hasFlowerPillar" checked={formData.decoration?.hasFlowerPillar} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasFlowerPillar: e.target.checked } }))} />
                            {formData.decoration?.hasFlowerPillar && (
                              <div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200">
                                <input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.flowerPillarQty || ''} onChange={(e) => setFormData({ ...formData, flowerPillarQty: e.target.value })} />
                                <span className="text-[9px] text-slate-400 font-bold ml-1">支</span>
                              </div>
                            )}
                          </div>

                          {/* 麻雀 */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-slate-400"><Grid size={14} /></div>
                            <FormCheckbox label="麻雀枱" name="decoration.hasMahjong" checked={formData.decoration?.hasMahjong} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasMahjong: e.target.checked } }))} />
                            {formData.decoration?.hasMahjong && (
                              <div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200">
                                <input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.mahjongTableQty || ''} onChange={(e) => setFormData({ ...formData, mahjongTableQty: e.target.value })} />
                                <span className="text-[9px] text-slate-400 font-bold ml-1">張</span>
                              </div>
                            )}
                          </div>

                          {/* 喜帖 */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-slate-400"><Mail size={14} /></div>
                            <FormCheckbox label="喜帖" name="decoration.hasInvitation" checked={formData.decoration?.hasInvitation} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasInvitation: e.target.checked } }))} />
                            {formData.decoration?.hasInvitation && (
                              <div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200">
                                <input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.invitationQty || ''} onChange={(e) => setFormData({ ...formData, invitationQty: e.target.value })} />
                                <span className="text-[9px] text-slate-400 font-bold ml-1">套</span>
                              </div>
                            )}
                          </div>

                          {/* 婚椅 */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-slate-400"><Armchair size={14} /></div>
                            <FormCheckbox label="證婚椅子" name="decoration.hasCeremonyChair" checked={formData.decoration?.hasCeremonyChair} onChange={(e) => setFormData(prev => ({ ...prev, decoration: { ...prev.decoration, hasCeremonyChair: e.target.checked } }))} />
                            {formData.decoration?.hasCeremonyChair && (
                              <div className="flex items-center bg-white px-2 py-0.5 rounded border border-slate-200">
                                <input type="number" className="w-8 text-xs bg-transparent text-slate-700 font-bold outline-none text-center" value={formData.ceremonyChairQty || ''} onChange={(e) => setFormData({ ...formData, ceremonyChairQty: e.target.value })} />
                                <span className="text-[9px] text-slate-400 font-bold ml-1">張</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 5: LOGISTICS & RUNDOWN (UPDATED) */}
              {formTab === 'logistics' && (
                <div className="space-y-6 animate-in fade-in">

                  {/* 1. EVENT RUNDOWN */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                      <h4 className="font-bold text-slate-800 flex items-center">
                        <Clock size={18} className="mr-2 text-slate-500" /> 活動流程 (Event Rundown)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, rundown: [...(prev.rundown || []), { id: Date.now(), time: '18:30', activity: '' }] }))}
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold"
                      >
                        + 新增流程
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(!formData.rundown || formData.rundown.length === 0) && (
                        <div className="text-center py-4 bg-slate-50 border border-slate-100 rounded-lg">
                          <p className="text-sm text-slate-400 font-medium">暫無流程 (No Rundown)</p>
                          <p className="text-xs text-slate-400 mt-1">點擊上方按鈕新增活動流程</p>
                        </div>
                      )}
                      {(formData.rundown || []).map((item, idx) => (
                        <div key={item.id} className="flex gap-3 items-center group">
                          <input
                            type="text"
                            value={item.time}
                            placeholder="18:30"
                            maxLength={5}
                            onChange={e => {
                              const newList = [...formData.rundown];
                              newList[idx].time = e.target.value;
                              setFormData(prev => ({ ...prev, rundown: newList }));
                            }}
                            className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-center font-mono placeholder:text-slate-300"
                          />
                          <input
                            type="text"
                            value={item.activity}
                            placeholder="活動內容 (Activity)..."
                            onChange={e => {
                              const newList = [...formData.rundown];
                              newList[idx].activity = e.target.value;
                              setFormData(prev => ({ ...prev, rundown: newList }));
                            }}
                            className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, rundown: prev.rundown.filter((_, i) => i !== idx) }))}
                            className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. BUS ARRANGEMENT */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                      <h4 className="font-bold text-slate-800 flex items-center">
                        <Truck size={18} className="mr-2 text-slate-500" /> 旅遊巴安排 (Bus Arrangement)
                      </h4>
                      <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.busInfo?.enabled || false}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            busInfo: {
                              ...prev.busInfo,
                              enabled: e.target.checked,
                              arrivals: prev.busInfo?.arrivals || [],
                              departures: prev.busInfo?.departures || []
                            }
                          }))}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className={formData.busInfo?.enabled ? "font-bold text-blue-600" : "text-slate-400"}>啟用 (Enable)</span>
                      </label>
                    </div>

                    {formData.busInfo?.enabled && (
                      <div className="space-y-6 animate-in slide-in-from-top-2">

                        {/* --- ARRIVALS (接載) --- */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-slate-700">接載 (Arrival): 出發地 {'>'} 璟瓏軒</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: [...(prev.busInfo.arrivals || []), { id: Date.now(), time: '18:00', location: '', plate: '', price: '' }] } }))}
                              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold"
                            >
                              + 新增接載
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(!formData.busInfo.arrivals || formData.busInfo.arrivals.length === 0) && (
                              <p className="text-sm text-slate-400 italic py-1">暫無接載安排</p>
                            )}
                            {(formData.busInfo.arrivals || []).map((bus, idx) => (
                              <div key={bus.id} className="flex gap-3 items-center group">
                                <input
                                  type="text"
                                  value={bus.time}
                                  placeholder="18:00"
                                  maxLength={5}
                                  onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].time = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }}
                                  className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-center font-mono placeholder:text-slate-300"
                                />
                                <input
                                  type="text"
                                  value={bus.location}
                                  placeholder="接載地址 (Location)..."
                                  onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].location = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }}
                                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                                />
                                <input
                                  type="text"
                                  value={bus.plate}
                                  placeholder="車牌 (Plate)"
                                  onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].plate = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }}
                                  className="w-24 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
                                />
                                <div className="flex items-center w-24 border border-slate-300 rounded px-2 py-1 bg-white focus-within:border-blue-500 overflow-hidden">
                                  <span className="text-slate-400 text-xs mr-1">$</span>
                                  <input
                                    type="number"
                                    value={bus.price}
                                    placeholder="0"
                                    onChange={e => { const newList = [...formData.busInfo.arrivals]; newList[idx].price = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: newList } })); }}
                                    className="w-full text-sm outline-none font-mono bg-transparent"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, arrivals: prev.busInfo.arrivals.filter((_, i) => i !== idx) } }))}
                                  className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* --- DEPARTURES (散席) --- */}
                        <div className="border-t border-slate-100 pt-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-slate-700">散席 (Departure): 璟瓏軒 {'>'} 目的地</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: [...(prev.busInfo.departures || []), { id: Date.now(), time: '22:30', location: '', plate: '', price: '' }] } }))}
                              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold"
                            >
                              + 新增散席
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(!formData.busInfo.departures || formData.busInfo.departures.length === 0) && (
                              <p className="text-sm text-slate-400 italic py-1">暫無散席安排</p>
                            )}
                            {(formData.busInfo.departures || []).map((bus, idx) => (
                              <div key={bus.id} className="flex gap-3 items-center group">
                                <input
                                  type="text"
                                  value={bus.time}
                                  placeholder="22:30"
                                  maxLength={5}
                                  onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].time = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }}
                                  className="w-20 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-center font-mono placeholder:text-slate-300"
                                />
                                <input
                                  type="text"
                                  value={bus.location}
                                  placeholder="散席地址 (Location)..."
                                  onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].location = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }}
                                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                                />
                                <input
                                  type="text"
                                  value={bus.plate}
                                  placeholder="車牌 (Plate)"
                                  onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].plate = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }}
                                  className="w-24 border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-blue-500 placeholder:text-slate-300"
                                />
                                <div className="flex items-center w-24 border border-slate-300 rounded px-2 py-1 bg-white focus-within:border-blue-500 overflow-hidden">
                                  <span className="text-slate-400 text-xs mr-1">$</span>
                                  <input
                                    type="number"
                                    value={bus.price}
                                    placeholder="0"
                                    onChange={e => { const newList = [...formData.busInfo.departures]; newList[idx].price = e.target.value; setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: newList } })); }}
                                    className="w-full text-sm outline-none font-mono bg-transparent"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, busInfo: { ...prev.busInfo, departures: prev.busInfo.departures.filter((_, i) => i !== idx) } }))}
                                  className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-start">
                          <Info size={12} className="mr-1 flex-shrink-0 mt-0.5" />
                          <span>提示：如需向客戶收費，請至「Tab 3: 收費明細 (Billing)」頁面的「旅遊巴安排」總收費欄位手動輸入總費用。</span>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* 3. OTHER LOGISTICS */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">其他物流 (Other Logistics)</h4>

                    {/* Deliveries */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center"><Truck size={16} className="mr-2" /> 送貨/物資安排 (Deliveries)</label>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, deliveries: [...(prev.deliveries || []), { id: Date.now(), unit: '', date: '', time: '18:30', items: '' }] }))}
                          className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:text-blue-600 flex items-center shadow-sm"
                        >
                          <Plus size={12} className="mr-1" /> 新增單位
                        </button>
                      </div>
                      <div className="space-y-3">
                        {(!formData.deliveries || formData.deliveries.length === 0) && <div className="text-center text-slate-400 text-xs py-2 italic">暫無送貨安排</div>}
                        {(formData.deliveries || []).map((delivery, idx) => (
                          <div key={delivery.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm relative group">
                            <div className="grid grid-cols-12 gap-2 mb-2">
                              <div className="col-span-4"><input type="text" placeholder="單位 (Unit)" className="w-full text-sm font-bold border-b border-slate-200 outline-none" value={delivery.unit} onChange={e => { const d = [...formData.deliveries]; d[idx].unit = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} /></div>
                              <div className="col-span-4"><input type="date" className="w-full text-sm border-b border-slate-200 outline-none" value={delivery.date} onChange={e => { const d = [...formData.deliveries]; d[idx].date = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} /></div>
                              <div className="col-span-3">
                                <input type="text" placeholder="18:30" className="w-full text-sm border-b border-slate-200 outline-none focus:border-blue-500 text-slate-600 text-center font-mono" value={delivery.time} onChange={e => { const d = [...formData.deliveries]; d[idx].time = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} />
                              </div>
                              <div className="col-span-1 text-right"><button type="button" onClick={() => setFormData(prev => ({ ...prev, deliveries: prev.deliveries.filter((_, i) => i !== idx) }))} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></div>
                            </div>
                            <textarea rows={2} placeholder="物資清單..." className="w-full text-sm bg-slate-50 border border-slate-100 rounded p-2 outline-none resize-none" value={delivery.items} onChange={e => { const d = [...formData.deliveries]; d[idx].items = e.target.value; setFormData(prev => ({ ...prev, deliveries: d })); }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Parking */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <label className="text-sm font-bold text-slate-700 flex items-center mb-3"><MapPin size={16} className="mr-2" /> 泊車安排 (Parking)</label>
                      <div className="bg-white p-3 rounded border border-slate-200 mb-3">
                        <span className="text-xs font-bold text-blue-600 uppercase mb-2 block">免費泊車券</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                            <span className="text-xs text-slate-500 mr-2">數量:</span>
                            <input type="number" className="flex-1 bg-transparent outline-none text-sm font-bold" value={formData.parkingInfo?.ticketQty || ''} onChange={e => setFormData(prev => ({ ...prev, parkingInfo: { ...prev.parkingInfo, ticketQty: e.target.value } }))} />
                            <span className="text-xs text-slate-400 ml-1">張</span>
                          </div>
                          <div className="flex items-center border rounded px-2 py-1 bg-slate-50">
                            <span className="text-xs text-slate-500 mr-2">時數:</span>
                            <input type="number" className="flex-1 bg-transparent outline-none text-sm font-bold" value={formData.parkingInfo?.ticketHours || ''} onChange={e => setFormData(prev => ({ ...prev, parkingInfo: { ...prev.parkingInfo, ticketHours: e.target.value } }))} />
                            <span className="text-xs text-slate-400 ml-1">小時</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">車牌登記</label>
                        <textarea rows={3} value={formData.parkingInfo?.plates || ''} onChange={e => setFormData(prev => ({ ...prev, parkingInfo: { ...prev.parkingInfo, plates: e.target.value } }))} placeholder="請輸入車牌..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none resize-none" />
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
                    <Printer size={18} className="mr-2" /> 列印自訂 (Print Customization)
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
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">

                {/* 1. NEW AI BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsAiOpen(true)}
                  className="group relative px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 text-sm shrink-0"
                >
                  <Sparkles size={16} className="text-yellow-200 group-hover:rotate-12 transition-transform" />
                  <span>AI 智能助手</span>
                  {/* Optional: Shine effect */}
                  <div className="absolute inset-0 rounded-full ring-1 ring-white/20 group-hover:ring-white/40"></div>
                </button> {/* ✅ THIS CLOSING TAG WAS MISSING */}

                {/* 2. Divider (Only show if we have print buttons next to it) */}
                {editingEvent && <div className="h-6 w-px bg-slate-300 mx-2 shrink-0"></div>}

                {/* 3. Existing Print Buttons */}
                {editingEvent && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrintEO}
                      className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium flex items-center border border-slate-200 text-sm whitespace-nowrap shrink-0"
                    >
                      <Printer size={16} className="mr-2" /> EO
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintBriefing}
                      className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium flex items-center border border-indigo-200 text-sm whitespace-nowrap shrink-0"
                    >
                      <Users size={16} className="mr-2" /> Brief
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.menus && formData.menus.length > 1) {
                          setIsMenuSelectOpen(true);
                        } else {
                          handleMenuPrintSelection('all');
                        }
                      }}
                      className="px-3 py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg font-medium flex items-center border border-violet-200 text-sm whitespace-nowrap ml-2 shrink-0"
                    >
                      <Utensils size={16} className="mr-2" /> 菜譜
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintQuotation}
                      className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium flex items-center border border-emerald-200 text-sm whitespace-nowrap shrink-0"
                    >
                      <FileText size={16} className="mr-2" /> Quotation
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTempPrintData(formData);
                        setPrintMode('INVOICE');
                        setTimeout(() => window.print(), 100);
                      }}
                      className="px-3 py-2 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg font-medium flex items-center border border-blue-200 text-sm whitespace-nowrap ml-2 shrink-0"
                    >
                      <FileText size={16} className="mr-2" /> Invoice
                    </button>
                    {/* Add this button right after the Invoice button */}
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="px-3 py-2 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg font-medium flex items-center border border-teal-200 text-sm whitespace-nowrap ml-2 shrink-0"
                    >
                      <Receipt size={16} className="mr-2" /> Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTempPrintData(formData);
                        setPrintMode('CONTRACT');
                        setTimeout(() => window.print(), 100);
                      }}
                      className="px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg font-medium flex items-center border border-amber-200 text-sm whitespace-nowrap shrink-0"
                    >
                      <FileText size={16} className="mr-2" /> Contract
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintMode('CONTRACT_CN');
                        setTimeout(() => window.print(), 100);
                      }}
                      className="px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg font-medium flex items-center border border-amber-200 text-sm whitespace-nowrap ml-2 shrink-0"
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
      {/* ✅ PASTE THE CODE HERE ✅ */}
      {/* Version Preview Modal */}
      <VersionPreviewModal
        isOpen={!!previewVersion}
        onClose={() => setPreviewVersion(null)}
        version={previewVersion}
        onRestore={restoreMenuSnapshot}
      />

      {/* Menu Selector Modal */}
      <MenuPrintSelector
        isOpen={isMenuSelectOpen}
        onClose={() => setIsMenuSelectOpen(false)}
        menus={formData.menus || []}
        onSelect={handleMenuPrintSelection}
      />

      <div className="print-only">
        {/* Use tempPrintData if available (for specific prints), otherwise default to formData */}
        <PrintableEO data={tempPrintData || formData} printMode={printMode} />
      </div>

    </>
  );
}