import { useState, useEffect, useMemo, useCallback } from 'react';
import { generateBillingSummary } from '../../../services/billingService';
import { useAI } from '../../../hooks/useAI';

export const useEventForm = (formData, setFormData, appSettings, editingEvent, addToast) => {
  const { generate } = useAI();
  const [translatingMenuId, setTranslatingMenuId] = useState(null);
  const [isTranslatingDrinks, setIsTranslatingDrinks] = useState(false);

  const billingSummary = useMemo(() => generateBillingSummary(formData), [formData]);

  const updateFinanceState = useCallback((newData) => {
    return { ...newData, totalAmount: generateBillingSummary(newData).grandTotal };
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => {
      let newData = { ...prev };
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

      if (name === 'tableCount' || name === 'guestCount') {
        const val = parseFloat(value) || 0;
        if (newData.menus) newData.menus = newData.menus.map(m => {
          if (name === 'tableCount' && m.priceType === 'perTable') return { ...m, qty: val };
          if (name === 'guestCount' && m.priceType === 'perPerson') return { ...m, qty: val };
          return m;
        });
        if (name === 'tableCount' && newData.drinksPriceType === 'perTable') newData.drinksQty = val;
        if (name === 'guestCount' && newData.drinksPriceType === 'perPerson') newData.drinksQty = val;
        if (newData.customItems) newData.customItems = newData.customItems.map(item => {
          if (name === 'tableCount' && item.unitType === 'perTable') return { ...item, qty: val };
          if (name === 'guestCount' && item.unitType === 'perPerson') return { ...item, qty: val };
          return item;
        });
      }
      return updateFinanceState(newData);
    });
  }, [updateFinanceState, setFormData]);

  const handlePriceChange = useCallback((e) => {
    const { name, value } = e.target;
    const cleanValue = value.toString().replace(/,/g, '');
    setFormData(prev => updateFinanceState({ ...prev, [name]: cleanValue }));
  }, [updateFinanceState, setFormData]);

  const updateCustomItem = useCallback((idx, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.customItems];
      newItems[idx] = { ...newItems[idx], [field]: value };
      return updateFinanceState({ ...prev, customItems: newItems });
    });
  }, [updateFinanceState, setFormData]);

  const removeCustomItem = useCallback((idx) => {
    setFormData(prev => updateFinanceState({ ...prev, customItems: prev.customItems.filter((_, i) => i !== idx) }));
  }, [updateFinanceState, setFormData]);

  const handleMenuChange = useCallback((id, field, value) => {
    setFormData(prev => ({ ...prev, menus: prev.menus.map(m => m.id === id ? { ...m, [field]: value } : m) }));
  }, [setFormData]);

  const handleMenuAllocationChange = useCallback((menuId, deptKey, value) => {
    setFormData(prev => ({ ...prev, menus: prev.menus.map(m => { if (m.id !== menuId) return m; return { ...m, allocation: { ...m.allocation, [deptKey]: value } }; }) }));
  }, [setFormData]);

  const toggleMenuAllocation = useCallback((menuId) => {
    setFormData(prev => ({ ...prev, menus: prev.menus.map(m => m.id === menuId ? { ...m, showAllocation: !m.showAllocation } : m) }));
  }, [setFormData]);

  const handleApplyMenuPreset = useCallback((menuId, presetId) => {
    const preset = appSettings.defaultMenus.find(m => m.id.toString() === presetId.toString());
    if (preset) {
      setFormData(prev => {
        const dateObj = new Date(prev.date);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() >= 5;
        const finalPrice = isWeekend ? (preset.priceWeekend || preset.priceWeekday) : (preset.priceWeekday || preset.priceWeekend);
        const newMenus = prev.menus.map(m => m.id === menuId ? { ...m, title: preset.title, content: preset.content, price: finalPrice || 0, priceType: m.priceType || 'perTable', qty: m.qty || prev.tableCount || 1, allocation: preset.allocation || {} } : m);
        return updateFinanceState({ ...prev, menus: newMenus });
      });
      addToast(`已載入: ${preset.title}`, "success");
    }
  }, [appSettings.defaultMenus, setFormData, updateFinanceState, addToast]);

  const addMenu = useCallback(() => {
    setFormData(prev => updateFinanceState({ ...prev, menus: [...(prev.menus || []), { id: Date.now(), title: '', content: '', price: '', priceType: 'perTable', qty: prev.tableCount || 1, applySC: true }] }));
  }, [setFormData, updateFinanceState]);

  const removeMenu = useCallback((id) => {
    setFormData(prev => updateFinanceState({ ...prev, menus: prev.menus.filter(m => m.id !== id) }));
  }, [setFormData, updateFinanceState]);

  const handleTranslateMenu = async (menuId, content) => {
    if (!content) return addToast("請先輸入菜單內容", "error");
    setTranslatingMenuId(menuId);
    try {
      const systemPrompt = `You are a professional banquet menu translator. Task: Translate from Chinese to English line by line. STRICT RULES: 1. Brand Names: ALWAYS translate '璟瓏軒' as 'King Lung Heen' and '璟瓏' as 'King Lung'. 2. Format: Output the original Chinese line, followed immediately by the English translation on the next line. 3. Spacing: Remove ALL empty lines between items. 4. Punctuation: Do NOT add full stops. 5. Cleanliness: Do not add bullet points.`;
      let translatedText = await generate(content, systemPrompt);
      if (!translatedText) throw new Error("Translation API Failed");
      handleMenuChange(menuId, 'content', translatedText.replace(/\n\s*\n/g, '\n').trim());
      addToast("菜單翻譯完成！", "success");
    } catch (error) {
      addToast("翻譯失敗，請稍後再試", "error");
    } finally {
      setTranslatingMenuId(null);
    }
  };

  const handleTranslateDrinks = async () => {
    if (!formData.drinksPackage) return addToast("請先輸入酒水內容", "error");
    setIsTranslatingDrinks(true);
    try {
      const systemPrompt = `You are a professional banquet translator. Task: Translate the beverage list from Chinese to English line by line. STRICT RULES: 1. Format: Output original Chinese line, followed immediately by English translation on the next line. 2. Spacing: Remove ALL empty lines. 3. Punctuation: Do NOT add full stops.`;
      let translatedText = await generate(formData.drinksPackage, systemPrompt);
      if (!translatedText) throw new Error("Translation API Failed");
      setFormData(prev => ({ ...prev, drinksPackage: translatedText.replace(/\n\s*\n/g, '\n').trim() }));
      addToast("酒水翻譯完成！", "success");
    } catch (error) {
      addToast("翻譯失敗，請稍後再試", "error");
    } finally {
      setIsTranslatingDrinks(false);
    }
  };

  const minSpendInfo = useMemo(() => {
    if (!formData.date || formData.selectedLocations.length === 0 || !appSettings.minSpendRules) return null;
    const date = new Date(formData.date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStr = days[date.getDay()];

    let timeOfDay = 'dinner';
    if (formData.startTime) {
      const hour = parseInt(formData.startTime.split(':')[0], 10);
      if (hour < 16) timeOfDay = 'lunch';
    }

    const dynamicZones = appSettings?.zonesConfig || [];

    const getPrice = (rule) => {
      const priceEntry = rule.prices?.[dayStr];
      if (!priceEntry) return 0;
      if (typeof priceEntry === 'object') return parseInt(priceEntry[timeOfDay] || 0);
      return parseInt(priceEntry || 0);
    };

    // Helper to check if a rule's location list matches selected locations robustly
    const isRuleApplicable = (ruleLocs, selectedLocs) => {
      if (ruleLocs.length !== selectedLocs.length) return false;
      
      // For each rule location, check if it matches at least one selected location robustly
      return ruleLocs.every(rl => {
        // Find if this rule location matches a dynamic zone
        const zone = dynamicZones.find(z => `${z.nameZh}${z.nameEn ? ` (${z.nameEn})` : ''}` === rl || z.nameZh === rl);
        if (zone) {
          // If it's a zone, use robust check against selectedLocs
          const combined = `${zone.nameZh}${zone.nameEn ? ` (${zone.nameEn})` : ''}`;
          return selectedLocs.includes(combined) || selectedLocs.includes(zone.nameZh);
        }
        // Fallback for non-zone locations like '全場'
        return selectedLocs.includes(rl);
      });
    };

    const exactRule = appSettings.minSpendRules.find(r => isRuleApplicable(r.locations, formData.selectedLocations));

    if (exactRule) {
      const amount = getPrice(exactRule);
      if (amount > 0) return { amount, ruleName: `精確符合: ${formData.selectedLocations.join('+')} (${timeOfDay === 'lunch' ? '午市' : '晚市'})` };
    }

    let sum = 0;
    let applicableRules = [];
    formData.selectedLocations.forEach(loc => {
      // Find rule for this specific location
      const rule = appSettings.minSpendRules.find(r => {
        if (r.locations.length !== 1) return false;
        const rl = r.locations[0];
        const zone = dynamicZones.find(z => `${z.nameZh}${z.nameEn ? ` (${z.nameEn})` : ''}` === rl || z.nameZh === rl);
        if (zone) {
          return loc === `${zone.nameZh}${zone.nameEn ? ` (${zone.nameEn})` : ''}` || loc === zone.nameZh;
        }
        return rl === loc;
      });

      if (rule) {
        const price = getPrice(rule);
        if (price > 0) { sum += price; applicableRules.push(`${loc} ($${price.toLocaleString()})`); }
      }
    });

    if (applicableRules.length > 0) {
      return { amount: sum, ruleName: `組合加總: ${applicableRules.join(' + ')} (${timeOfDay === 'lunch' ? '午市' : '晚市'})` };
    }
    return null;
  }, [formData.date, formData.startTime, formData.selectedLocations, appSettings.minSpendRules]);

  const calculatePaymentTerms = useCallback((currentTotal, currentDate) => {
    if (!currentTotal || !currentDate) return null;
    const eventDate = new Date(currentDate);
    const orderDate = editingEvent?.createdAt ? new Date(editingEvent.createdAt.seconds * 1000) : new Date();
    const monthsDiff = (eventDate.getFullYear() - orderDate.getFullYear()) * 12 + (eventDate.getMonth() - orderDate.getMonth());

    const formatDate = (date) => new Date(date).toLocaleDateString('en-CA');
    const addMonths = (date, months) => { const d = new Date(date); d.setMonth(d.getMonth() + months); return formatDate(d); };

    const rules = appSettings.paymentRules || [];
    const matchingRule = rules.find(r => monthsDiff >= r.minMonthsInAdvance);
    if (!matchingRule) return null;

    const p1 = matchingRule.deposit1 || 0;
    const p2 = matchingRule.deposit2 || 0;
    const p3 = matchingRule.deposit3 || 0;

    let dep1 = p1 > 0 ? Math.round(currentTotal * (p1 / 100)) : '';
    let dep2 = p2 > 0 ? Math.round(currentTotal * (p2 / 100)) : '';
    let dep3 = p3 > 0 ? Math.round(currentTotal * (p3 / 100)) : '';

    if (p1 + p2 + p3 === 100) {
      if (p3 > 0) { dep3 = currentTotal - (Number(dep1) || 0) - (Number(dep2) || 0); }
      else if (p2 > 0) { dep2 = currentTotal - (Number(dep1) || 0); }
      else if (p1 > 0) { dep1 = currentTotal; }
    }

    return {
      deposit1: dep1, deposit1Date: p1 > 0 ? addMonths(orderDate, matchingRule.deposit1Offset || 0) : '',
      deposit2: dep2, deposit2Date: p2 > 0 ? addMonths(orderDate, matchingRule.deposit2Offset || 0) : '',
      deposit3: dep3, deposit3Date: p3 > 0 ? addMonths(orderDate, matchingRule.deposit3Offset || 0) : '',
      ruleName: matchingRule.name
    };
  }, [appSettings.paymentRules, editingEvent]);

  return {
    billingSummary,
    updateFinanceState,
    handleInputChange,
    handlePriceChange,
    updateCustomItem,
    removeCustomItem,
    handleMenuChange,
    handleMenuAllocationChange,
    toggleMenuAllocation,
    handleApplyMenuPreset,
    addMenu,
    removeMenu,
    translatingMenuId,
    isTranslatingDrinks,
    handleTranslateMenu,
    handleTranslateDrinks,
    minSpendInfo,
    calculatePaymentTerms
  };
};
