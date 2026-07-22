import React from 'react';
import { FormTextArea } from '../../../components/ui';
import { useLang } from '../../../i18n/language';

const InternalNotesTab = ({ formData, handleInputChange, DocumentVisibilityToggles }) => {
  const { L } = useLang();
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <span className="font-black text-xs">LOG</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{L('內部操作備註 (Internal Remarks)')}</h3>
            <p className="text-xs text-slate-500 italic">{L('這些備註僅限內部人員查看，不會顯示於客戶合約或網頁。 (These remarks are for internal staff only and will not appear on client contracts or web pages.)')}</p>
          </div>
        </div>

        <FormTextArea
          label={L('內部記錄 (Only for staff)')}
          name="remarks"
          rows={6}
          value={formData.remarks}
          onChange={handleInputChange}
          placeholder={L('在此輸入僅限內部查看的執行細節、付款備註或其他敏感資訊... (Enter internal-only execution details, payment notes, or other sensitive information here...)')}
          className="bg-slate-50/50 border-slate-200"
        />

        <div className="pt-4 border-t border-slate-100">
          <FormTextArea
            label={L('通用備註 (General Remarks - Shown on EO)')}
            name="generalRemarks"
            rows={6}
            value={formData.generalRemarks}
            onChange={handleInputChange}
            placeholder={L('在此輸入會顯示在確認單上的通用條款或提醒... (Enter general terms or reminders that will appear on the confirmation here...)')}
          />
          <DocumentVisibilityToggles
            field="generalRemarks"
            defaultClient={true}
            defaultInternal={true}
            clientDocs={L('報價單、合約、附加協議 (Quotation, Contract, Addendum)')}
            internalDocs={L('宴會通知單、管理備註 (EO, Admin Notes)')}
          />
        </div>
      </div>
    </div>
  );
};

export default InternalNotesTab;
