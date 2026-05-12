import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const TimeInput = ({ 
  label, 
  name, 
  value, 
  onChange, 
  className = "", 
  inputClassName = "", 
  labelClassName = "",
  required 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      times.push(`${hh}:${mm}`);
    }
  }

  const commonTimes = ['10:30', '11:00', '12:00', '13:00', '14:30', '18:00', '18:30', '19:00', '20:00', '21:30', '22:30', '23:30'];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (time) => {
    onChange({ target: { name, value: time } });
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className={`block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1 ${labelClassName}`}>{label}</label>}
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
          <Clock size={14} />
        </div>
        <input
          type="text"
          name={name}
          value={value || ''}
          required={required}
          onFocus={() => setIsOpen(true)}
          onChange={onChange}
          autoComplete="off"
          placeholder="HH:MM"
          className={`w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono font-bold ${inputClassName}`}
        />
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 shadow-2xl rounded-xl z-[100] max-h-80 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1">
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 px-1">快速選擇 (Quick Select)</span>
              <div className="grid grid-cols-4 gap-1.5">
                {commonTimes.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelect(t)}
                    className={`px-1 py-1.5 border rounded text-[10px] font-black transition-all ${value === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 py-1 bg-white">
              {times.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelect(t)}
                  className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors hover:bg-indigo-50 hover:text-indigo-600 flex justify-between items-center ${value === t ? 'bg-indigo-50 text-indigo-700 font-bold border-l-2 border-indigo-600' : 'text-slate-600'}`}
                >
                  <span>{t}</span>
                  {value === t && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeInput;
