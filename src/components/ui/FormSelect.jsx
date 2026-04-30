import React from 'react';

export const FormSelect = ({ 
  label, 
  name, 
  value, 
  onChange, 
  options, 
  required, 
  className = "",
  labelClassName = "",
  selectClassName = ""
}) => (
  <div className={className}>
    <label className={`block text-sm font-medium text-slate-700 mb-1.5 ${labelClassName}`}>{label}</label>
    <select
      name={name}
      required={required}
      value={value || ''}
      onChange={onChange}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white ${selectClassName}`}
    >
      <option value="">請選擇 (Please Select)</option>
      {options.map(opt => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const lab = typeof opt === 'object' ? opt.label : opt;
        return <option key={val} value={val}>{lab}</option>
      })}
    </select>
  </div>
);

export default FormSelect;