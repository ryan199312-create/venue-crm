import React from 'react';

export const FormCheckbox = ({ label, name, checked, onChange }) => (
  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
    <input
      type="checkbox"
      name={name}
      checked={checked || false}
      onChange={onChange}
      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 transition-colors"
    />
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

export default FormCheckbox;