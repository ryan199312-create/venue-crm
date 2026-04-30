import React, { useMemo } from 'react';
import { TOOL_GROUPS } from '../../../../components/FloorplanTools';

export const FloorplanAppendix = ({ data, appSettings, isStandalone = false }) => {  
  const fp = data.floorplan || {};
  const bgImage = fp.bgImage || appSettings?.defaultFloorplan?.bgImage || '';
  const hasElements = fp.elements && fp.elements.length > 0;

  const itemScale = fp.itemScale || appSettings?.defaultFloorplan?.itemScale || 40;
  const zones = fp.zones || appSettings?.defaultFloorplan?.zones || [];

  // Robust Highlight Logic
  const highlightedZones = useMemo(() => {
    const selectedLocs = data.selectedLocations || (data.venueLocation ? [data.venueLocation] : []);
    if (selectedLocs.length === 0) return [];

    const isWholeVenue = selectedLocs.includes('全場');
    
    return (zones || []).filter(z => {
      if (isWholeVenue) return true;
      const label = (z.nameZh || z.name || '').trim();
      const combined = z.nameEn ? `${z.nameZh} (${z.nameEn})` : z.nameZh;
      return selectedLocs.includes(label) || 
             selectedLocs.includes(z.nameZh) || 
             selectedLocs.includes(combined);
    });
  }, [zones, data.selectedLocations, data.venueLocation]);

  if (!bgImage && !hasElements && zones.length === 0) return null;

  const allElements = [...(fp.elements || []), ...zones.flatMap(z => (z.points || []).map(p => ({ x: p.x_m * itemScale, y: p.y_m * itemScale, w_m: 0, h_m: 0 })))];
  
  const minX = allElements.length > 0 ? Math.min(0, ...allElements.map(el => el.x || 0)) : 0;
  const minY = allElements.length > 0 ? Math.min(0, ...allElements.map(el => el.y || 0)) : 0;
  const maxX = allElements.length > 0 ? Math.max(1200, ...allElements.map(el => (el.x || 0) + ((el.w_m || 0) * itemScale))) : 1200;
  const maxY = allElements.length > 0 ? Math.max(800, ...allElements.map(el => (el.y || 0) + ((el.h_m || 0) * itemScale))) : 800;

  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);

  const availableWidth = isStandalone ? 750 : 680;
  const availableHeight = isStandalone ? 1050 : 750;

  const scale = Math.min(
    availableWidth / contentWidth,
    availableHeight / contentHeight,
    1
  );

  const containerHeight = contentHeight * scale;

  return (
    <div className="print-page">
      {!isStandalone && <div className="page-break h-8"></div>}
      <div className="flex justify-between items-end border-b-2 border-[#A57C00] pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-none uppercase">場地平面圖 (Floorplan)</h1>
          <p className="text-slate-500 text-xs mt-1">Order ID: {data.orderId}</p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-[#A57C00] text-white px-3 py-1 text-[10px] font-bold rounded mb-1 uppercase tracking-widest">APPENDIX</div>
        </div>
      </div>
      <div className="w-full bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden mt-4 relative shadow-sm flex items-center justify-center" style={{ height: `${containerHeight}px`, breakInside: 'avoid' }}>
        <div className="absolute origin-top-left" style={{ 
            transform: `scale(${scale})`, 
            left: `${-minX * scale}px`,
            top: `${-minY * scale}px`,
            width: `${contentWidth}px`,
            height: `${contentHeight}px`,
            backgroundImage: bgImage ? `linear-gradient(to right, rgba(226, 232, 240, 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(226, 232, 240, 0.6) 1px, transparent 1px), url("${bgImage}")` : 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
            backgroundSize: bgImage ? `${itemScale}px ${itemScale}px, ${itemScale}px ${itemScale}px, auto` : `${itemScale}px ${itemScale}px`,
            backgroundPosition: 'top left',
            backgroundRepeat: bgImage ? 'repeat, repeat, no-repeat' : 'repeat'
          }}>
          {bgImage && <img src={bgImage} className="opacity-0 pointer-events-none select-none block" alt="" />}
          
          {zones.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {zones.map(z => {
                  if (!z.points || z.points.length === 0) return null;
                  const points = z.points.map(p => `${p.x_m * itemScale},${p.y_m * itemScale}`).join(' ');
                  const cx = ((Math.min(...z.points.map(p => p.x_m)) + Math.max(...z.points.map(p => p.x_m))) / 2) * itemScale;
                  const cy = ((Math.min(...z.points.map(p => p.y_m)) + Math.max(...z.points.map(p => p.y_m))) / 2) * itemScale;
                  const isHighlighted = highlightedZones.some(hz => hz.id === z.id);
                  
                  return (
                    <g key={z.id}>
                      <polygon 
                        points={points} 
                        fill={isHighlighted ? z.color : 'transparent'} 
                        stroke={isHighlighted ? z.color.replace(/0\.\d+\)/, '0.8)') : z.color.replace(/0\.\d+\)/, '0.2)')} 
                        strokeWidth={isHighlighted ? "4" : "1.5"} 
                        strokeDasharray={isHighlighted ? "" : "4 4"} 
                        className="transition-all duration-500"
                      />
                      <text 
                        x={cx} y={cy} 
                        fill={isHighlighted ? z.color.replace(/0\.\d+\)/, '1.0)') : 'rgba(148, 163, 184, 0.5)'} 
                        fontSize={Math.max(12, itemScale * 0.7)} 
                        fontWeight={isHighlighted ? "black" : "bold"} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        style={{textShadow: isHighlighted ? '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff' : 'none'}}
                      >
                        {z.nameZh || z.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
           )}

          {(fp.elements || []).map(el => {
            const w_m = el.w_m || (el.w ? el.w / 40 : 1);
            const h_m = el.h_m || (el.h ? el.h / 40 : 1);
            const toolDef = typeof TOOL_GROUPS !== 'undefined' ? TOOL_GROUPS.flatMap(g => g.items).find(t => t.type === el.type) : null;
            const displayStyle = toolDef && el.type !== 'text' ? toolDef.style : el.style || '';
            const displayContent = toolDef && el.type !== 'text' ? toolDef.content : el.content;
            return (
              <div key={el.id} className={`absolute flex items-center justify-center ${displayStyle}`} style={{ left: el.x || 0, top: el.y || 0, width: w_m * itemScale, height: h_m * itemScale, transform: `rotate(${el.rotation || 0}deg)` }}>
                {el.type === 'text' ? (
                  <div className="w-full h-full flex items-center justify-center overflow-visible"><span className="font-bold text-slate-800 whitespace-nowrap text-sm">{el.label || ''}</span></div>
                ) : (displayContent)}
                {el.label && el.type !== 'text' && (
                  <div className="absolute left-1/2 bottom-0 pointer-events-none" style={{ transform: `translate(-50%, 120%) rotate(${-(el.rotation || 0)}deg)` }}>
                    <span className="bg-white text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded shadow-sm text-xs font-black whitespace-nowrap inline-block">{el.label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const FloorplanRenderer = ({ data, appSettings }) => (
  <div className="font-sans text-slate-900 w-full max-w-[210mm] print:max-w-none mx-auto bg-white p-[10mm] print:p-0 min-h-[297mm] print:min-h-0 shadow-sm print:shadow-none relative">
    <style>{`@media print { @page { margin: 10mm; size: A4; } body { -webkit-print-color-adjust: exact; } }`}</style>
    <FloorplanAppendix data={data} appSettings={appSettings} isStandalone={true} />
  </div>
);

export default FloorplanRenderer;