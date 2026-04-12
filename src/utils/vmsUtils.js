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
  stage: '禮堂舞台 W7.2 x L2.5m (Stage)',
  podium: '講台 (Podium)',
  receptionTable: '接待桌 180x60cm (Reception Table)',
  signage: '標示牌 W69xH122cm x 2個 (Signage x 2)',
  nameSign: '禮堂字牌 (Name Sign)',
  hasCake: '婚宴蛋糕 (Cake)'
};

export const avMap = {
  tvVertical: '60寸電視-直 (60" TV - Vertical)',
  tvHorizontal: '60寸電視-橫 (60" TV - Horizontal)',
  spotlight: '聚光燈 (Spotlight)',
  movingHead: '電腦燈 (Moving Head Light)',
  entranceLight: '進場燈 (Entrance Light)',
  grandHallProjector: '大禮堂投影機 (Grand Hall Projector)',
  smallHallLED: '小禮堂 LED 顯示屏 (Small Hall LED Screen)',
  ledScreen: 'LED 顯示屏 W6.4 x H4m (LED Screen)',
  wirelessMic: '無線手持麥克風 x 4支 (Wireless Mic x 4)',
  projector: '投影機 (Projector)'
};

export const decorationMap = {
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

export const safeFloat = (val) => {
  if (!val) return 0;
  const clean = val.toString().replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatMoney = (val) => {
  if (!val && val !== 0) return '0'; 
  const clean = val.toString().replace(/,/g, '');
  const number = parseFloat(clean);
  if (isNaN(number)) return '0';
  return Math.round(number).toLocaleString('en-US');
};

export const parseMoney = (val) => {
  if (!val) return '';
  return val.toString().replace(/,/g, '');
};

export const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dateStr} (${day})`;
};

export const generateBillingSummary = (eventData) => {
  let subtotal = 0;
  let scBase = 0;

  const parsedMenus = (eventData.menus || []).map(m => {
    const price = safeFloat(m.price);
    const qty = safeFloat(m.qty);
    const amount = price * qty;
    subtotal += amount;
    if (m.applySC !== false) scBase += amount;
    return { ...m, cleanPrice: price, cleanQty: qty, amount };
  });

  let plating = null;
  if (eventData.servingStyle === '位上' && safeFloat(eventData.platingFee) > 0) {
    const price = safeFloat(eventData.platingFee);
    const qty = safeFloat(eventData.tableCount);
    const amount = price * qty;
    subtotal += amount;
    if (eventData.platingFeeApplySC !== false) scBase += amount;
    plating = { price, qty, amount };
  }

  let drinks = null;
  if (safeFloat(eventData.drinksPrice) > 0) {
    const price = safeFloat(eventData.drinksPrice);
    const qty = safeFloat(eventData.drinksQty);
    const amount = price * qty;
    subtotal += amount;
    if (eventData.drinksApplySC !== false) scBase += amount;
    drinks = { label: eventData.drinksPackage || 'Standard Package', price, qty, amount };
  }

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

  const parsedCustomItems = (eventData.customItems || []).map(i => {
    const price = safeFloat(i.price);
    const qty = safeFloat(i.qty);
    const amount = price * qty;
    subtotal += amount;
    if (i.applySC) scBase += amount;
    return { ...i, cleanPrice: price, cleanQty: qty, amount };
  });

  let serviceChargeVal = 0;
  let scLabel = '10%';
  if (eventData.enableServiceCharge !== false) {
    serviceChargeVal = scBase * 0.1;
  }
  const discountVal = safeFloat(eventData.discount);

  const baseTotal = subtotal + serviceChargeVal - discountVal;
  const ccSurcharge = eventData.paymentMethod === '信用卡' ? baseTotal * 0.03 : 0;
  const grandTotal = Math.round(baseTotal + ccSurcharge);

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

  return {
    parsedMenus, plating, drinks, bus, parsedCustomItems,
    setupPackagePrice, avPackagePrice, decorPackagePrice,
    subtotal, serviceChargeVal, scLabel, discountVal, ccSurcharge,
    grandTotal, totalDeposits, totalPaid, balanceDue,
    dep1, dep2, dep3
  };
};