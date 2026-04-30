import React from 'react';

export const FormInput = ({ 
  label, 
  name, 
  value, 
  onChange, 
  type = "text", 
  required, 
  className = "", 
  placeholder = "",
  labelClassName = "",
  inputClassName = ""
}) => (
  <div className={className}>
    <label className={`block text-sm font-medium text-slate-700 mb-1.5 ${labelClassName}`}>{label}</label>
    <input
      type={type}
      name={name}
      required={required}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${inputClassName}`}
    />
  </div>
);

export default FormInput;