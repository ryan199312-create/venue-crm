import React from 'react';
import { FileText, DollarSign, Users, Building2 } from 'lucide-react';
import { FormInput, FormSelect, LocationSelector, TimeInput } from '../../../components/ui';
import { EVENT_TYPES } from '../../../services/billingService';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../i18n/language';
import { functions } from '../../../core/firebase';
import { httpsCallable } from 'firebase/functions';

const BasicDetailsTab = ({ formData, setFormData, handleInputChange, minSpendInfo, users = [], scopedAppSettings }) => {
  const { getVisibleVenues, hasPermission, outlets, appId } = useAuth();
  const { L } = useLang();
  const visibleVenues = getVisibleVenues(outlets);
  const [resettingPw, setResettingPw] = React.useState(false);

  // Staff-triggered reset of the client's portal password (the portal has no email/OTP
  // self-service reset). The client sets a fresh password on their next login.
  const handleResetPortalPassword = async () => {
    const phone = formData.clientPhone;
    if (!phone || phone.replace(/[^0-9]/g, '').length < 8) { alert(L('請先填寫有效的客戶電話。 (Please enter a valid client phone first.)')); return; }
    if (!window.confirm(L('確定要重設此客戶的門戶密碼嗎？他們下次登入時需要重新建立密碼。 (Reset this client\'s portal password? They will create a new one on next login.)'))) return;
    setResettingPw(true);
    try {
      await httpsCallable(functions, 'resetClientPassword')({ appId, phone });
      alert(L('已重設。客戶下次登入時可設定新密碼。 (Done — the client can set a new password on next login.)'));
    } catch (e) {
      alert(`${L('重設失敗 (Reset failed)')}: ${e.message}`);
    } finally { setResettingPw(false); }
  };

  const handleCheckboxChange = (userName) => {
    const currentReps = formData.salesRep ? formData.salesRep.split(', ') : [];
    let newReps;
    if (currentReps.includes(userName)) {
      newReps = currentReps.filter(name => name !== userName);
    } else {
      newReps = [...currentReps, userName];
    }
    setFormData(prev => ({ ...prev, salesRep: newReps.join(', ') }));
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-6">
        <FormInput label={L('訂單編號 (Order ID)')} name="orderId" required value={formData.orderId} onChange={handleInputChange} />

        <FormSelect
          label={L('場地 (Outlet)')}
          name="venueId"
          value={formData.venueId}
          onChange={handleInputChange}
          required
          options={visibleVenues.map(v => ({ value: v.id, label: v.name }))}
        />

        <FormSelect
          label={L('狀態 (Status)')}
          name="status"
          options={[
            { value: 'tentative', label: L('暫定 (Tentative)') },
            { value: 'confirmed', label: L('已確認 (Confirmed)') },
            { value: 'completed', label: L('已完成 (Completed)') },
            { value: 'cancelled', label: L('已取消 (Cancelled)') }
          ]}
          value={formData.status}
          onChange={handleInputChange}
        />
        <div className="space-y-3">
          <FormSelect label={L('活動類型 (Event Type)')} name="eventType" options={EVENT_TYPES} value={formData.eventType} onChange={handleInputChange} />
          {formData.eventType === '其他 (Other)' && (
            <FormInput
              label={L('自定義活動類型 (Custom Event Type)')}
              name="customEventType"
              value={formData.customEventType || ''}
              onChange={handleInputChange}
              placeholder={L('例如: 產品發佈會 (e.g. Product Launch)')}
              className="animate-in slide-in-from-top-2"
            />
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <FileText size={18} className="text-indigo-600" />
          <h4 className="font-bold text-slate-800">{L('活動詳情 (Event Details)')}</h4>
        </div>
        <FormInput label={L('活動名稱 (Event Name)')} name="eventName" required value={formData.eventName} onChange={handleInputChange} placeholder={L('例如: 週年晚宴 (e.g. Annual Dinner)')} />
        <div className="grid grid-cols-4 gap-4">
          <FormInput label={L('活動日期 (Event Date)')} name="date" type="date" required className="col-span-1" value={formData.date} onChange={handleInputChange} />
          <TimeInput label={L('開始時間 (Start)')} name="startTime" required className="col-span-1" value={formData.startTime} onChange={handleInputChange} />

          <TimeInput
            label={L('入席時間 (Serving)')}
            name="servingTime"
            className="col-span-1"
            value={formData.servingTime}
            onChange={handleInputChange}
            inputClassName="border-red-200 bg-red-50 focus:ring-red-500 focus:border-red-500"
            labelClassName="text-red-600 font-bold"
          />

          <FormSelect
            label={L('出餐方式 (Style)')}
            name="servingStyle"
            className="col-span-1"
            value={formData.servingStyle}
            onChange={handleInputChange}
            options={[
              { value: '圍餐', label: L('標準圍餐 (Banquet)') },
              { value: '位上', label: L('位上 (Indiv. Plating)') },
              { value: 'Buffet', label: L('自助餐 (Buffet)') },
              { value: 'Other', label: L('其他 (Other)') }
            ]}
          />

          <TimeInput label={L('結束時間 (End)')} name="endTime" required className="col-span-1" value={formData.endTime} onChange={handleInputChange} />
        </div>
        <div className="pt-4 border-t border-slate-100 mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col justify-between">
              <div>
                <LocationSelector formData={formData} setFormData={setFormData} appSettings={scopedAppSettings} />
                {minSpendInfo && (
                  <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row justify-between items-center animate-in slide-in-from-top-2">
                    <div className="flex items-center text-indigo-900 mb-1 sm:mb-0">
                      <div className="bg-white p-1 rounded-full shadow-sm mr-2 text-indigo-600">
                        <DollarSign size={14} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 block">{L('最低消費 (Min Spend)')}</span>
                        <span className="text-base font-black font-mono tracking-tight">${minSpendInfo.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium text-indigo-500 bg-white px-2 py-0.5 rounded border border-indigo-100 block">{minSpendInfo.ruleName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label={L('圍數 (Tables)')} name="tableCount" type="number" value={formData.tableCount} onChange={handleInputChange} placeholder="20" />
                <FormInput label={L('人數 (Guests)')} name="guestCount" type="number" value={formData.guestCount} onChange={handleInputChange} placeholder="240" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Users size={18} className="text-indigo-600" />
          <h4 className="font-bold text-slate-800">{L('聯絡資訊 (Contact Info)')}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput label={L('客戶姓名 (Client Name)')} name="clientName" required value={formData.clientName} onChange={handleInputChange} />
          <div>
            <FormInput label={L('電話 (Phone)')} name="clientPhone" value={formData.clientPhone} onChange={handleInputChange} />
            <button
              type="button"
              onClick={handleResetPortalPassword}
              disabled={resettingPw}
              className="mt-1 text-[11px] text-slate-400 hover:text-red-500 underline disabled:opacity-50"
            >
              {resettingPw ? L('重設中... (Resetting...)') : L('重設客戶門戶密碼 (Reset client portal password)')}
            </button>
          </div>
          <FormInput label={L('公司 (Company)')} name="companyName" value={formData.companyName} onChange={handleInputChange} />

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">{L('負責同事 (Sales Representative)')}</label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.filter(u => u.displayName).map(user => (
                <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors group">
                  <input
                    type="checkbox"
                    checked={(formData.salesRep || '').split(', ').includes(user.displayName)}
                    onChange={() => handleCheckboxChange(user.displayName)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{user.displayName}</span>
                </label>
              ))}
              {users.length === 0 && <span className="text-xs text-slate-400 italic">{L('載入中... (Loading...)')}</span>}
            </div>
          </div>

          <FormInput label={L('電郵 (Email)')} name="clientEmail" value={formData.clientEmail} onChange={handleInputChange} />
          <FormInput label={L('地址 (Address)')} name="address" value={formData.address} onChange={handleInputChange} />
        </div>
      </div>
    </div>
  );
};

export default BasicDetailsTab;
