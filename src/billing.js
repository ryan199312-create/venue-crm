import { safeFloat } from './helpers';

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
    bus = { amount, arrivals: eventData.busInfo.arrivals || [], departures: eventData.busInfo.departures || [] };
  }

  const setupPackagePrice = safeFloat(eventData.setupPackagePrice);
  const avPackagePrice = safeFloat(eventData.avPackagePrice);
  const decorPackagePrice = safeFloat(eventData.decorPackagePrice);

  if (setupPackagePrice > 0) { subtotal += setupPackagePrice; if (eventData.setupApplySC !== false) scBase += setupPackagePrice; }
  if (avPackagePrice > 0) { subtotal += avPackagePrice; if (eventData.avApplySC !== false) scBase += avPackagePrice; }
  if (decorPackagePrice > 0) { subtotal += decorPackagePrice; if (eventData.decorApplySC !== false) scBase += decorPackagePrice; }

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

export const calculateDepartmentSplit = (data) => {
  const split = { kitchen: 0, dimsum: 0, roast: 0, bar: 0, tea: 0, wine: 0, other: 0 };

  (data.menus || []).forEach(m => {
    const qty = parseFloat(m.qty) || 1;
    const allocation = m.allocation || {};
    let hasAllocation = false;
    Object.keys(allocation).forEach(deptKey => {
      const amount = parseFloat(allocation[deptKey]) || 0;
      if (amount > 0 && split[deptKey] !== undefined) { split[deptKey] += amount * qty; hasAllocation = true; }
    });
    if (!hasAllocation) { split.kitchen += (parseFloat(m.price) || 0) * qty; }
  });

  const dQty = parseFloat(data.drinksQty) || 1;
  const dAllocation = data.drinkAllocation || {};
  let dHasAllocation = false;
  Object.keys(dAllocation).forEach(deptKey => { const amount = parseFloat(dAllocation[deptKey]) || 0; if (amount > 0 && split[deptKey] !== undefined) { split[deptKey] += amount * dQty; dHasAllocation = true; } });
  if (!dHasAllocation) { split.bar += (parseFloat(data.drinksPrice) || 0) * dQty; }

  (data.customItems || []).forEach(item => { const qty = parseFloat(item.qty) || 1; const total = (parseFloat(item.price) || 0) * qty; const cat = item.category || 'other'; if (split[cat] !== undefined) { split[cat] += total; } else { split['other'] += total; } });
  return split;
};