import { APP_ID } from './env';
export const APP_ID_CONST = APP_ID;

export const STATUS_COLORS = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  tentative: 'bg-amber-100 text-amber-800 border-amber-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  completed: 'bg-slate-100 text-slate-800 border-slate-200'
};

export const EVENT_TYPES = [
  '婚宴 (Wedding)', '公司活動 (Corporate)', '生日派對 (Birthday)',
  '演唱會 (Concert)', '會議 (Conference)', '私人聚會 (Private Party)', '其他 (Other)'
];

export const SERVING_STYLES = ['位上', '圍餐', '分菜', '自助餐'];
export const DEFAULT_DRINK_PACKAGES = [];
export const DECOR_COLORS = ['白 (White)', '金 (Gold)', '紅 (Red)'];
export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LABELS = { Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六', Sun: '日' };

export const DEPARTMENTS = [
  { key: 'kitchen', label: '廚房 (Kitchen)' },
  { key: 'roast', label: '燒味 (Roast)' },
  { key: 'dimsum', label: '點心 (Dim Sum)' },
  { key: 'seafood', label: '海鮮 (Seafood)' },
  { key: 'tea', label: '茶芥 (Tea)' },
  { key: 'drinks', label: '酒水 (Drinks)' },
  { key: 'bar', label: '吧 (Bar)' },
  { key: 'wine', label: '紅酒 (Wine)' },
  { key: 'sc', label: '加一 (S.C.)' },
  { key: 'other1', label: '其他 (Other 1)', isCustom: true },
  { key: 'other2', label: '其他 (Other 2)', isCustom: true },
  { key: 'other3', label: '其他 (Other 3)', isCustom: true }
];

export const FOOD_DEPTS = ['kitchen', 'roast', 'dimsum', 'seafood', 'tea', 'drinks', 'bar', 'wine', 'sc', 'other1', 'other2', 'other3'];
export const DRINK_DEPTS = ['bar', 'tea', 'wine', 'drinks', 'sc', 'other1', 'other2', 'other3'];

export const equipmentMap = {
  stage: '禮堂舞台 W7.2 x L2.5m (Stage)', podium: '講台 (Podium)',
  receptionTable: '接待桌 180x60cm (Reception Table)', signage: '標示牌 W69xH122cm x 2個 (Signage x 2)',
  nameSign: '禮堂字牌 (Name Sign)', hasCake: '婚宴蛋糕 (Cake)'
};

export const avMap = {
  tvVertical: '60寸電視-直 (60" TV - Vertical)', tvHorizontal: '60寸電視-橫 (60" TV - Horizontal)', spotlight: '聚光燈 (Spotlight)',
  movingHead: '電腦燈 (Moving Head Light)', entranceLight: '進場燈 (Entrance Light)', grandHallProjector: '大禮堂投影機 (Grand Hall Projector)',
  smallHallLED: '小禮堂 LED 顯示屏 (Small Hall LED Screen)', ledScreen: 'LED 顯示屏 W6.4 x H4m (LED Screen)', wirelessMic: '無線手持麥克風 x 4支 (Wireless Mic x 4)',
  projector: '投影機 (Projector)',
};

export const decorationMap = {
  backdrop: '舞台背景佈置 (Stage Backdrop)', receptionDecor: '接待處佈置 (Reception Decoration)', silkFlower: '絲花擺設 (Silk Flower Arrangement)',
  ceremonyTable: '證婚桌 (Ceremony Table)', signingBook: '簽名冊 (Guest Signature Book)', flowerAisle: '花圈 (Floral Aisle)', easel: '畫架 (Easel)',
  hasFlowerPillar: '花柱佈置 (Flower Pillars)', hasMahjong: '麻雀枱 (Mahjong Tables)', hasInvitation: '喜帖 (Invitations)', hasCeremonyChair: '證婚椅子 (Chairs)'
};

// ==========================================
// CONFIGURABLE SETUP / AV / DECORATION OPTIONS
// ==========================================
// These are the DEFAULT checkbox options shown in the event form's Venue tab and
// listed on documents. A tenant can override them in Settings (appSettings.itemOptions).
// group -> bucket in the event data: setup & av write to `equipment`, decor to `decoration`.
// Optional per-option meta: noteField (free-text input), qtyField + qtyUnit (number input).
export const DEFAULT_ITEM_OPTIONS = {
  setup: [
    { key: 'stage', label: '禮堂舞台 W7.2 x L2.5m (Stage)' },
    { key: 'podium', label: '講台 (Podium)' },
    { key: 'receptionTable', label: '接待桌 180x60cm (Reception Table)' },
    { key: 'signage', label: '標示牌 x2 (Signage x2)' },
    { key: 'nameSign', label: '禮堂字牌 (Name Sign)', noteField: 'nameSignText', notePlaceholder: '輸入字牌內容 (Enter sign text)' },
    { key: 'hasCake', label: '婚宴蛋糕 (Cake)', qtyField: 'cakePounds', qtyUnit: 'Lbs' },
  ],
  av: [
    { key: 'grandHallProjector', label: '大禮堂投影機 (Grand Hall Projector)' },
    { key: 'smallHallLED', label: '小禮堂 LED 顯示屏 (Small Hall LED Screen)' },
    { key: 'ledScreen', label: 'LED 顯示屏 W6.4 x H4m (LED Screen)' },
    { key: 'tvVertical', label: '60寸電視-直 (60" TV - Vertical)' },
    { key: 'tvHorizontal', label: '60寸電視-橫 (60" TV - Horizontal)' },
    { key: 'spotlight', label: '聚光燈 (Spotlight)' },
    { key: 'movingHead', label: '電腦燈 (Moving Head Light)' },
    { key: 'entranceLight', label: '進場燈 (Entrance Light)' },
    { key: 'wirelessMic', label: '無線手持麥克風 x4 (Wireless Mic x4)' },
  ],
  decor: [
    { key: 'backdrop', label: '舞台背景佈置 (Stage Backdrop)' },
    { key: 'receptionDecor', label: '接待處佈置 (Reception Decoration)' },
    { key: 'silkFlower', label: '絲花擺設 (Silk Flower Arrangement)' },
    { key: 'ceremonyTable', label: '證婚桌 (Ceremony Table)' },
    { key: 'signingBook', label: '簽名冊 (Guest Signature Book)' },
    { key: 'flowerAisle', label: '花圈 (Floral Aisle)' },
    { key: 'easel', label: '畫架 (Easel)' },
    { key: 'hasFlowerPillar', label: '花柱佈置 (Flower Pillars)', qtyField: 'flowerPillarQty', qtyUnit: '支 (pcs)' },
    { key: 'hasMahjong', label: '麻雀枱 (Mahjong Tables)', qtyField: 'mahjongTableQty', qtyUnit: '張 (pcs)' },
    { key: 'hasInvitation', label: '喜帖 (Invitations)', qtyField: 'invitationQty', qtyUnit: '套 (sets)' },
    { key: 'hasCeremonyChair', label: '證婚椅子 (Chairs)', qtyField: 'ceremonyChairQty', qtyUnit: '張 (pcs)' },
  ],
};

// Merge a tenant's saved itemOptions over the defaults, per group.
export const getItemOptions = (scopedSettings) => {
  const cfg = scopedSettings?.itemOptions || {};
  return {
    setup: Array.isArray(cfg.setup) ? cfg.setup : DEFAULT_ITEM_OPTIONS.setup,
    av: Array.isArray(cfg.av) ? cfg.av : DEFAULT_ITEM_OPTIONS.av,
    decor: Array.isArray(cfg.decor) ? cfg.decor : DEFAULT_ITEM_OPTIONS.decor,
  };
};

// ==========================================
// RBAC CONFIGURATION
// ==========================================
// RBAC CONFIGURATION
export const PERMISSION_CATEGORIES = [
  { 
    id: 'system', 
    label: '系統功能 (System Features)',
    permissions: [
      { id: 'dashboard', label: '儀表板 (Dashboard)' },
      { id: 'events', label: '訂單管理 (EOs)' },
      { id: 'docs', label: '使用指南 (Docs)' },
      { id: 'settings', label: '設定 (Settings)' },
      { id: 'delete_eo', label: '刪除訂單 (Delete EOs)' },
      { id: 'manage_all_outlets', label: '管理所有分店 (Manage All Outlets)' }
    ]
  },
  {
    id: 'actions',
    label: '訂單操作 (Event Actions)',
    permissions: [
      { id: 'print_download', label: '列印及下載 (Print/Download)' },
      { id: 'send_messages', label: '發送訊息給客戶 (Send Messages)' },
      { id: 'ai_assistant', label: 'AI 智能助手 (AI Assistant)' },
      { id: 'admin_sign', label: '管理員簽名 (Admin Sign)' }
    ]
  },
  {
    id: 'financial',
    label: '財務權限 (Financial Access)',
    permissions: [
      { id: 'edit_prices', label: '修改價格與折扣 (Edit Prices & Discounts)' },
      { id: 'confirm_payments', label: '確認收款與收據 (Confirm Payments)' }
    ]
  },
  {
    id: 'restrictions',
    label: '資料存取限制 (Data Access Restrictions)',
    permissions: [
      { id: 'manage_own_only', label: '僅能操作自己負責的訂單 (Manage Own Events Only)' }
    ]
  },
  {
    id: 'documents',
    label: '文件存取 (Document Access)',
    permissions: [
      { id: 'doc_eo', label: '內部單據 (EO / Briefing / Notes)' },
      { id: 'doc_quotation', label: '報價單 (Quotation)' },
      { id: 'doc_contract', label: '合約及附加條款 (Contract / Addendum)' },
      { id: 'doc_invoice', label: '發票 (Invoice)' },
      { id: 'doc_receipt', label: '收據 (Receipt)' },
      { id: 'doc_menu', label: '菜譜確認 (Menu Confirm)' },
      { id: 'doc_floorplan', label: '平面圖 (Floorplan)' }
    ]
  },
  {
    id: 'tabs',
    label: '訂單分頁 (Event Form Tabs)',
    permissions: [
      { id: 'tab_basic', label: '基本資料 (Basic Details)' },
      { id: 'tab_fnb', label: '餐飲詳情 (F&B)' },
      { id: 'tab_billing', label: '費用付款 (Billing)' },
      { id: 'tab_venue', label: '場地佈置 (Venue)' },
      { id: 'tab_logistics', label: '物流細節 (Logistics)' },
      { id: 'tab_remarks', label: '內部備註 (Remarks)' },
      { id: 'tab_print', label: '列印設定 (Print Config)' },
      { id: 'tab_save', label: '儲存權限 (Save Permissions)' }
    ]
  }
];

export const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: {
    label: 'Super Admin (系統管理員)',
    isFixed: true,
    permissions: PERMISSION_CATEGORIES.reduce((acc, cat) => {
      cat.permissions.forEach(p => acc[p.id] = true);
      return acc;
    }, {})
  },
  admin: {
    label: 'Admin (管理員)',
    isFixed: true,
    permissions: PERMISSION_CATEGORIES.reduce((acc, cat) => {
      cat.permissions.forEach(p => acc[p.id] = true);
      return acc;
    }, {})
  },
  manager: {
    label: 'Manager (營運經理)',
    isFixed: false,
    permissions: {
      dashboard: true, events: true, docs: true, settings: false, delete_eo: true, manage_all_outlets: false,
      print_download: true, send_messages: true, ai_assistant: true, admin_sign: true,
      edit_prices: true, confirm_payments: true, manage_own_only: false,
      doc_eo: true, doc_quotation: true, doc_contract: true, doc_invoice: true, doc_receipt: true, doc_menu: true, doc_floorplan: true,
      tab_basic: true, tab_fnb: true, tab_billing: true, tab_venue: true, tab_logistics: true, tab_remarks: true, tab_print: true, tab_save: true
    }
  },
  sales: {
    label: 'Sales (婚宴顧問)',
    isFixed: false,
    permissions: {
      dashboard: true, events: true, docs: true, settings: false, delete_eo: false, manage_all_outlets: false,
      print_download: true, send_messages: true, ai_assistant: true, admin_sign: false,
      edit_prices: true, confirm_payments: false, manage_own_only: false,
      doc_eo: false, doc_quotation: true, doc_contract: true, doc_invoice: true, doc_receipt: false, doc_menu: true, doc_floorplan: true,
      tab_basic: true, tab_fnb: true, tab_billing: true, tab_venue: true, tab_logistics: true, tab_remarks: false, tab_print: true, tab_save: true
    }
  },
  finance: {
    label: 'Finance Manager (財務經理)',
    isFixed: false,
    permissions: {
      dashboard: true, events: true, docs: true, settings: false, delete_eo: false, manage_all_outlets: false,
      print_download: true, send_messages: true, ai_assistant: true, admin_sign: false,
      edit_prices: true, confirm_payments: true, manage_own_only: false,
      doc_eo: false, doc_quotation: true, doc_contract: true, doc_invoice: true, doc_receipt: true, doc_menu: false, doc_floorplan: false,
      tab_basic: true, tab_fnb: false, tab_billing: true, tab_venue: false, tab_logistics: false, tab_remarks: false, tab_print: true, tab_save: true
    }
  },
  coordinator: {
    label: 'Coordinator (婚禮統籌)',
    isFixed: false,
    permissions: {
      dashboard: true, events: true, docs: true, settings: false, delete_eo: false, manage_all_outlets: false,
      print_download: true, send_messages: true, ai_assistant: true, admin_sign: false,
      edit_prices: false, confirm_payments: false, manage_own_only: false,
      doc_eo: true, doc_quotation: false, doc_contract: false, doc_invoice: false, doc_receipt: false, doc_menu: true, doc_floorplan: true,
      tab_basic: true, tab_fnb: true, tab_billing: false, tab_venue: true, tab_logistics: true, tab_remarks: true, tab_print: true, tab_save: true
    }
  },
  kitchen: {
    label: 'Kitchen / F&B (廚房餐飲)',
    isFixed: false,
    permissions: {
      dashboard: false, events: true, docs: true, settings: false, delete_eo: false, manage_all_outlets: false,
      print_download: true, send_messages: false, ai_assistant: false, admin_sign: false,
      edit_prices: false, confirm_payments: false, manage_own_only: false,
      doc_eo: true, doc_quotation: false, doc_contract: false, doc_invoice: false, doc_receipt: false, doc_menu: true, doc_floorplan: false,
      tab_basic: true, tab_fnb: true, tab_billing: false, tab_venue: false, tab_logistics: false, tab_remarks: false, tab_print: false, tab_save: false
    }
  },
  staff: {
    label: 'Staff (前線員工)',
    isFixed: false,
    permissions: {
      dashboard: true, events: true, docs: true, settings: false, delete_eo: false, manage_all_outlets: false,
      print_download: true, send_messages: true, ai_assistant: true, admin_sign: false,
      edit_prices: false, confirm_payments: false, manage_own_only: true,
      doc_eo: true, doc_quotation: true, doc_contract: false, doc_invoice: false, doc_receipt: false, doc_menu: true, doc_floorplan: true,
      tab_basic: true, tab_fnb: true, tab_billing: false, tab_venue: true, tab_logistics: true, tab_remarks: false, tab_print: false, tab_save: true
    }
  }
};
