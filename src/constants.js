export const appId = typeof __app_id !== 'undefined' ? __app_id : "my-venue-crm";

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

export const INDIVIDUAL_ZONES = ['紅區', '黃區', '綠區', '藍區'];
export const LOCATION_CHECKBOXES = [...INDIVIDUAL_ZONES, '全場'];
export const SERVING_STYLES = ['位上', '圍餐', '分菜', '自助餐'];
export const DEFAULT_DRINK_PACKAGES = [];
export const DECOR_COLORS = ['白 (White)', '金 (Gold)', '紅 (Red)'];
export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LABELS = { Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六', Sun: '日' };

export const DEPARTMENTS = [
  { key: 'kitchen', label: '廚房 (Kitchen)' },
  { key: 'dimsum', label: '點心 (Dim Sum)' },
  { key: 'roast', label: '燒味 (Roast)' },
  { key: 'bar', label: '水吧 (Bar)' },
  { key: 'tea', label: '茶芥 (Tea)' },
  { key: 'wine', label: '紅酒 (Wine)' },
  { key: 'other', label: '其他 (Other)' }
];

export const FOOD_DEPTS = ['kitchen', 'dimsum', 'roast'];
export const DRINK_DEPTS = ['bar', 'tea', 'wine'];

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

export const INITIAL_FORM_STATE = {
  // 1. Basic Info & Contact
  orderId: '',
  eventName: '',
  date: new Date().toLocaleDateString('en-CA'),
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

  // 2. F&B (Menu)
  menuType: '',
  menus: [{
    id: Date.now(),
    title: '主菜單 (Main Menu)',
    content: '',
    price: '',
    priceType: 'perTable',
    qty: 1,
    applySC: true
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
  enableHandCarry: false,
  handCarryStaffQty: '',
  drinkAllocation: {},

  // 3. Billing
  menuPrice: '',
  menuPriceType: 'perTable',
  drinksPrice: '',
  drinksPriceType: 'perTable',
  drinksQty: 1,
  drinksApplySC: true,

  specialMenuReqShowClient: false,
  specialMenuReqShowInternal: true,
  allergiesShowClient: false,
  allergiesShowInternal: true,

  customItems: [],

  totalAmount: '',
  deposit1: '',
  deposit1Received: false,
  deposit1Proof: [],
  deposit1Date: '',
  deposit2: '',
  deposit2Received: false,
  deposit2Proof: [],
  deposit2Date: '',
  deposit3: '',
  deposit3Received: false,
  deposit3Proof: [],
  deposit3Date: '',
  balance: '',
  balanceReceived: false,
  balanceProof: [],
  balanceDate: '',
  paymentMethod: '現金',
  discount: '',
  serviceCharge: '10%',
  enableServiceCharge: true,
  balanceDueDateType: 'eventDay',
  balanceDueDateOverride: '',
  autoSchedulePayment: false,

  // 4. Venue & AV
  tableClothColor: '',
  chairCoverColor: '',
  floorplan: { bgImage: '', elements: [] },
  headTableColorType: 'same',
  headTableCustomColor: '',
  bridalRoom: false,
  bridalRoomHours: '',
  stageDecor: '',
  stageDecorPhoto: '',
  venueDecor: '',
  venueDecorPhoto: '',
  venueDecorShowClient: false,
  venueDecorShowInternal: true,

  nameSignText: '',
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
  deliveries: [],
  parkingInfo: {
    ticketQty: '',
    ticketHours: '',
    plates: ''
  },
  rundown: [
    { id: 1, time: '18:00', activity: '恭候 (Reception)' },
    { id: 2, time: '20:00', activity: '入席 (March In)' }
  ],
  busCharge: '',
  otherNotesShowClient: true,
  otherNotesShowInternal: true,
  generalRemarks: '',
  generalRemarksShowClient: true,
  generalRemarksShowInternal: true,

  busInfo: {
    enabled: false,
    arrivals: [{ id: 1, time: '18:30', location: '', plate: '' }],
    departures: [{ id: 1, time: '22:30', location: '', plate: '' }],
    customRoutes: []
  },
  printSettings: {
    menu: {
      showPlatingFeeDisclaimer: true,
      validityDateOverride: '',
    },
    quotation: {
      showClientInfo: true,
    },
    contract: {
      showChop: true
    }
  },
  emailSubject: '',
  emailBody: '',
  whatsappDraft: '',
};

};