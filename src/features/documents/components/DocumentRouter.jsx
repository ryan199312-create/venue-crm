import React from 'react';

// Import New Sub-Renderers
import ContractRenderer from './renderers/ContractRenderer';
import EventOrderRenderer from './renderers/EventOrderRenderer';
import { QuotationRenderer, InvoiceRenderer, ReceiptRenderer } from './renderers/FinancialRenderers';
import FloorplanRenderer from './renderers/FloorplanRenderer';
import { AddendumRenderer, InternalNotesRenderer, MenuConfirmRenderer } from './renderers/OtherRenderers';
import { BrandedFooter } from './renderers/DocumentShared';

/**
 * DocumentRouter (Router)
 * 
 * This component acts as a high-level router that decides which specific document 
 * renderer to use based on the 'printMode'.
 */
export default function DocumentRouter({ data, printMode, appSettings, onClientSign, onAdminSign, lang = 'en' }) {
  if (!data) return null;
  
  // Filter data for specific menu printing if printMode specifies a menuId
  let renderData = data;
  if (printMode && printMode.startsWith('MENU_CONFIRM_')) {
    const parts = printMode.split('_');
    const menuId = parts[parts.length - 1];
    renderData = { ...data, menus: (data.menus || []).filter(m => String(m.id) === String(menuId)) };
  }

  const renderContent = () => {
    switch (printMode) {
      case 'FLOORPLAN':
        return <FloorplanRenderer data={renderData} appSettings={appSettings} />;
      case 'QUOTATION':
        return <QuotationRenderer data={renderData} appSettings={appSettings} onSign={onClientSign} lang={lang} />;
      case 'CONTRACT':
      case 'CONTRACT_CN':
        return <ContractRenderer data={renderData} appSettings={appSettings} onSign={onClientSign} onAdminSign={onAdminSign} isCn={printMode === 'CONTRACT_CN' || lang === 'zh'} />;
      case 'INVOICE':
        return <InvoiceRenderer data={renderData} appSettings={appSettings} onSign={onClientSign} lang={lang} />;
      case 'RECEIPT':
        return <ReceiptRenderer data={renderData} appSettings={appSettings} onSign={onClientSign} lang={lang} />;
      case 'MENU_CONFIRM':
        return <MenuConfirmRenderer data={renderData} menuId={renderData.menus?.[0]?.id} onSign={onClientSign} appSettings={appSettings} />;
      case (printMode && printMode.startsWith('MENU_CONFIRM_') ? printMode : null): {
        const parts = printMode.split('_');
        let language = 'BILINGUAL';
        let menuId = parts.length === 3 ? parts[2] : (parts.length === 4 ? parts[3] : printMode.replace('MENU_CONFIRM_', ''));
        if (parts.length === 4) language = parts[2];
        return <MenuConfirmRenderer data={renderData} menuId={menuId} onSign={onClientSign} appSettings={appSettings} language={language} />;
      }
      case 'ADDENDUM':
        return <AddendumRenderer data={renderData} onSign={onClientSign} onAdminSign={onAdminSign} appSettings={appSettings} />;
      case 'INTERNAL_NOTES':
        return <InternalNotesRenderer data={renderData} appSettings={appSettings} />;
      case 'BRIEFING':
      case 'EO':
      default:
        return <EventOrderRenderer data={renderData} printMode={printMode} appSettings={appSettings} />;
    }
  };

  return (
    <>
      <BrandedFooter data={data} />
      {renderContent()}
    </>
  );
}
