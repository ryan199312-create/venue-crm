import React from 'react';

// Import New Sub-Renderers
import BriefingRenderer from './renderers/BriefingRenderer';
import ContractRenderer from './renderers/ContractRenderer';
import EventOrderRenderer from './renderers/EventOrderRenderer';
import { QuotationRenderer, InvoiceRenderer, ReceiptRenderer } from './renderers/FinancialRenderers';
import FloorplanRenderer from './renderers/FloorplanRenderer';
import { AddendumRenderer, InternalNotesRenderer, MenuConfirmRenderer } from './renderers/OtherRenderers';

/**
 * DocumentRenderer (Router)
 * 
 * This component acts as a high-level router that decides which specific document 
 * renderer to use based on the 'printMode'.
 * 
 * The actual rendering logic is delegated to specialized components in the ./renderers directory.
 */
export default function DocumentRouter({ data, printMode, appSettings, onClientSign, onAdminSign }) {
  if (!data) return null;
  
  // Filter data for specific menu printing if printMode specifies a menuId
  let renderData = data;
  if (printMode && printMode.startsWith('MENU_CONFIRM_')) {
    const menuId = printMode.replace('MENU_CONFIRM_', '');
    renderData = { ...data, menus: (data.menus || []).filter(m => String(m.id) === String(menuId)) };
  }

  switch (printMode) {
    case 'FLOORPLAN':
      return <FloorplanRenderer data={renderData} appSettings={appSettings} />;
    case 'BRIEFING':
      return <BriefingRenderer data={renderData} printMode={printMode} appSettings={appSettings} />;
    case 'QUOTATION':
      return <QuotationRenderer data={renderData} appSettings={appSettings} onSign={onClientSign} />;
    case 'CONTRACT':
    case 'CONTRACT_CN':
      return <ContractRenderer data={renderData} appSettings={appSettings} onSign={onClientSign} isCn={printMode === 'CONTRACT_CN'} />;
    case 'INVOICE':
      return <InvoiceRenderer data={renderData} appSettings={appSettings} onSign={onClientSign} />;
    case 'RECEIPT':
      return <ReceiptRenderer data={renderData} appSettings={appSettings} onSign={onClientSign} />;
    case 'MENU_CONFIRM':
      return <MenuConfirmRenderer data={renderData} menuId={renderData.menus?.[0]?.id} onSign={onClientSign} />;
    case (printMode && printMode.startsWith('MENU_CONFIRM_') ? printMode : null): {
      const menuId = printMode.replace('MENU_CONFIRM_', '');
      return <MenuConfirmRenderer data={renderData} menuId={menuId} onSign={onClientSign} />;
    }
    case 'ADDENDUM':
      return <AddendumRenderer data={renderData} onSign={onClientSign} onAdminSign={onAdminSign} />;
    case 'INTERNAL_NOTES':
      return <InternalNotesRenderer data={renderData} />;
    case 'EO':
    default:
      return <EventOrderRenderer data={renderData} printMode={printMode} appSettings={appSettings} />;
  }
}
