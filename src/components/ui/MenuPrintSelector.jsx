import React from 'react';
import { X, Printer } from 'lucide-react';

export const MenuPrintSelector = ({ isOpen, onClose, menus, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center">
            <Printer size={18} className="mr-2 text-slate-500" /> 選擇列印菜單 (Select Menu to Print)
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500 mb-2">此訂單包含多個菜單。請問您想列印哪一份？<br />(This order has multiple menus. Which one would you like to print?)</p>


          <div className="border-t border-slate-100 my-2"></div>

          {/* Option 2: Individual Menus */}
          {menus.map((menu, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-violet-500 hover:bg-violet-50 transition-all"
            >
              <div className="font-bold text-slate-700">{menu.title || `Menu ${idx + 1}`}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{menu.content ? menu.content.substring(0, 40) + '...' : '(Empty)'}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuPrintSelector;