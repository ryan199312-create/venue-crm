import React from 'react';
import { Download, Clock, CheckCircle } from 'lucide-react';

export const PendingProofCard = ({ proof, targetLabel, targetKey, receivedKey, currentProofs, setFormData, addToast }) => (
  <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-200 shadow-sm flex flex-col mt-3 animate-in slide-in-from-top-2 w-full">
    <div className="flex justify-between items-start mb-2">
      <a href={proof.url} download target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline break-all line-clamp-2 flex items-center" title={proof.fileName}>
        <Download size={12} className="mr-1 flex-shrink-0" /> 
        <span>{proof.fileName}</span> 
        <span className="text-[10px] font-medium text-slate-400 ml-1.5 whitespace-nowrap">(客戶上傳)</span>
      </a>
    </div>
    <div className="text-[10px] text-slate-400 mb-3 flex items-center">
      <Clock size={10} className="mr-1" /> {new Date(proof.uploadedAt).toLocaleString('zh-HK')}
    </div>

    <div className="mt-auto pt-2 border-t border-slate-200">
      <button type="button" onClick={() => {
        setFormData(prev => {
          const ex = Array.isArray(prev[targetKey]) ? prev[targetKey] : (prev[targetKey] ? [prev[targetKey]] : []);
          if(ex.includes(proof.url)) return prev;
          
          const updates = {
            [targetKey]: [...ex, proof.url]
          };
          if (receivedKey) {
            updates[receivedKey] = true;
          }

          return { ...prev, ...updates };
        });
        addToast(`已核准 ${targetLabel} 收款`, "success");
      }} className="w-full text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded shadow-sm transition-colors flex items-center justify-center">
        <CheckCircle size={12} className="mr-1" /> 核准確認收款 (approve)
      </button>
    </div>
  </div>
);

export default PendingProofCard;