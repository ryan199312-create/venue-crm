import React, { useState, useRef } from 'react';
import { DollarSign, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { formatMoney, parseMoney } from '../../services/formatters';
import PendingProofCard from './PendingProofCard';

export const DepositField = ({ label, prefix, formData, setFormData, onUpload, addToast, onRemoveProof, clientPrefix }) => {
  const amountKey = `${prefix}`;
  const dateKey = `${prefix}Date`;
  const receivedKey = `${prefix}Received`;
  const proofKey = `${prefix}Proof`;
  const proofs = Array.isArray(formData[proofKey]) ? formData[proofKey] : (formData[proofKey] ? [formData[proofKey]] : []);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const isOverdue = formData[amountKey] && !formData[receivedKey] && formData[dateKey] && new Date(formData[dateKey]) < new Date().setHours(0, 0, 0, 0);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await onUpload(file);
      setFormData(prev => {
        const existing = Array.isArray(prev[proofKey]) ? prev[proofKey] : (prev[proofKey] ? [prev[proofKey]] : []);
        return { ...prev, [proofKey]: [...existing, url] };
      });
      addToast("收據上傳成功", "success");
    } catch (error) {
      addToast("上傳失敗: " + error.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (urlToRemove) => {
    if (onRemoveProof) {
      onRemoveProof(proofKey, urlToRemove);
    } else {
      setFormData(prev => {
        const existing = Array.isArray(prev[proofKey]) ? prev[proofKey] : (prev[proofKey] ? [prev[proofKey]] : []);
        return { ...prev, [proofKey]: existing.filter(u => u !== urlToRemove) };
      });
    }
  };

  const renderFormattedLabel = (text) => {
    if (typeof text !== 'string') return text;
    const idx = text.indexOf('(');
    if (idx !== -1) {
      const main = text.substring(0, idx).trim();
      const bracket = text.substring(idx);
      return (
        <>
          <span>{main}</span>
          <span className="text-[10px] font-medium text-slate-400 ml-1.5 tracking-wider">{bracket}</span>
        </>
      );
    }
    return text;
  };

  const getFileNameFromUrl = (url) => {
    try {
      const decoded = decodeURIComponent(url.split('/').pop().split('?')[0]);
      const parts = decoded.split('_');
      if (parts.length > 2) return parts.slice(2).join('_');
      if (parts.length > 1) return parts.slice(1).join('_');
      return decoded;
    } catch(e) { return "Receipt.jpg"; }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all ${isOverdue ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <label className="text-sm font-bold text-slate-700 flex items-center shrink-0">
          {renderFormattedLabel(label)}
          {isOverdue && <span className="ml-2 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">OVERDUE</span>}
        </label>
        
        <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          
          {proofs.map((url, idx) => (
            <div key={idx} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm shrink-0">
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center text-[10px] text-blue-600 hover:underline truncate max-w-[120px]" title={getFileNameFromUrl(url)}>
                <ImageIcon size={12} className="mr-1 shrink-0" /> <span className="truncate">{getFileNameFromUrl(url)}</span>
              </a>
              <button type="button" onClick={() => handleRemove(url)} className="text-slate-400 hover:text-red-500 p-0.5"><X size={10} /></button>
            </div>
          ))}

          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-[10px] flex items-center text-slate-500 hover:text-blue-600 bg-white px-2 py-1 rounded border border-slate-200 hover:border-blue-200 transition-all shrink-0 shadow-sm">
            {isUploading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Upload size={12} className="mr-1" />} 上傳收據
          </button>

          <div className="w-px h-4 bg-slate-300 hidden sm:block mx-1"></div>
          
          <label className="flex items-center space-x-2 text-xs cursor-pointer select-none shrink-0">
            <input type="checkbox" checked={formData[receivedKey] || false} onChange={e => setFormData(prev => ({ ...prev, [receivedKey]: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span className={formData[receivedKey] ? "text-emerald-600 font-bold" : "text-slate-500"}>{formData[receivedKey] ? "已收款" : "未收款"}</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={formatMoney(formData[amountKey])}
            onChange={e => {
              const val = parseMoney(e.target.value);
              if (!isNaN(val)) setFormData(prev => ({ ...prev, [amountKey]: val }));
            }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-white"
            placeholder="0.00"
          />
        </div>
        <input
          type="date"
          value={formData[dateKey] || ''}
          onChange={e => setFormData(prev => ({ ...prev, [dateKey]: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        />
      </div>

      {formData.clientUploadedProofs?.map((proof, globalIdx) => {
        if (!clientPrefix || !proof.fileName.startsWith(clientPrefix) || proofs.includes(proof.url)) return null;
        return <PendingProofCard key={globalIdx} proof={proof} targetLabel={label} targetKey={proofKey} receivedKey={receivedKey} currentProofs={proofs} setFormData={setFormData} addToast={addToast} />;
      })}

    </div>
  );
};

export default DepositField;