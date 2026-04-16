import React from 'react';
import { PenTool } from 'lucide-react';
import { FormTextArea } from '../components/ui';

const RemarksTab = ({ formData, setFormData, handleInputChange }) => {

  const handleCheckboxChange = (docId) => {
    setFormData(prev => {
      const currentVisibility = prev.generalRemarksVisibility || {};
      return {
        ...prev,
        generalRemarksVisibility: {
          ...currentVisibility,
          [docId]: !currentVisibility[docId]
        }
      };
    });
  };

  const internalDocs = ['EO', 'BRIEFING'];
  const externalDocs = ['QUOTATION', 'CONTRACT', 'CONTRACT_CN', 'INVOICE', 'RECEIPT', 'MENU_CONFIRM', 'ADDENDUM'];
  
  // Map document IDs to bilingual labels for display
  const docLabels = {
    'EO': '內部行政單 (EO)',
    'BRIEFING': '樓面工作單 (Briefing)',
    'QUOTATION': '報價單 (Quotation)',
    'CONTRACT': '英文合約 (Contract EN)',
    'CONTRACT_CN': '中文合約 (Contract CN)',
    'INVOICE': '發票 (Invoice)',
    'RECEIPT': '收據 (Receipt)',
    'MENU_CONFIRM': '菜譜確認單 (Menu Confirm)',
    'ADDENDUM': '附加條款 (Addendum)'
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <PenTool size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800">通用備註 (General Remarks)</h4>
        </div>
        <FormTextArea 
          name="generalRemarks" 
          rows={8} 
          value={formData.generalRemarks} 
          onChange={handleInputChange}
          placeholder="輸入任何其他備註..."
        />
        <div className="mt-4 pt-4 border-t border-slate-100">
          <h5 className="text-sm font-bold text-slate-700 mb-3">顯示於 (Show on Documents):</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <h6 className="text-xs font-bold text-slate-500 uppercase mb-2">內部文件</h6>
              <div className="space-y-2">{internalDocs.map(docId => (<label key={docId} className="flex items-center text-sm cursor-pointer hover:text-blue-600 transition-colors"><input type="checkbox" checked={formData.generalRemarksVisibility?.[docId] || false} onChange={() => handleCheckboxChange(docId)} className="mr-2 rounded" /> {docLabels[docId] || docId}</label>))}</div>
            </div>
            <div className="md:col-span-3">
              <h6 className="text-xs font-bold text-slate-500 uppercase mb-2">外部文件</h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{externalDocs.map(docId => (<label key={docId} className="flex items-center text-sm cursor-pointer hover:text-blue-600 transition-colors"><input type="checkbox" checked={formData.generalRemarksVisibility?.[docId] || false} onChange={() => handleCheckboxChange(docId)} className="mr-2 rounded" /> {docLabels[docId] || docId}</label>))}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemarksTab;