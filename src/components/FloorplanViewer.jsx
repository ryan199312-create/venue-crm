import React, { useState, useEffect, useRef } from 'react';
import { Layout, ZoomIn, ZoomOut } from 'lucide-react';
import { TOOL_GROUPS } from './FloorplanTools';

const STYLES = {
  gridBox: "bg-white p-6 rounded-2xl shadow-sm border border-slate-200",
  h3: "text-lg font-bold text-slate-800 mb-4"
};

const FloorplanViewer = ({ floorplan, selectedLocations = [] }) => {
  const containerRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [scaleInfo, setScaleInfo] = useState({ scale: 1, height: 400 });

  const bgImage = floorplan?.bgImage || '';
  const itemScale = floorplan?.itemScale || 40;
  const zones = floorplan?.zones || [];
  const elements = floorplan?.elements || [];
  
  const isWholeVenue = selectedLocations.includes('全場');
  const highlightedZones = zones.filter(z => {
    if (isWholeVenue) return true;
    return selectedLocations.includes(z.name) || 
           (z.nameZh && selectedLocations.includes(z.nameZh)) ||
           (z.nameZh && z.nameEn && selectedLocations.includes(`${z.nameZh} (${z.nameEn})`));
  });
  const canZoom = highlightedZones.length > 0 && !isWholeVenue && zones.length > 0;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  // If zoomed, focus ONLY on the highlighted zones
  const targetZones = (isZoomed && canZoom) ? highlightedZones : zones;

  targetZones.forEach(z => {
      if (!z.points || z.points.length === 0) return;
      z.points.forEach(p => {
          minX = Math.min(minX, p.x_m * itemScale);
          maxX = Math.max(maxX, p.x_m * itemScale);
          minY = Math.min(minY, p.y_m * itemScale);
          maxY = Math.max(maxY, p.y_m * itemScale);
      });
  });  
  // If NOT zoomed, include all elements to ensure everything fits on screen
  if (!isZoomed || !canZoom) {
    elements.forEach(el => {
        const w = (el.w_m || (el.w ? el.w / 40 : 1)) * itemScale;
        const h = (el.h_m || (el.h ? el.h / 40 : 1)) * itemScale;
        minX = Math.min(minX, el.x || 0);
        maxX = Math.max(maxX, (el.x || 0) + w);
        minY = Math.min(minY, el.y || 0);
        maxY = Math.max(maxY, (el.y || 0) + h);
    });
  }

  if (minX === Infinity) { minX = 0; minY = 0; maxX = 1000; maxY = 700; }
  
  const pad = 20;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const contentW = maxX - minX;
  const contentH = Math.max(maxY - minY, 1);

  // Resize observer to scale map dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const scaleW = width / contentW;
        setScaleInfo({ scale: scaleW, height: contentH * scaleW });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [contentW, contentH]);

  if (!bgImage && elements.length === 0 && zones.length === 0) {
    return (
      <div className={`${STYLES.gridBox} mt-4 text-center p-8`}>
        <Layout size={32} className="mx-auto text-slate-300 mb-3" />
        <h4 className="font-bold text-slate-700">尚未設定平面圖</h4>
        <p className="text-xs text-slate-500 mt-1">Floorplan is not yet configured for this event.</p>
      </div>
    );
  }

  return (
    <div className={`${STYLES.gridBox} mt-4`}>
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
        <h3 className={`${STYLES.h3} mb-0 flex items-center gap-2`}><Layout size={16} /> Venue Floorplan (場地平面圖)</h3>
        {canZoom && (
          <button onClick={() => setIsZoomed(!isZoomed)} className="text-xs bg-[#A57C00]/10 text-[#A57C00] px-3 py-1.5 rounded-lg font-bold flex items-center hover:bg-[#A57C00]/20 transition-colors">
            {isZoomed ? <><ZoomOut size={12} className="mr-1"/> 顯示全圖 (View All)</> : <><ZoomIn size={12} className="mr-1"/> 放大區域 (Zoom In)</>}
          </button>
        )}
      </div>

      <div ref={containerRef} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl relative shadow-inner overflow-hidden" style={{ height: scaleInfo.height > 0 ? scaleInfo.height : 400 }}>
        <div 
          className="absolute origin-top-left transition-transform" 
          style={{ 
            transform: `scale(${scaleInfo.scale})`,
            left: `${-minX * scaleInfo.scale}px`,
            top: `${-minY * scaleInfo.scale}px`,
            width: `${maxX}px`, 
            height: `${maxY}px`,
            backgroundImage: bgImage ? `linear-gradient(to right, rgba(226, 232, 240, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(226, 232, 240, 0.4) 1px, transparent 1px), url("${bgImage}")` : 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
            backgroundSize: bgImage ? `${itemScale}px ${itemScale}px, ${itemScale}px ${itemScale}px, auto` : `${itemScale}px ${itemScale}px`,
            backgroundPosition: 'top left',
            backgroundRepeat: bgImage ? 'repeat, repeat, no-repeat' : 'repeat'
          }}
        >
          {/* Render Zones */}
          {zones.length > 0 && (
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
               <defs>
                 <filter id="zoneGlowViewer" x="-20%" y="-20%" width="140%" height="140%">
                   <feGaussianBlur stdDeviation="3" result="blur" />
                   <feComposite in="SourceGraphic" in2="blur" operator="over" />
                 </filter>
               </defs>
               {zones.map(z => {
                 if (!z.points || z.points.length === 0) return null;
                 const points = z.points.map(p => `${p.x_m * itemScale},${p.y_m * itemScale}`).join(' ');
                 const cx = ((Math.min(...z.points.map(p => p.x_m)) + Math.max(...z.points.map(p => p.x_m))) / 2) * itemScale;
                 const cy = ((Math.min(...z.points.map(p => p.y_m)) + Math.max(...z.points.map(p => p.y_m))) / 2) * itemScale;
                 const isHighlighted = selectedLocations.includes(z.nameZh || z.name) || (z.nameZh && z.nameEn && selectedLocations.includes(`${z.nameZh} (${z.nameEn})`)) || isWholeVenue;

                 return (
                   <g key={z.id}>
                     <polygon 
                        points={points} 
                        fill={z.color} 
                        stroke={z.color.replace(/0\.\d+\)/, '0.8)')} 
                        strokeWidth={isHighlighted ? "4" : "2"} 
                        strokeDasharray={isHighlighted ? "" : "4 4"}
                        filter={isHighlighted ? "url(#zoneGlowViewer)" : ""}
                        className={isHighlighted ? "animate-pulse" : ""}
                        style={{ transition: 'all 0.3s ease' }}
                     />
                     <text 
                        x={cx} y={cy} 
                        fill={z.color.replace(/0\.\d+\)/, '1.0)')} 
                        fontSize={Math.max(14, itemScale * 0.8)} 
                        fontWeight="black" 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        style={{textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff'}}
                     >
                       {z.nameZh || z.name}
                     </text>
                   </g>
                 );
               })}
             </svg>
          )}
          {/* Render Elements */}
          {(elements || []).map(el => {
            const w_m = el.w_m || (el.w ? el.w / 40 : 1);
            const h_m = el.h_m || (el.h ? el.h / 40 : 1);
            
            const toolDef = typeof TOOL_GROUPS !== 'undefined' ? TOOL_GROUPS.flatMap(g => g.items).find(t => t.type === el.type) : null;
            const displayStyle = toolDef && el.type !== 'text' ? toolDef.style : el.style || '';
            const displayContent = toolDef && el.type !== 'text' ? toolDef.content : el.content;

            return (
              <div
                key={el.id}
                className={`absolute flex items-center justify-center transition-all ${displayStyle}`}
                style={{ left: el.x || 0, top: el.y || 0, width: w_m * itemScale, height: h_m * itemScale, transform: `rotate(${el.rotation || 0}deg)` }}
              >
                {el.type === 'text' ? (
                  <div className="w-full h-full flex items-center justify-center overflow-visible">
                    <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{el.label || ''}</span>
                  </div>
                ) : (
                  displayContent
                )}
                {el.label && el.type !== 'text' && (
                  <div 
                    className="absolute left-1/2 bottom-0 pointer-events-none"
                    style={{ transform: `translate(-50%, 120%) rotate(${-(el.rotation || 0)}deg)` }}
                  >
                    <span className="bg-white/90 backdrop-blur-sm text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded shadow-sm text-[10px] font-black whitespace-nowrap inline-block">
                      {el.label}
                    </span>
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

export default FloorplanViewer;