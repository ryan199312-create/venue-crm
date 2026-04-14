import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, AlertTriangle, X, History, Printer, Loader2, Upload, Image as ImageIcon, Download, Clock, Sparkles, AlertCircle, CheckCircle, PenTool } from 'lucide-react';
import { formatMoney, parseMoney, LOCATION_CHECKBOXES, INDIVIDUAL_ZONES } from '../utils/vmsUtils';

export const STATUS_COLORS = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  tentative: 'bg-amber-100 text-amber-800 border-amber-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  completed: 'bg-slate-100 text-slate-800 border-slate-200'
};

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

export const FormInput = ({ label, name, value, onChange, type = "text", required, className = "", placeholder = "" }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <input
      type={type}
      name={name}
      required={required}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
    />
  </div>
);

export const MoneyInput = ({ label, name, value, onChange, required, className = "" }) => {
  const handleChange = (e) => {
    const rawValue = parseMoney(e.target.value);
    if (rawValue && isNaN(rawValue)) return;
    onChange({ target: { name, value: rawValue } });
  };
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          type="text"
          name={name}
          required={required}
          value={formatMoney(value)}
          onChange={handleChange}
          placeholder="0"
          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
        />
      </div>
    </div>
  );
};

// --- DIGITAL SIGNATURE PAD COMPONENT ---
export const SignaturePad = ({ onSave, onCancel, isSubmitting, title = "線上簽署合約 (Sign Contract)" }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    canvasRef.current.getContext('2d').closePath();
    setIsDrawing(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 bg-white">
          <p className="text-xs text-slate-500 mb-3">請在下方方框內簽名 (Please sign within the box below):</p>
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerOut={stopDrawing}
            className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-crosshair touch-none"
          />
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
          <button onClick={() => canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)} disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100">重簽 (Clear)</button>
          <button onClick={() => onSave(canvasRef.current.toDataURL('image/png'))} disabled={isSubmitting} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-[#A57C00] rounded-lg hover:bg-[#8a6800] flex justify-center items-center transition-colors">
            {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16}/> : <PenTool className="mr-2" size={16}/>} 套用簽名 (Apply)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'error' ? 'bg-red-500' : 'bg-slate-800';

  return (
    <div className={`fixed bottom-4 right-4 ${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-[100] animate-in slide-in-from-right-10 fade-in print:hidden no-print`}>
      <span>{message}</span>
      <button onClick={onClose} className="hover:opacity-75"><X size={14} /></button>
    </div>
  );
};

export const LocationSelector = ({ formData, setFormData, className = "" }) => {
  const selectedLocs = formData.selectedLocations || [];

  // --- BULLETPROOF STRING BUILDER ---
  // 1. Combine checkboxes and manual input into one array
  // 2. .filter(Boolean) REMOVES all empty strings, nulls, and undefined values
  // 3. .join(', ') combines them. 
  // Result: No leading commas, ever.
  const buildVenueString = (checkboxes, manualInput) => {
    const allParts = [
      ...(checkboxes || []),
      manualInput ? manualInput.trim() : null
    ];

    // This filter is the magic fix:
    return allParts.filter(part => part && part.length > 0).join(', ');
  };

  const handleCheckboxChange = (loc) => {
    let newLocs = [...selectedLocs];

    // Logic: Toggle '全場' vs Individual Zones
    if (loc === '全場') {
      if (newLocs.includes('全場')) {
        // Uncheck All
        newLocs = newLocs.filter(l => l !== '全場' && !INDIVIDUAL_ZONES.includes(l));
      } else {
        // Check All
        newLocs = Array.from(new Set([...newLocs, '全場', ...INDIVIDUAL_ZONES]));
      }
    } else {
      // Individual Zone Logic
      if (newLocs.includes(loc)) {
        newLocs = newLocs.filter(l => l !== loc);
        newLocs = newLocs.filter(l => l !== '全場'); // Uncheck All if one removed
      } else {
        newLocs.push(loc);
        const allSelected = INDIVIDUAL_ZONES.every(z => newLocs.includes(z));
        if (allSelected && !newLocs.includes('全場')) {
          newLocs.push('全場'); // Check All if all zones selected
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      selectedLocations: newLocs,
      venueLocation: buildVenueString(newLocs, prev.locationOther) // ✅ Use Bulletproof Builder
    }));
  };

  const handleOtherChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      locationOther: val,
      venueLocation: buildVenueString(prev.selectedLocations, val) // ✅ Use Bulletproof Builder
    }));
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-2">活動位置 (Venue Location)</label>
      <div className="flex flex-wrap gap-3 mb-2">
        {LOCATION_CHECKBOXES.map(loc => (
          <label key={loc} className={`flex items-center space-x-2 px-3 py-2 rounded border cursor-pointer transition-colors ${selectedLocs.includes(loc) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
            <input
              type="checkbox"
              checked={selectedLocs.includes(loc)}
              onChange={() => handleCheckboxChange(loc)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${selectedLocs.includes(loc) ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>{loc}</span>
          </label>
        ))}
      </div>
      <input
        type="text"
        name="locationOther"       // Identifies the field
        autoComplete="off"         // Tells browser NOT to autofill
        placeholder="其他位置 (Other)"
        value={formData.locationOther || ''}
        onChange={handleOtherChange}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
      />
    </div>
  );
};

export const DepositField = ({ label, prefix, formData, setFormData, onUpload, addToast, onRemoveProof, clientPrefix }) => {
  const amountKey = `${prefix}`;
  const dateKey = `${prefix}Date`;
  const receivedKey = `${prefix}Received`;
  const proofKey = `${prefix}Proof`;
  const proofs = Array.isArray(formData[proofKey]) ? formData[proofKey] : (formData[proofKey] ? [formData[proofKey]] : []);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const isOverdue = formData[amountKey] && !formData[receivedKey] && formData[dateKey] && new Date(formData[dateKey]) < new Date().setHours(0, 0, 0, 0);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await onUpload(file);
      setFormData(prev => {
        const existing = Array.isArray(prev[proofKey]) ? prev[proofKey] : (prev[proofKey] ? [prev[proofKey]] : []);
        return { ...prev, [proofKey]: [...existing, url] };
      });
      addToast("收據上傳成功", "success");
    } catch (error) {
      addToast("上傳失敗: " + error.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (urlToRemove) => {
    if (onRemoveProof) {
      onRemoveProof(proofKey, urlToRemove);
    } else {
      setFormData(prev => {
        const existing = Array.isArray(prev[proofKey]) ? prev[proofKey] : (prev[proofKey] ? [prev[proofKey]] : []);
        return { ...prev, [proofKey]: existing.filter(u => u !== urlToRemove) };
      });
    }
  };

  const renderFormattedLabel = (text) => {
    if (typeof text !== 'string') return text;
    const idx = text.indexOf('(');
    if (idx !== -1) {
      const main = text.substring(0, idx).trim();
      const bracket = text.substring(idx);
      return (
        <>
          <span>{main}</span>
          <span className="text-[10px] font-medium text-slate-400 ml-1.5 tracking-wider">{bracket}</span>
        </>
      );
    }
    return text;
  };

  return (
    <div className={`p-4 rounded-lg border transition-all ${isOverdue ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <label className="text-sm font-bold text-slate-700 flex items-center shrink-0">
          {renderFormattedLabel(label)}
          {isOverdue && <span className="ml-2 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">OVERDUE</span>}
        </label>
        
        <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          
          {proofs.map((url, idx) => (
            <div key={idx} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm shrink-0">
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center text-[10px] text-blue-600 hover:underline truncate max-w-[80px]" title="查看收據">
                <ImageIcon size={12} className="mr-1 shrink-0" /> 收據 {proofs.length > 1 ? idx + 1 : ''}
              </a>
              <button type="button" onClick={() => handleRemove(url)} className="text-slate-400 hover:text-red-500 p-0.5"><X size={10} /></button>
            </div>
          ))}

          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-[10px] flex items-center text-slate-500 hover:text-blue-600 bg-white px-2 py-1 rounded border border-slate-200 hover:border-blue-200 transition-all shrink-0 shadow-sm">
            {isUploading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Upload size={12} className="mr-1" />} 上傳收據
          </button>

          <div className="w-px h-4 bg-slate-300 hidden sm:block mx-1"></div>
          
          <label className="flex items-center space-x-2 text-xs cursor-pointer select-none shrink-0">
            <input type="checkbox" checked={formData[receivedKey] || false} onChange={e => setFormData(prev => ({ ...prev, [receivedKey]: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span className={formData[receivedKey] ? "text-emerald-600 font-bold" : "text-slate-500"}>{formData[receivedKey] ? "已收款" : "未收款"}</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={formatMoney(formData[amountKey])}
            onChange={e => {
              const val = parseMoney(e.target.value);
              if (!isNaN(val)) setFormData(prev => ({ ...prev, [amountKey]: val }));
            }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-white"
            placeholder="0.00"
          />
        </div>
        <input
          type="date"
          value={formData[dateKey] || ''}
          onChange={e => setFormData(prev => ({ ...prev, [dateKey]: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        />
      </div>

      {formData.clientUploadedProofs?.map((proof, globalIdx) => {
        if (!clientPrefix || !proof.fileName.startsWith(clientPrefix) || proofs.includes(proof.url)) return null;
        return <PendingProofCard key={globalIdx} proof={proof} targetLabel={label} targetKey={proofKey} receivedKey={receivedKey} currentProofs={proofs} setFormData={setFormData} addToast={addToast} />;
      })}

    </div>
  );
};

export const PendingProofCard = ({ proof, targetLabel, targetKey, receivedKey, currentProofs, setFormData, addToast }) => (
  <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-200 shadow-sm flex flex-col mt-3 animate-in slide-in-from-top-2 w-full">
    <div className="flex justify-between items-start mb-2">
      <a href={proof.url} download target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline break-all line-clamp-2 flex items-center" title={proof.fileName}>
        <Download size={12} className="mr-1 flex-shrink-0" /> 
        <span>{proof.fileName}</span> 
        <span className="text-[10px] font-medium text-slate-400 ml-1.5 whitespace-nowrap">(客戶上傳)</span>
      </a>
    </div>
    <div className="text-[10px] text-slate-400 mb-3 flex items-center">
      <Clock size={10} className="mr-1" /> {new Date(proof.uploadedAt).toLocaleString('zh-HK')}
    </div>
    
    <div className="mb-3 bg-white p-2 rounded border border-slate-100">
      {proof.ocrResult === 'MATCH' ? (
        <div className="text-[10px] font-bold text-emerald-600 flex items-start gap-1">
           <Sparkles size={12} className="shrink-0 mt-0.5" /> 
           <span>ai recognise the amount is correct, to be confirmed by king lung heen</span>
        </div>
      ) : proof.ocrResult === 'MISMATCH' ? (
        <div className="text-[10px] font-bold text-red-600 flex items-start gap-1">
           <AlertTriangle size={12} className="shrink-0 mt-0.5" /> 
           <span>AI 檢測到金額可能不符，請人工核對</span>
        </div>
      ) : proof.ocrResult === 'UNKNOWN_AMT' ? (
        <div className="text-[10px] font-bold text-amber-600 flex items-start gap-1">
           <AlertCircle size={12} className="shrink-0 mt-0.5" /> 
           <span>無法自動確定應付金額，請人工核對</span>
        </div>
      ) : proof.ocrResult === 'ERROR' ? (
        <div className="text-[10px] font-bold text-red-600 flex items-start gap-1">
           <AlertCircle size={12} className="shrink-0 mt-0.5" /> 
           <span>AI 讀取失敗，請人工核對</span>
        </div>
      ) : (
        <div className="w-full text-[10px] font-bold bg-blue-50 text-blue-600 py-1.5 rounded flex justify-center items-center">
          <Loader2 size={12} className="animate-spin mr-1"/>
          AI 正在自動核對金額...
        </div>
      )}
    </div>

    <div className="mt-auto pt-2 border-t border-slate-200">
      <button type="button" onClick={() => {
        setFormData(prev => {
          const ex = Array.isArray(prev[targetKey]) ? prev[targetKey] : (prev[targetKey] ? [prev[targetKey]] : []);
          if(ex.includes(proof.url)) return prev;
          
          const updates = {
            [targetKey]: [...ex, proof.url]
          };
          if (receivedKey) {
            updates[receivedKey] = true;
          }

          return { ...prev, ...updates };
        });
        addToast(`已核准 ${targetLabel} 收款`, "success");
      }} className="w-full text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded shadow-sm transition-colors flex items-center justify-center">
        <CheckCircle size={12} className="mr-1" /> 核准確認收款 (approve)
      </button>
    </div>
  </div>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 no-print">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
};

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

export const FormSelect = ({ label, name, value, onChange, options, required, className = "" }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <select
      name={name}
      required={required}
      value={value || ''}
      onChange={onChange}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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

export const FormTextArea = ({ label, name, value, onChange, rows = 3, className = "", placeholder = "" }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <textarea
      name={name}
      rows={rows}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
    />
  </div>
);

export const FormCheckbox = ({ label, name, checked, onChange }) => (
  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
    <input
      type="checkbox"
      name={name}
      checked={checked || false}
      onChange={onChange}
      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
    />
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

export const Badge = ({ status }) => {
  const map = { 'confirmed': '已確認', 'tentative': '暫定', 'cancelled': '已取消', 'completed': '已完成' };
  const label = map[status] || status;
  const style = STATUS_COLORS[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
};

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

export const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">確認</button>
        </div>
      </div>
    </div>
  );
};