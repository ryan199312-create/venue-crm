import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, PenTool, Loader2 } from 'lucide-react';

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

export default SignaturePad;