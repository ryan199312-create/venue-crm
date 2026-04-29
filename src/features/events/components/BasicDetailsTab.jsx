import React from 'react';
import { FileText, DollarSign, Users } from 'lucide-react';
import { FormInput, FormSelect, LocationSelector } from '../../../components/ui';
import { EVENT_TYPES } from '../../../services/billingService';

const BasicDetailsTab = ({ formData, setFormData, handleInputChange, minSpendInfo, users = [], appSettings }) => {
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormInput label="訂單編號 (Order ID)" name="orderId" required value={formData.orderId} onChange={handleInputChange} />
        <FormSelect label="活動狀態 (Status)" name="status" options={[{ value: 'tentative', label: '暫定 (Tentative)' }, { value: 'confirmed', label: '已確認 (Confirmed)' }, { value: 'completed', label: '已完成 (Completed)' }, { value: 'cancelled', label: '已取消 (Cancelled)' }]} value={formData.status} onChange={handleInputChange} />
        <FormSelect label="活動類型" name="eventType" options={EVENT_TYPES} value={formData.eventType} onChange={handleInputChange} />
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <FileText size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800">活動詳情 (Event Details)</h4>
        </div>
        <FormInput label="活動名稱 (Event Name)" name="eventName" required value={formData.eventName} onChange={handleInputChange} placeholder="e.g. 陳李聯婚 / Annual Dinner" />
        <div className="grid grid-cols-4 gap-4">
          <FormInput label="活動日期" name="date" type="date" required className="col-span-1" value={formData.date} onChange={handleInputChange} />
          <FormInput label="開始時間 (Start)" name="startTime" type="time" required className="col-span-1" value={formData.startTime} onChange={handleInputChange} />
          <div className="col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-1.5 text-red-600">起菜時間 (Serving)</label>
            <input type="time" name="servingTime" value={formData.servingTime || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all bg-red-50" />
          </div>
          <FormInput label="結束時間 (End)" name="endTime" type="time" required className="col-span-1" value={formData.endTime} onChange={handleInputChange} />
        </div>
        <div className="pt-4 border-t border-slate-100 mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col justify-between">
              <div>
                <LocationSelector formData={formData} setFormData={setFormData} appSettings={appSettings} />
                {minSpendInfo && (
                  <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row justify-between items-center animate-in slide-in-from-top-2">
                    <div className="flex items-center text-indigo-900 mb-1 sm:mb-0"><div className="bg-white p-1 rounded-full shadow-sm mr-2 text-indigo-600"><DollarSign size={14} /></div><div><span className="text-[10px] font-bold text-indigo-600 block">最低消費 (Min Spend)</span><span className="text-base font-black font-mono tracking-tight">${minSpendInfo.amount.toLocaleString()}</span></div></div>
                    <div className="text-right"><span className="text-[10px] font-medium text-indigo-500 bg-white px-2 py-0.5 rounded border border-indigo-100 block">{minSpendInfo.ruleName}</span></div>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="grid grid-cols-2 gap-3"><FormInput label="席數 (Tables)" name="tableCount" type="number" value={formData.tableCount} onChange={handleInputChange} placeholder="20" /><FormInput label="人數 (Guests)" name="guestCount" type="number" value={formData.guestCount} onChange={handleInputChange} placeholder="240" /></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Users size={18} className="text-blue-600" />
          <h4 className="font-bold text-slate-800">聯絡人資訊 (Contact Info)</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput label="客戶姓名" name="clientName" required value={formData.clientName} onChange={handleInputChange} />
          <FormInput label="電話" name="clientPhone" value={formData.clientPhone} onChange={handleInputChange} />
          <FormInput label="公司" name="companyName" value={formData.companyName} onChange={handleInputChange} />

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">銷售人員 (Sales Representative)</label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.filter(u => u.displayName).map(user => (
                <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors group">
                  <input 
                    type="checkbox" 
                    checked={(formData.salesRep || '').split(', ').includes(user.displayName)}
                    onChange={() => handleCheckboxChange(user.displayName)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{user.displayName}</span>
                </label>
              ))}
              {users.length === 0 && <span className="text-xs text-slate-400 italic">載入用戶中...</span>}
            </div>
          </div>

          <FormInput label="Email" name="clientEmail" value={formData.clientEmail} onChange={handleInputChange} />
          <FormInput label="地址" name="address" value={formData.address} onChange={handleInputChange} />
        </div>
      </div>
    </div>
  );
};

export default BasicDetailsTab;