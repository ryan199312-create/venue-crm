import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Download, Loader2, CheckCircle, PenTool, Layout, Utensils, Printer, Eye, X, Clock } from 'lucide-react';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { renderToString } from 'react-dom/server';
 import DocumentRenderer from '../admin/DocumentRenderer';
import { SignaturePad } from './ui';

export default function DocumentManager({ eventData, appSettings, onSign, onPrint, isClientPortal = false }) {
  const [isDownloading, setIsDownloading] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [stagedSignature, setStagedSignature] = useState(null);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);

  const openPreview = (docId) => {
    setStagedSignature(null);
    setPreviewDoc(docId);
  };

  const closePreview = () => {
    setStagedSignature(null);
    setPreviewDoc(null);
  };

  const handleConfirmSignature = async () => {
    setIsSubmittingSignature(true);
    try {
      await onSign(previewDoc, stagedSignature);
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
    if (stagedSignature) {
      data.signatures = { ...(data.signatures || {}) };
      data.signatures[previewDoc] = { ...(data.signatures[previewDoc] || {}) };
      if (isClientPortal) {
        data.signatures[previewDoc].client = stagedSignature;
        data.signatures[previewDoc].clientDate = new Date().toISOString();
      } else {
        data.signatures[previewDoc].admin = stagedSignature;
        data.signatures[previewDoc].adminDate = new Date().toISOString();
      }
    }
    return data;
  }, [eventData, previewDoc, stagedSignature, isClientPortal]);

  const handleDownloadPDF = async (docType, includeSignature = true) => {
    setIsDownloading(`${docType}-${includeSignature}`);
    try {
      const pdfData = includeSignature ? eventData : { 
        ...eventData, 
        clientSignature: null, 
        clientSignatureDate: null,
        signatures: null // Strip out per-document signatures
      };
      
      const htmlContent = renderToString(<DocumentRenderer data={pdfData} printMode={docType} appSettings={appSettings} />);
      
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Noto Sans TC', 'PingFang HK', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              /* Unlock pagination constraints */
              @media print { 
                html, body, #root { 
                  height: auto !important; 
                  min-height: auto !important; 
                  overflow: visible !important; 
                  position: static !important;
                  display: block !important;
                } 
              }
            </style>
          </head>
          <body>${htmlContent}</body>
        </html>
      `;

      // Define hasClientSig for file naming
      const sigData = eventData.signatures?.[docType] || {};
      const legacySig = ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'MENU_CONFIRM'].includes(docType) ? eventData.clientSignature : null;
      const clientSig = sigData.client || legacySig;
      const hasClientSig = !!clientSig;

      const sigTag = (includeSignature && hasClientSig && ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'MENU_CONFIRM'].includes(docType)) ? '_Signed' : '';
      
      // Sanitize file name to prevent browser download path errors
      const safeName = (eventData.orderId || eventData.eventName || 'Document').replace(/[\/\\]/g, '-');
      const fileName = `${safeName}_${docType}${sigTag}.pdf`;
      
      // Explicitly set client timeout to 120s to match Cloud Function and prevent cold-start failures
      const generatePdfApi = httpsCallable(functions, 'generatePdfBackend', { timeout: 120000 });
      const response = await generatePdfApi({ html: fullHtml, fileName, docType });

      if (!response.data || !response.data.url) {
        throw new Error("伺服器未能返回 PDF 連結 (No PDF URL returned from server)");
      }

      // Trigger the actual file download in the browser
      const a = document.createElement('a');
      a.href = response.data.url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (error) {
      console.error("PDF Download Error:", error);
      alert(`下載失敗 (Download failed): ${error.message || '未知錯誤'}\n\n請稍後再試。`);
    } finally {
      setIsDownloading(null);
    }
  };

  const docs = [
    { id: 'EO', label: '內部行政單', sub: 'Event Order', clientSignable: false, adminSignable: false, internalOnly: true },
    { id: 'BRIEFING', label: '樓面工作單', sub: 'Briefing', clientSignable: false, adminSignable: false, internalOnly: true }
  ];

  const externalDocsList = [
    { id: 'MENU_CONFIRM', label: '菜譜確認單', sub: 'Menu Confirmation', clientSignable: true, adminSignable: false, icon: Utensils },
    { id: 'QUOTATION', label: '報價單', sub: 'Quotation', clientSignable: true, adminSignable: false },
    { id: 'CONTRACT', label: '英文合約', sub: 'Contract (EN)', clientSignable: true, adminSignable: true },
    { id: 'CONTRACT_CN', label: '中文合約', sub: 'Contract (CN)', clientSignable: true, adminSignable: true },
    { id: 'INVOICE', label: '發票', sub: 'Invoice', clientSignable: false, adminSignable: false },
    { id: 'RECEIPT', label: '收據', sub: 'Receipt', clientSignable: false, adminSignable: false, condition: (eventData.deposit1Received || eventData.deposit2Received || eventData.deposit3Received || eventData.balanceReceived) },
    { id: 'FLOORPLAN', label: '平面圖', sub: 'Floorplan', clientSignable: false, adminSignable: false, icon: Layout }
  ];

  const allDocs = [...docs, ...externalDocsList];
  const internalDocs = docs.filter(d => (d.condition === undefined || d.condition));
  const externalDocs = externalDocsList.filter(d => (d.condition === undefined || d.condition));

  const renderDocRow = (doc) => {
    const sigData = eventData.signatures?.[doc.id] || {};
    const legacySig = ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'MENU_CONFIRM'].includes(doc.id) ? eventData.clientSignature : null;
    const clientSig = sigData.client || legacySig;
    const adminSig = sigData.admin;
    
    const hasClientSig = !!clientSig;
    const hasAdminSig = !!adminSig;
    const isFullySigned = (!doc.clientSignable || hasClientSig) && (!doc.adminSignable || hasAdminSig);
    
    const DocIcon = doc.icon || FileText;
    
    return (
      <div key={doc.id} onClick={() => openPreview(doc.id)} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 active:bg-slate-100 border-b border-slate-100 last:border-0 gap-3 transition-all duration-200 hover:shadow-sm hover:z-10 relative cursor-pointer active:scale-[0.995] group">
        <div className="flex items-center gap-3">
          <DocIcon size={16} className="text-slate-400 shrink-0 group-hover:text-blue-500 transition-colors" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700 leading-tight">{doc.label}</span>
            <span className="text-[10px] text-slate-400">{doc.sub}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Actions */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 ml-1 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button"
              onClick={() => handleDownloadPDF(doc.id, false)}
              disabled={isDownloading !== null}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors disabled:opacity-50"
              title="下載原檔 (Download Original)"
            >
              {isDownloading === `${doc.id}-false` ? <Loader2 size={14} className="animate-spin text-[#A57C00]" /> : <Download size={14} />}
            </button>

            {(doc.clientSignable || doc.adminSignable) && (isFullySigned || hasClientSig || hasAdminSig) && (
              <button 
                type="button"
                onClick={() => handleDownloadPDF(doc.id, true)}
                disabled={isDownloading !== null}
                className="p-1.5 text-[#A57C00] hover:text-[#8a6800] hover:bg-white rounded transition-colors disabled:opacity-50 flex items-center"
                title="下載已簽署檔案 (Download Signed)"
              >
                {isDownloading === `${doc.id}-true` ? <Loader2 size={14} className="animate-spin text-[#A57C00]" /> : <Download size={14} />}
                <span className="text-[10px] font-bold ml-1 hidden sm:inline-block">已簽署</span>
              </button>
            )}

            {doc.clientSignable && isClientPortal && !hasClientSig && (
              <button type="button" onClick={() => openPreview(doc.id)} className="px-2 py-1.5 text-[10px] bg-[#A57C00] text-white hover:bg-[#8a6800] rounded transition-colors font-bold ml-1 shadow-sm flex items-center">
                <PenTool size={12} className="mr-1" /> 檢視及簽署
              </button>
            )}

            {doc.adminSignable && !isClientPortal && !hasAdminSig && (
              <button type="button" onClick={() => openPreview(doc.id)} className="px-2 py-1.5 text-[10px] bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors font-bold ml-1 shadow-sm flex items-center">
                <PenTool size={12} className="mr-1" /> 檢視及簽署
              </button>
            )}
          </div>
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
                      <button type="button" onClick={() => { onPrint(previewDoc); closePreview(); }} className="flex items-center text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                        <Printer size={14} className="mr-1.5" /> 列印 (Print)
                      </button>
                    )}
                    <button type="button" onClick={() => handleDownloadPDF(previewDoc, true)} disabled={isDownloading !== null} className="flex items-center text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                      {isDownloading === `${previewDoc}-true` ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Download size={14} className="mr-1.5" />}
                      下載 (Download)
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    <button type="button" onClick={closePreview} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg">
                      <X size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center relative">
              <div className="bg-white shadow-xl max-w-[210mm] w-full shrink-0 h-max overflow-hidden">
                {(() => {
                  const activeDocDef = allDocs.find(d => d.id === previewDoc);
                  const hasStagedOrRealClientSig = !!(dataToRender.signatures?.[previewDoc]?.client || dataToRender.clientSignature);
                  const hasStagedOrRealAdminSig = !!dataToRender.signatures?.[previewDoc]?.admin;
                  return (
                    <DocumentRenderer 
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