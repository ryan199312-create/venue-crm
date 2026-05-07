import React from 'react';
import { FormTextArea } from '../../../components/ui';

const InternalNotesTab = ({ formData, handleInputChange }) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <span className="font-black text-xs">LOG</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800">內部操作備註 (Internal Remarks)</h3>
            <p className="text-xs text-slate-500 italic">這些備註僅限內部人員查看，不會顯示於客戶合約或網頁。</p>
          </div>
        </div>

        <FormTextArea
          label="內部記錄 (Only for staff)"
          name="remarks"
          rows={12}
          value={formData.remarks}
          onChange={handleInputChange}
          placeholder="在此輸入僅限內部查看的執行細節、付款備註或其他敏感資訊..."
          className="bg-slate-50/50 border-slate-200"
        />
      </div>
    </div>
  );
};

export default InternalNotesTab;
