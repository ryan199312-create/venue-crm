// Document i18n. Each document renders in ONE language (English OR 中文) — never
// bilingual. docT(lang) returns every user-facing label in the chosen language.
// lang is 'zh' for Chinese, anything else (default 'en') for English.
export const docT = (lang) => {
  const zh = lang === 'zh';
  return {
    zh,
    // Header / meta
    no: zh ? '編號' : 'No.',
    date: zh ? '日期' : 'Date',
    tel: zh ? '電話' : 'Tel',
    web: zh ? '網址' : 'Web',
    // Client / event info
    billTo: zh ? '客戶資料' : 'Bill To',
    eventDetails: zh ? '活動詳情' : 'Event Details',
    email: zh ? '電郵' : 'Email',
    clientHidden: zh ? '（客戶資料已隱藏）' : '(Client details hidden)',
    na: zh ? '沒有' : 'N/A',
    tablesUnit: zh ? '席' : 'Tables',
    paxUnit: zh ? '人' : 'Pax',
    // Item table headers
    description: zh ? '項目' : 'Description',
    unitPrice: zh ? '單價' : 'Unit Price',
    qty: zh ? '數量' : 'Qty',
    amountHkd: zh ? '金額（港幣）' : 'Amount (HKD)',
    // Item table line items
    platingFee: zh ? '位上服務費' : 'Plating Service Fee',
    beveragePackage: zh ? '酒水套餐' : 'Beverage Package',
    setupPackage: zh ? '舞台與接待設備套票' : 'Setup & Reception Package',
    avPackage: zh ? '影音設備套票' : 'AV Equipment Package',
    decorPackage: zh ? '場地佈置套票' : 'Venue Decoration Package',
    busArrangement: zh ? '旅遊巴安排' : 'Bus Arrangement',
    comp: zh ? '免費' : 'COMP',
    arrivals: zh ? '接載' : 'Arrivals',
    departures: zh ? '散席' : 'Departures',
    busesUnit: zh ? '架' : 'Buses',
    // Totals
    subtotal: zh ? '小計' : 'Subtotal',
    serviceCharge: zh ? '服務費' : 'Service Charge',
    discount: zh ? '折扣優惠' : 'Discount',
    ccSurcharge: zh ? '信用卡附加費' : 'Credit Card Surcharge',
    grandTotal: zh ? '總金額' : 'Grand Total',
    totalPaid: zh ? '已付金額' : 'Total Paid',
    balanceDue: zh ? '餘額' : 'Balance Due',
    // Payment schedule / records
    paymentSchedule: zh ? '建議付款時間表' : 'Suggested Payment Schedule',
    payment1Deposit: zh ? '第一期' : '1st Payment',
    payment2: zh ? '第二期' : '2nd Payment',
    payment3: zh ? '第三期' : '3rd Payment',
    finalBalance: zh ? '尾數' : 'Final Balance',
    payment1: zh ? '第一期' : '1st Payment',
    tbc: zh ? '待定' : 'TBC',
    received: zh ? '已收' : 'RECEIVED',
    // Signature
    signed: zh ? '簽署日期' : 'Signed',
    // Payment methods
    paymentMethodsTitle: zh ? '付款方式及銀行資料' : 'Payment Methods & Bank Details',
    bankTransfer: zh ? '銀行轉帳' : 'Bank Transfer',
    accountName: zh ? '名稱' : 'Name',
    accountNo: zh ? '賬號' : 'A/C',
    fps: zh ? '轉數快' : 'FPS',
    cheque: zh ? '支票' : 'Cheque',
    payableTo: zh ? '抬頭人' : 'Payable to',
    wechat: zh ? '微信支付' : 'WeChat Pay',
    alipay: zh ? '支付寶' : 'Alipay',
    accepted: zh ? '接受' : 'Accepted',
    creditCard: zh ? '信用卡' : 'Credit Card',
    surcharge: zh ? '附加費' : 'Surcharge',
    // Financial docs
    paymentTerms: zh ? '付款條款' : 'Payment Terms',
    confirmedAcceptedBy: zh ? '確認及接受' : 'Confirmed & Accepted by',
    clientSignature: zh ? '客戶簽署' : 'Client Signature',
    clientSignatureChop: zh ? '客戶簽署 / 公司蓋章' : 'Client Signature / Company Chop',
    authorizedSignatureChop: zh ? '授權簽署及蓋章' : 'Authorized Signature & Chop',
    forAndOnBehalf: zh ? '代表' : 'For and on behalf of',
    // Document type names (single language)
    quotation: zh ? '報價單' : 'Quotation',
    invoice: zh ? '發票' : 'Invoice',
    receipt: zh ? '收據' : 'Receipt',
    contract: zh ? '合約' : 'Contract',
    addendum: zh ? '合約附加條款' : 'Addendum',
    menuConfirmation: zh ? '菜單確認表' : 'Menu Confirmation',
    floorPlan: zh ? '場地平面圖' : 'Floor Plan',
    // Addendum
    addendumIntro: zh
      ? '本附加條款為下述原合約之補充文件，並構成其一部分。除本文件明確修訂者外，原合約之所有條款及細則維持不變並繼續有效。'
      : 'This Addendum supplements and forms part of the original agreement referenced below. All terms and conditions of the original agreement remain in full force except as expressly amended herein.',
    originalAgreementItems: zh ? '原合約項目' : 'Original Agreement',
    originalSubtotal: zh ? '原合約小計' : 'Original Subtotal',
    originalServiceCharge: zh ? '原合約服務費' : 'Original Service Charge',
    originalCcSurcharge: zh ? '原合約信用卡附加費' : 'Original CC Surcharge',
    originalGrandTotal: zh ? '原合約總金額' : 'Original Grand Total',
    addendumItems: zh ? '新增項目' : 'Addendum Items',
    additionalCost: zh ? '新增費用' : 'Additional Cost',
    newGrandTotal: zh ? '更新後總金額' : 'New Grand Total',
    // Menu confirmation
    weddingMenu: zh ? '婚宴菜譜' : 'Wedding Menu',
    selectedCourses: zh ? '已選擇菜譜內容' : 'Selected Course Arrangement',
    dietaryRequirements: zh ? '特別飲食要求' : 'Dietary Requirements',
    foodAllergy: zh ? '食物過敏' : 'Food Allergy',
    specialArrangement: zh ? '特別安排' : 'Special Arrangement',
    offerValidUntil: zh ? '有效期至' : 'Offer Valid Until',
    menuDataNotFound: zh ? '錯誤：找不到菜單資料' : 'Error: Menu Data Not Found',
  };
};

// Localised date formatting for documents. English = "Mon, 21 Jul 2026";
// Chinese = "2026年7月21日 星期一".
export const formatDocDate = (dateStr, lang) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return lang === 'zh'
    ? d.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
};
