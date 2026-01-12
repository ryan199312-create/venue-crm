import React, { useState, useEffect, useMemo } from 'react';
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
  MoreVertical, 
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
  Lock 
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
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
  orderBy, 
  serverTimestamp, 
  setDoc, 
  getDoc 
} from "firebase/firestore";

// --- Firebase Configuration (請在此填入您的金鑰) ---
// 1. 請將以下的 "YOUR_..." 替換為您從 Firebase Console > Project Settings 取得的真實資料
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
// 設定一個固定的 appId，這會作為資料庫中的根目錄名稱
const appId = "my-venue-crm"; 

// 2. 請在此填入您的 Gemini API Key (從 Google AI Studio 取得)
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

// --- Helper: Gemini API Call ---
async function generateAIContent(prompt) {
  // 注意：如果 API Key 為空，這裡會直接報錯，請確保已填入 Key
  if (!apiKey || apiKey.includes("YOUR_")) {
    return "請先在程式碼中設定 Gemini API Key。";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

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

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const map = {
    'confirmed': '已確認',
    'tentative': '暫定',
    'cancelled': '已取消',
    'completed': '已完成'
  };
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

// AI Result Modal Component
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
                const btn = document.getElementById('copy-btn');
                if(btn) btn.innerHTML = '已複製!';
                setTimeout(() => { if(btn) btn.innerHTML = '複製內容'; }, 2000);
              }}
              id="copy-btn"
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

// --- Printable Component ---
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
          <DetailRow label="菜單" value={data.menuType} />
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
          <DetailRow label="總費用" value={`$${Number(data.totalAmount).toLocaleString()}`} />
          <DetailRow label="付款方式" value={data.paymentMethod} />
          <DetailRow label="已付訂金" value={`1: ${data.deposit1 || '-'} / 2: ${data.deposit2 || '-'}`} />
          <DetailRow label="餘額" value={`$${(Number(data.totalAmount) - Number(data.deposit1 || 0) - Number(data.deposit2 || 0)).toLocaleString()}`} />
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
              {data.menuType} / {data.servingStyle}
            </span>
          </div>
          
          <div className="space-y-4">
             {data.specialMenuReq ? (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <span className="text-red-600 font-bold block mb-1">⚠️ 特殊餐單要求 (SPECIAL REQUESTS):</span>
                  <p className="text-lg font-medium whitespace-pre-wrap">{data.specialMenuReq}</p>
                </div>
             ) : (
               <p className="text-slate-400 italic">無特殊餐單要求</p>
             )}
             
             {data.allergies && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 animate-pulse-slow">
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

        <div className="mt-auto pt-8 border-t border-slate-300 text-center text-slate-400 text-sm">
           確認簽署: __________________________
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---

export default function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Admin & User Management State
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // AI State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [aiApplyAction, setAiApplyAction] = useState(null);

  // EO Form State
  const initialFormState = {
    // 1. Basic Info & Contact
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
    menuType: 'A', // A, B, etc.
    specialMenuReq: '',
    staffMeals: '',
    drinksPackage: '',
    preDinnerSnacks: '',
    allergies: '',
    servingStyle: '圍餐',
    
    // 3. Billing
    totalAmount: '',
    deposit1: '',
    deposit2: '',
    deposit3: '',
    balance: '',
    paymentMethod: '現金',
    discount: '',
    serviceCharge: '10%',
    
    // 4. Venue & AV
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

    // 5. Logistics
    deliveryNotes: '',
    parkingPlates: '', 
    otherNotes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formTab, setFormTab] = useState('basic'); // basic, fnb, venue, billing, logistics

  // --- Auth & Data ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Register/Update User in Public Directory
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid);
        const userSnap = await getDoc(userRef);
        
        let profileData = {
          uid: u.uid,
          lastLogin: serverTimestamp(),
          role: 'staff', // Default role
          displayName: u.displayName || `User ${u.uid.slice(0,4)}`,
          email: u.email || 'anonymous'
        };

        if (userSnap.exists()) {
          const existingData = userSnap.data();
          profileData = { ...profileData, role: existingData.role }; // Preserve role
          if (existingData.role === 'admin') setIsAdmin(true);
        } else {
          await setDoc(userRef, profileData);
        }
        
        setUserProfile(profileData);
      } else {
        setLoading(false);
        setIsAdmin(false);
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Events (SHARED PUBLIC DATA)
  useEffect(() => {
    if (!user) return;
    // NOTE: Changed from users/{uid}/events to public/data/events for SHARED CRM
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch All Users (Admin Only)
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
    const { name, value, type, checked } = e.target;
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

  const openNewEventModal = () => {
    setEditingEvent(null);
    setFormData({
      ...initialFormState,
      orderId: `EO-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`,
      salesRep: userProfile?.displayName || '' // Auto-fill sales rep
    });
    setFormTab('basic');
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setFormData({ ...initialFormState, ...event }); 
    setFormTab('basic');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // NOTE: Saving to PUBLIC shared collection
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
    }
  };

  const handleDelete = async (id) => {
    if (!user || !window.confirm("確定要刪除此訂單嗎？ (Are you sure?)")) return;
    // NOTE: Deleting from PUBLIC shared collection
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
    // Simple passcode check for demo purposes
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

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.reload();
  };

  // --- AI Actions ---
  
  const handleAIEmailDraft = async () => {
    setAiTitle("AI 郵件助理 (Email Drafter)");
    setAiLoading(true);
    setAiModalOpen(true);
    setAiApplyAction(null); 

    const prompt = `
      你是一位專業的活動場地經理。請為我撰寫一封給客戶的郵件。
      
      資料如下：
      - 客戶名稱: ${formData.clientName}
      - 活動: ${formData.eventName} (${formData.eventType})
      - 日期: ${formData.date}
      - 時間: ${formData.startTime} - ${formData.endTime}
      - 地點: ${formData.venueLocation}
      - 狀態: ${formData.status}
      
      任務：
      請撰寫一封得體、專業且親切的中文（繁體，香港商務風格）郵件。
      如果狀態是 'confirmed'，內容為確認訂單詳情並感謝預訂。
      如果狀態是 'tentative'，內容為跟進訂單進度，詢問是否確認。
      
      請包含郵件主旨和內文。
    `;

    const result = await generateAIContent(prompt);
    setAiContent(result);
    setAiLoading(false);
  };

  const handleAIMenuSuggest = async () => {
    setAiTitle("AI 菜單顧問 (Menu Consultant)");
    setAiLoading(true);
    setAiModalOpen(true);
    
    const prompt = `
      請為以下活動設計一份菜單建議：
      - 活動類型: ${formData.eventType}
      - 上菜方式: ${formData.servingStyle}
      - 特別飲食要求: ${formData.specialMenuReq || "無"}
      - 食物過敏: ${formData.allergies || "無"}
      - 賓客人數: ${formData.guestCount || "未定"}

      請提供一份包含 8-10 道菜的建議菜單（中文菜名）。
      風格應配合活動類型（例如婚宴要喜慶，商務要大方）。
      直接列出菜單項目即可。
    `;

    const result = await generateAIContent(prompt);
    setAiContent(result);
    setAiLoading(false);
    
    setAiApplyAction(() => () => {
      setFormData(prev => ({
        ...prev,
        specialMenuReq: (prev.specialMenuReq ? prev.specialMenuReq + "\n\n[AI 建議菜單]\n" : "[AI 建議菜單]\n") + result
      }));
      setAiModalOpen(false);
    });
  };

  const handleAILogistics = async () => {
    setAiTitle("AI 物流整理 (Logistics Organizer)");
    setAiLoading(true);
    setAiModalOpen(true);
    
    const prompt = `
      請將以下雜亂的物流/備註資訊，整理成一份清晰的執行清單 (Checklist) 給運營團隊：
      
      送貨備註: ${formData.deliveryNotes || "無"}
      其他注意事項: ${formData.otherNotes || "無"}
      AV 備註: ${formData.avNotes || "無"}
      
      請用點列式 (Bullet points) 呈現，並標註重點。
    `;

    const result = await generateAIContent(prompt);
    setAiContent(result);
    setAiLoading(false);
    
    setAiApplyAction(() => () => {
      setFormData(prev => ({
        ...prev,
        otherNotes: (prev.otherNotes ? prev.otherNotes + "\n\n[AI 整理清單]\n" : "[AI 整理清單]\n") + result
      }));
      setAiModalOpen(false);
    });
  };


  // --- Computed Stats ---
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '總營業額 (Total)', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '即將舉辦 (Upcoming)', value: stats.upcomingCount, icon: CalendarIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '已確認訂單 (Confirmed)', value: stats.confirmedCount, icon: CheckCircle, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: '本月營收 (Month)', value: `$${stats.monthRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
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
                    ${Number(event.totalAmount).toLocaleString()}
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
    // Reuse previous calendar logic but localized
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

  // --- Form Sections ---
  
  const FormInput = ({ label, name, type = "text", required, className = "", placeholder = "" }) => (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        value={formData[name]}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
      />
    </div>
  );

  const FormSelect = ({ label, name, options, required, className = "" }) => (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <select
        name={name}
        required={required}
        value={formData[name]}
        onChange={handleInputChange}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  const FormTextArea = ({ label, name, rows = 3, className = "", placeholder = "" }) => (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <textarea
        name={name}
        rows={rows}
        value={formData[name]}
        onChange={handleInputChange}
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
        checked={checked} 
        onChange={onChange}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );

  // --- Render ---

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;

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

        {/* New/Edit Modal with Tabs */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? "編輯訂單 (Edit EO)" : "新增訂單 (New EO)"}>
          <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-[60vh]">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 overflow-x-auto no-scrollbar">
              {[
                { id: 'basic', label: '基本資料', icon: FileText },
                { id: 'fnb', label: '餐飲詳情', icon: Utensils },
                { id: 'billing', label: '費用付款', icon: CreditCard },
                { id: 'venue', label: '場地佈置 & AV', icon: Monitor },
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

            {/* Scrollable Content Area */}
            <div className="p-8 space-y-8 bg-slate-50/50 flex-1">
              {/* TAB 1: BASIC INFO */}
              {formTab === 'basic' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormInput label="訂單編號 (Order ID)" name="orderId" required />
                    <FormSelect label="活動狀態" name="status" options={['tentative', 'confirmed', 'completed', 'cancelled']} />
                    <FormSelect label="活動類型" name="eventType" options={EVENT_TYPES} />
                  </div>
                  
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">活動詳情 (Event Details)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="活動名稱" name="eventName" required placeholder="例如：陳李聯婚" />
                      <FormSelect label="活動位置" name="venueLocation" options={LOCATIONS} />
                      <div className="grid grid-cols-3 gap-4">
                        <FormInput label="活動日期" name="date" type="date" required className="col-span-1" />
                        <FormInput label="開始時間" name="startTime" type="time" required className="col-span-1" />
                        <FormInput label="結束時間" name="endTime" type="time" required className="col-span-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormInput label="席數 (Table Count)" name="tableCount" placeholder="20" />
                        <FormInput label="賓客人數 (Guests)" name="guestCount" placeholder="240" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                      <h4 className="font-bold text-slate-800">聯絡人資訊 (Client Info)</h4>
                      <button 
                        type="button"
                        onClick={handleAIEmailDraft}
                        className="text-xs flex items-center bg-violet-100 text-violet-700 px-2 py-1 rounded-full hover:bg-violet-200 transition-colors"
                      >
                        <Sparkles size={12} className="mr-1" /> AI 撰寫郵件
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="客戶姓名" name="clientName" required />
                      <FormInput label="電話" name="clientPhone" />
                      <FormInput label="公司名稱 (如適用)" name="companyName" />
                      <FormInput label="Email" name="clientEmail" />
                      <FormInput label="第二聯絡人" name="secondaryContact" />
                      <FormInput label="第二聯絡人電話" name="secondaryPhone" />
                      <FormInput label="銷售人員 (Sales)" name="salesRep" />
                      <FormInput label="地址" name="address" />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: F&B */}
              {formTab === 'fnb' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-800">餐單設定 (Menu)</h4>
                      <button 
                        type="button"
                        onClick={handleAIMenuSuggest}
                        className="text-xs flex items-center bg-violet-100 text-violet-700 px-2 py-1 rounded-full hover:bg-violet-200 transition-colors"
                      >
                        <Sparkles size={12} className="mr-1" /> AI 建議菜單
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormSelect label="菜單選擇 (Menu)" name="menuType" options={['Menu A', 'Menu B', 'Custom', 'N/A']} />
                      <FormSelect label="上菜方式 (Serving Style)" name="servingStyle" options={SERVING_STYLES} />
                    </div>
                    <FormTextArea label="特殊餐單需求 (Special Menu Request)" name="specialMenuReq" placeholder="例如：素食 x 3, 不吃牛 x 2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="席前/席間餐單 (Pre-dinner Snacks)" name="preDinnerSnacks" />
                      <FormInput label="員工餐 (Staff Meals)" name="staffMeals" />
                    </div>
                    <FormInput label="餐飲/酒水 (Beverage Package)" name="drinksPackage" placeholder="例如：每席 $500 無限暢飲" />
                    <FormTextArea label="食物過敏 (Allergies)" name="allergies" rows={2} className="bg-red-50 p-2 rounded-lg" />
                  </div>
                </div>
              )}

              {/* TAB 3: BILLING */}
              {formTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">費用概覽 (Billing)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="總費用 (Total Amount)" name="totalAmount" type="number" required className="text-lg font-bold" />
                      <FormSelect label="付款方式" name="paymentMethod" options={['現金', '信用卡', '支票', '轉數快']} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput label="訂金一 (Deposit 1)" name="deposit1" />
                      <FormInput label="訂金二 (Deposit 2)" name="deposit2" />
                      <FormInput label="訂金三 (Deposit 3)" name="deposit3" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="折扣 (Discount)" name="discount" />
                      <FormInput label="加一服務費 (Service Charge)" name="serviceCharge" />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: VENUE & AV */}
              {formTab === 'venue' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">場地佈置 (Decor)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="檯布顏色" name="tableClothColor" placeholder="例如：香檳金" />
                      <FormInput label="椅套顏色" name="chairCoverColor" placeholder="例如：米白色" />
                    </div>
                    <FormTextArea label="舞台/花藝佈置 (Stage Decor)" name="stageDecor" />
                  </div>

                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">AV 設備 (Audio Visual)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <FormCheckbox label="大禮堂 LED Wall" name="av_ledWallBig" checked={formData.avRequirements.ledWallBig} onChange={handleInputChange} />
                      <FormCheckbox label="小禮堂 LED Wall" name="av_ledWallSmall" checked={formData.avRequirements.ledWallSmall} onChange={handleInputChange} />
                      <FormCheckbox label="投影機 (Projector)" name="av_projector" checked={formData.avRequirements.projector} onChange={handleInputChange} />
                      <FormCheckbox label="無線咪 (Mics)" name="av_mics" checked={formData.avRequirements.mics} onChange={handleInputChange} />
                      <FormCheckbox label="舞台燈光 (Lighting)" name="av_lighting" checked={formData.avRequirements.lighting} onChange={handleInputChange} />
                    </div>
                    <FormTextArea label="AV 系統備註 (AV Notes)" name="avNotes" placeholder="流程、音樂播放要求等..." />
                  </div>
                </div>
              )}

              {/* TAB 5: LOGISTICS */}
              {formTab === 'logistics' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-800">物流與泊車 (Logistics)</h4>
                      <button 
                        type="button"
                        onClick={handleAILogistics}
                        className="text-xs flex items-center bg-violet-100 text-violet-700 px-2 py-1 rounded-full hover:bg-violet-200 transition-colors"
                      >
                        <Sparkles size={12} className="mr-1" /> AI 整理清單
                      </button>
                    </div>
                    <FormTextArea label="送貨/物資清單 (Delivery List)" name="deliveryNotes" placeholder="項目 / 送達時間 / 送貨員..." rows={4} />
                    <FormTextArea label="免費泊車登記 (Parking Plates)" name="parkingPlates" placeholder="車牌1, 車牌2, 車牌3..." rows={3} />
                    <FormTextArea label="其他注意事項 (Other Notes)" name="otherNotes" rows={3} />
                  </div>
                </div>
              )}
            
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center sticky bottom-0 z-10">
              <div className="flex items-center space-x-3">
                 {editingEvent && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors flex items-center border border-slate-200"
                    title="列印 EO (Print EO)"
                  >
                    <Printer size={18} className="mr-2" /> 列印 EO
                  </button>
                 )}
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  取消 (Cancel)
                </button>
                <button 
                  type="submit"
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
                >
                  儲存訂單 (Save EO)
                </button>
              </div>
            </div>
          </form>
        </Modal>

        {/* AI Result Modal */}
        <AIResultModal 
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          isLoading={aiLoading}
          content={aiContent}
          title={aiTitle}
          onApply={aiApplyAction}
        />

        {/* Admin Login Modal */}
        {isAdminLoginOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                <h3 className="text-xl font-bold mb-4 flex items-center text-slate-800"><Shield className="mr-2 text-purple-600"/> 管理員登入</h3>
                <form onSubmit={handleAdminLogin}>
                  <p className="text-sm text-slate-500 mb-4">請輸入管理員通行碼以解鎖進階功能。</p>
                  <input 
                    type="password" 
                    className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-center tracking-widest font-mono focus:ring-2 focus:ring-purple-500 outline-none" 
                    placeholder="••••••••"
                    value={adminPasscode}
                    onChange={e => setAdminPasscode(e.target.value)}
                    autoFocus
                  />
                  <div className="flex justify-end space-x-3">
                     <button type="button" onClick={() => setIsAdminLoginOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                     <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-lg shadow-purple-900/20">登入</button>
                  </div>
                </form>
                <p className="text-xs text-center text-slate-300 mt-4">(預設密碼: admin888)</p>
             </div>
          </div>
        )}
      </div>

      {/* Print View - Hidden on Screen */}
      <div className="print-only">
         <PrintableEO data={formData} />
      </div>
    </>
  );
}