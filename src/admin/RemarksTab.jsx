import React from 'react';
import { PenTool } from 'lucide-react';
import { FormTextArea } from '../components/ui';

const RemarksTab = ({ formData, setFormData, handleInputChange }) => {

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <PenTool size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800">內部備註 (Internal Notes)</h4>
        </div>
        <p className="text-sm text-slate-500 mb-4">此備註僅供內部使用，可獨立列印，不會顯示於任何客戶文件上。</p>
        <FormTextArea 
          name="generalRemarks" 
          rows={15} 
          value={formData.generalRemarks} 
          onChange={handleInputChange}
          placeholder="輸入任何其他備註..."
        />
      </div>
    </div>
  );
};

export default RemarksTab;