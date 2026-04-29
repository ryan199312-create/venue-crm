import React from 'react';
import { X, AlertTriangle, History } from 'lucide-react';

export const VersionPreviewModal = ({ isOpen, onClose, version, onRestore }) => {
  if (!isOpen || !version) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">版本預覽 (Version Preview)</h3>
            <p className="text-sm text-slate-500 font-bold">{version.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-4">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm mb-4">
            <div className="flex items-start">
              <AlertTriangle className="text-amber-600 mr-3 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-bold text-amber-800 text-sm">⚠️ 注意 (Warning)</h4>
                <p className="text-xs text-amber-700 mt-1">
                  還原此版本將會<b>覆蓋</b>當前所有的菜單內容與設定。此操作無法復原。<br />
                  Restoring this version will <b>overwrite</b> all current menu items and settings. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {version.data.map((menu, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                  <span className="font-bold text-slate-700">{menu.title}</span>
                  <div className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                    ${menu.price} / {menu.priceType}
                  </div>
                </div>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {menu.content || '(Empty)'}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">取消 (Cancel)</button>
          <button onClick={() => { onRestore(version); onClose(); }} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md flex items-center transition-colors">
            <History size={16} className="mr-2" /> 確認還原 (Confirm Restore)
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionPreviewModal;