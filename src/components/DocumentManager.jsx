import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Download, Loader2, CheckCircle, PenTool, Layout, Utensils, Printer, Eye, X, Plus } from 'lucide-react';
 import DocumentRouter from "../features/documents/components/DocumentRouter";
import { SignaturePad } from './ui';
import { usePdfGenerator } from "../features/documents/hooks/usePdfGenerator";
import { useAuth } from '../context/AuthContext';

export default function DocumentManager({ eventData, appSettings, onSign, onPrint, isClientPortal = false }) {
  const { hasPermission } = useAuth();
  const [isDownloading, setIsDownloading] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [stagedSignature, setStagedSignature] = useState(null);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);
  
  const { generatePdf } = usePdfGenerator();

  const openPreview = (docId, menuId = null) => {
    setStagedSignature(null);
    setPreviewDoc(docId);
    setSelectedMenuId(menuId);
  };

  const closePreview = () => {
    setStagedSignature(null);
    setPreviewDoc(null);
    setSelectedMenuId(null);
    setIsSigningModalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isSigningModalOpen) {
          setIsSigningModalOpen(false);
        } else if (previewDoc) {
          closePreview();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, isSigningModalOpen]);

  const handleConfirmSignature = async () => {
    setIsSubmittingSignature(true);
    try {
      const docType = selectedMenuId ? `MENU_CONFIRM_${selectedMenuId}` : previewDoc;
      const role = isClientPortal ? 'client' : 'admin';
      await onSign(docType, stagedSignature, role);
      closePreview(); // Force close the preview to reveal the updated status list
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  // Automatically overlay the staged signature into the document data for preview
  const dataToRender = useMemo(() => {
    if (!previewDoc) return eventData;
    const data = { ...eventData };
    const sigKey = selectedMenuId ? `MENU_CONFIRM_${selectedMenuId}` : previewDoc;

    if (selectedMenuId) {
      data.menus = (data.menus || []).filter(m => m.id === selectedMenuId);
    }

      // Ensure signatures object exists and is a new reference to avoid mutating props
      data.signatures = { ...(data.signatures || {}) };

      // Copy specific menu signature to the generic previewDoc key so DocumentRouter finds it
      const existingSig = data.signatures[sigKey];
      if (existingSig && sigKey !== previewDoc) {
        data.signatures[previewDoc] = { 
          ...(data.signatures[previewDoc] || {}), 
          ...existingSig 
        };
      }

    if (stagedSignature) {
      data.signatures[sigKey] = { ...(data.signatures[sigKey] || {}) };
        data.signatures[previewDoc] = { ...(data.signatures[previewDoc] || {}) };
      if (isClientPortal) {
        data.signatures[sigKey].client = stagedSignature;
        data.signatures[sigKey].clientDate = new Date().toISOString();
          data.signatures[previewDoc].client = stagedSignature;
          data.signatures[previewDoc].clientDate = new Date().toISOString();
      } else {
        data.signatures[sigKey].admin = stagedSignature;
        data.signatures[sigKey].adminDate = new Date().toISOString();
          data.signatures[previewDoc].admin = stagedSignature;
          data.signatures[previewDoc].adminDate = new Date().toISOString();
      }
    }
    return data;
  }, [eventData, previewDoc, selectedMenuId, stagedSignature, isClientPortal]);

  const handleDownloadPDF = async (docType, includeSignature = true, menuId = null) => {
    // Hidden as per user request to remove download button
    return;
  };

  const docs = [
    { id: 'EO', label: '內部行政單', sub: 'Event Order', clientSignable: false, adminSignable: false, internalOnly: true, permission: 'doc_eo' },
    { id: 'BRIEFING', label: '樓面工作單', sub: 'Briefing', clientSignable: false, adminSignable: false, internalOnly: true, permission: 'doc_eo' },
    { id: 'INTERNAL_NOTES', label: '內部備註', sub: 'Internal Notes', clientSignable: false, adminSignable: false, internalOnly: true, icon: PenTool, permission: 'doc_eo' }
  ];

  const externalDocsList = [
    ...(eventData.menus || []).map(m => ({
      id: 'MENU_CONFIRM',
      menuId: m.id,
      label: `菜譜確認: ${m.title || '未命名'}`,
      sub: `Menu Confirmation - ${m.title || 'Unnamed'}`,
      clientSignable: true,
      adminSignable: false,
      icon: Utensils,
      permission: 'doc_menu'
    })),
    { id: 'QUOTATION', label: '報價單', sub: 'Quotation', clientSignable: true, adminSignable: false, permission: 'doc_quotation' },
    { id: 'CONTRACT', label: '英文合約', sub: 'Contract (EN)', clientSignable: true, adminSignable: true, permission: 'doc_contract' },
    { id: 'CONTRACT_CN', label: '中文合約', sub: 'Contract (CN)', clientSignable: true, adminSignable: true, permission: 'doc_contract' },
    { id: 'INVOICE', label: '發票', sub: 'Invoice', clientSignable: false, adminSignable: false, permission: 'doc_invoice' },
    { id: 'RECEIPT', label: '收據', sub: 'Receipt', clientSignable: false, adminSignable: false, permission: 'doc_receipt' },
    { id: 'ADDENDUM', label: '附加條款', sub: 'Addendum', clientSignable: true, adminSignable: true, icon: Plus, permission: 'doc_contract' },
    { id: 'FLOORPLAN', label: '平面圖', sub: 'Floorplan', clientSignable: false, adminSignable: false, icon: Layout, permission: 'doc_floorplan' }
  ];

  const allDocs = [...docs, ...externalDocsList];
  const internalDocs = docs.filter(d => (d.condition === undefined || d.condition) && (isClientPortal || hasPermission(d.permission)));
  const externalDocs = externalDocsList.filter(d => (d.condition === undefined || d.condition) && (isClientPortal || hasPermission(d.permission)));

  const renderDocRow = (doc) => {
    const sigKey = doc.menuId ? `MENU_CONFIRM_${doc.menuId}` : doc.id;
    const sigData = eventData.signatures?.[sigKey] || {};
    const legacySig = ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'MENU_CONFIRM'].includes(doc.id) && !doc.menuId ? eventData.clientSignature : null;
    const clientSig = sigData.client || legacySig;
    const adminSig = sigData.admin;
    
    const hasClientSig = !!clientSig;
    const hasAdminSig = !!adminSig;
    const isFullySigned = (!doc.clientSignable || hasClientSig) && (!doc.adminSignable || hasAdminSig);
    
    const DocIcon = doc.icon || FileText;
    
    return (
      <div key={doc.menuId ? `${doc.id}_${doc.menuId}` : doc.id} onClick={() => openPreview(doc.id, doc.menuId)} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 active:bg-slate-100 border-b border-slate-100 last:border-0 gap-3 transition-all duration-200 hover:shadow-sm hover:z-10 relative cursor-pointer active:scale-[0.995] group">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isFullySigned ? 'bg-emerald-50 text-emerald-600' : (doc.clientSignable && isClientPortal && !hasClientSig ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-slate-50 text-slate-400')}`}>
            <DocIcon size={18} className="shrink-0" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700 leading-tight">{doc.label}</span>
              {doc.clientSignable && isClientPortal && !hasClientSig && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-amber-500 text-white shadow-sm">Action Required</span>
              )}
              {isFullySigned && (
                <CheckCircle size={12} className="text-emerald-500" />
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium tracking-tight uppercase">{doc.sub}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {/* Actions */}
          {doc.clientSignable && isClientPortal && !hasClientSig && (
            <button type="button" onClick={() => { openPreview(doc.id, doc.menuId); setIsSigningModalOpen(true); }} className="px-2 py-1.5 text-[10px] bg-[#A57C00] text-white hover:bg-[#8a6800] rounded transition-colors font-bold shadow-sm flex items-center">
              <PenTool size={12} className="mr-1" /> 檢視及簽署
            </button>
          )}

          {doc.adminSignable && !isClientPortal && !hasAdminSig && (
            <button type="button" onClick={() => { openPreview(doc.id, doc.menuId); setIsSigningModalOpen(true); }} className="px-2 py-1.5 text-[10px] bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors font-bold shadow-sm flex items-center">
              <PenTool size={12} className="mr-1" /> 檢視及簽署
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full bg-white">
      {!isClientPortal && internalDocs.length > 0 && (
        <>
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">內部文件 (Internal Documents)</span>
          </div>
          {internalDocs.map(renderDocRow)}
        </>
      )}
      
      {!isClientPortal && externalDocs.length > 0 && (
        <div className={`px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center ${internalDocs.length > 0 ? 'border-t' : ''}`}>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">外部文件 (External Documents)</span>
        </div>
      )}
      
      {externalDocs.map(renderDocRow)}

      {/* Document Preview & Interactive Sign Modal */}
      {previewDoc && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in">
          <div className="bg-slate-200 w-full max-w-5xl h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl relative">
            <div className={`px-4 py-3 flex justify-between items-center shrink-0 shadow-md z-10 transition-colors ${stagedSignature ? 'bg-[#A57C00] text-white' : 'bg-slate-900 text-white'}`}>
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-slate-400" />
                <span className="font-bold text-sm">
                  {stagedSignature ? "確認預覽 (Preview & Confirm)" : "文件預覽 (Document Preview)"} - {allDocs.find(d => d.id === previewDoc)?.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {stagedSignature ? (
                  <>
                    <button type="button" onClick={() => setIsSigningModalOpen(true)} disabled={isSubmittingSignature} className="flex items-center text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                      <PenTool size={14} className="mr-1.5" /> 重簽 (Redo)
                    </button>
                    <button type="button" onClick={() => setStagedSignature(null)} disabled={isSubmittingSignature} className="flex items-center text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                      <X size={14} className="mr-1.5" /> 取消 (Cancel)
                    </button>
                    <div className="w-px h-4 bg-white/30 mx-1"></div>
                    <button type="button" onClick={handleConfirmSignature} disabled={isSubmittingSignature} className="flex items-center text-sm font-bold bg-white text-[#A57C00] hover:bg-slate-50 px-4 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                      {isSubmittingSignature ? <Loader2 size={16} className="animate-spin mr-1.5" /> : <CheckCircle size={16} className="mr-1.5" />}
                      確認並提交 (Submit)
                    </button>
                  </>
                ) : (
                  <>
                    {!isClientPortal && onPrint && (
                      <button type="button" onClick={() => { onPrint(selectedMenuId ? `MENU_CONFIRM_${selectedMenuId}` : previewDoc); closePreview(); }} className="flex items-center text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                        <Printer size={14} className="mr-1.5" /> 列印 (Print)
                      </button>
                    )}
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    <button type="button" onClick={closePreview} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg">
                      <X size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
                {(() => {
                  const activeDocDef = allDocs.find(d => d.id === previewDoc && (selectedMenuId ? d.menuId === selectedMenuId : true));
                  const sigKey = selectedMenuId ? `MENU_CONFIRM_${selectedMenuId}` : previewDoc;
                  const hasStagedOrRealClientSig = !!(dataToRender.signatures?.[sigKey]?.client || dataToRender.clientSignature);
                  const hasStagedOrRealAdminSig = !!dataToRender.signatures?.[sigKey]?.admin;
                  return (
                    <DocumentRouter 
                      data={dataToRender} 
                      printMode={previewDoc} 
                      appSettings={appSettings} 
                      onClientSign={isClientPortal && activeDocDef?.clientSignable && !hasStagedOrRealClientSig ? () => setIsSigningModalOpen(true) : undefined}
                      onAdminSign={!isClientPortal && activeDocDef?.adminSignable && !hasStagedOrRealAdminSig ? () => setIsSigningModalOpen(true) : undefined}
                    />
                  );
                })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isSigningModalOpen && (
        <SignaturePad
          title={`線上簽署 (Sign Document)`}
          onSave={(base64) => { setStagedSignature(base64); setIsSigningModalOpen(false); }}
          onCancel={() => setIsSigningModalOpen(false)}
          isSubmitting={false}
        />
      )}
    </div>
  );
}