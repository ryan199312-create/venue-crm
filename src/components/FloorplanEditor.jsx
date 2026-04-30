import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, RotateCw, Move, Image as ImageIcon, MousePointer2, Maximize, Minimize, Copy, Eraser, MoveHorizontal, MoveVertical, Undo2, Redo2, Link, Unlink, ChevronsUp, ChevronsDown, Grid, Save, AlignLeft, AlignRight, ArrowUpToLine, ArrowDownToLine, PenTool, ZoomIn, ZoomOut, X } from 'lucide-react';
import { TOOL_GROUPS } from './FloorplanTools';

export default function FloorplanEditor({ 
  formData, 
  setFormData, 
  defaultBgImage = '', 
  defaultItemScale = 40, 
  defaultZones = [], 
  events = [],
  onClose = null,
  initialFullscreen = false,
  liteMode = false
}) {
  const canvasRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [zoom, setZoom] = useState(1);
  const [clipboard, setClipboard] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [guides, setGuides] = useState({ x: [], y: [] });
  const [presets, setPresets] = useState(() => JSON.parse(localStorage.getItem('vms_floorplan_presets') || '[]'));
  
  const previewContainerRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);

  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [drawingZoneId, setDrawingZoneId] = useState(null);

  // Safely initialize floorplan state - Prioritize formData, then fall back to defaults
  const floorplan = formData.floorplan || { elements: [] };
  const itemScale = floorplan.itemScale || defaultItemScale || 40;
  const bgImage = floorplan.bgImage || defaultBgImage || '';
  const zones = (floorplan.zones && floorplan.zones.length > 0) ? floorplan.zones : (defaultZones || []);

  // Robust Highlight Logic
  const highlightedZones = useMemo(() => {
    const selectedLocs = formData.selectedLocations || [];
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
  }, [zones, formData.selectedLocations]);

  const visibleZones = zones; // Always show all zones to provide context

  // Keep a stable ref of elements for the drag-box mouseup closure
  const elementsRef = useRef(floorplan.elements);
  useEffect(() => { elementsRef.current = floorplan.elements; }, [floorplan.elements]);

  // --- UNDO / REDO HISTORY ---
  const historyRef = useRef([floorplan.elements]);
  const historyStepRef = useRef(0);

  const updateFloorplan = (updates, saveHistory = true) => {
    if (saveHistory && updates.elements) {
      const newHistory = historyRef.current.slice(0, historyStepRef.current + 1);
      newHistory.push(updates.elements);
      historyRef.current = newHistory;
      historyStepRef.current = newHistory.length - 1;
    }
    setFormData(prev => ({
      ...prev,
      floorplan: { ...(prev.floorplan || { elements: [] }), ...updates }
    }));
  };

  const updateZones = (newZones) => {
    setFormData(prev => ({
      ...prev,
      floorplan: { ...(prev.floorplan || { elements: [] }), zones: newZones }
    }));
  };

  const handleCanvasClick = (e) => {
    if (!isDrawingZone || !drawingZoneId) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom / itemScale;
    const y = (e.clientY - rect.top) / zoom / itemScale;

    const newZones = zones.map(z => {
      if (z.id === drawingZoneId) {
        return { ...z, points: [...(z.points || []), { x_m: x, y_m: y }] };
      }
      return z;
    });
    updateZones(newZones);
  };

  const expandSelectionByGroup = (ids, elements) => {
    const groups = new Set(elements.filter(el => ids.includes(el.id) && el.groupId).map(el => el.groupId));
    if (groups.size === 0) return ids;
    return elements.filter(el => ids.includes(el.id) || (el.groupId && groups.has(el.groupId))).map(el => el.id);
  };

  const handleUndo = () => {
    if (historyStepRef.current > 0) {
      historyStepRef.current -= 1;
      const previousElements = historyRef.current[historyStepRef.current];
      updateFloorplan({ elements: previousElements }, false);
      setSelectedIds([]);
    }
  };

  const handleRedo = () => {
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyStepRef.current += 1;
      const nextElements = historyRef.current[historyStepRef.current];
      updateFloorplan({ elements: nextElements }, false);
      setSelectedIds([]);
    }
  };

  // --- MOUSE WHEEL ZOOM ---
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.min(3, Math.max(0.1, prev + delta)));
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          updateFloorplan({ elements: elementsRef.current.filter(el => !selectedIds.includes(el.id)) });
          setSelectedIds([]);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const elsToCopy = elementsRef.current.filter(el => selectedIds.includes(el.id));
          if (elsToCopy.length > 0) {
            setClipboard(elsToCopy);
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboard && clipboard.length > 0) {
          e.preventDefault();
          const newElements = clipboard.map(el => ({
            ...el,
            id: Date.now().toString() + Math.random(),
            x: el.x + 20,
            y: el.y + 20
          }));
          updateFloorplan({ elements: [...elementsRef.current, ...newElements] });
          setSelectedIds(newElements.map(el => el.id));
          setClipboard(newElements);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(elementsRef.current.map(el => el.id));
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          
          setFormData(prev => {
            const els = prev.floorplan?.elements || [];
            const updatedEls = els.map(el => 
              selectedIds.includes(el.id) 
                ? { ...el, x: Math.max(0, el.x + dx), y: Math.max(0, el.y + dy) } 
                : el
            );
            return { ...prev, floorplan: { ...(prev.floorplan || {}), elements: updatedEls } };
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, clipboard]);

  // --- DRAG & DROP LOGIC ---
  const handleDragStart = (e, source, id = null) => {
    e.dataTransfer.setData('source', source);
    if (source === 'toolbox') {
      e.dataTransfer.setData('type', id);
      setDragState({ type: id, startX: e.clientX, startY: e.clientY });
    } else {
      let draggedIds = selectedIds;
      if (!selectedIds.includes(id)) {
        draggedIds = expandSelectionByGroup([id], elementsRef.current);
        setSelectedIds(draggedIds);
      }
      e.dataTransfer.setData('draggedids', JSON.stringify(draggedIds));
      e.dataTransfer.setData('startx', e.clientX.toString());
      e.dataTransfer.setData('starty', e.clientY.toString());
      setDragState({
        ids: draggedIds,
        startX: e.clientX,
        startY: e.clientY,
        elementsSnapshot: elementsRef.current
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!dragState) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const snapStep = itemScale / 4;
    const applySnap = (val) => Math.round(val / snapStep) * snapStep;

    let projectedX, projectedY;
    let projW = itemScale;
    let projH = itemScale;

    if (dragState.type) {
      const tool = TOOL_GROUPS.flatMap(g => g.items).find(t => t.type === dragState.type);
      if (!tool) return;
      projW = tool.w_m * itemScale;
      projH = tool.h_m * itemScale;
      projectedX = applySnap((e.clientX - rect.left) / zoom - (projW / 2));
      projectedY = applySnap((e.clientY - rect.top) / zoom - (projH / 2));
    } else if (dragState.ids) {
      const deltaX = (e.clientX - dragState.startX) / zoom;
      const deltaY = (e.clientY - dragState.startY) / zoom;
      const primaryEl = dragState.elementsSnapshot.find(el => el.id === dragState.ids[0]);
      if (!primaryEl) return;
      projW = (primaryEl.w_m || (primaryEl.w ? primaryEl.w / 40 : 1)) * itemScale;
      projH = (primaryEl.h_m || (primaryEl.h ? primaryEl.h / 40 : 1)) * itemScale;
      projectedX = applySnap(primaryEl.x + deltaX);
      projectedY = applySnap(primaryEl.y + deltaY);
    }

    if (projectedX === undefined) return;

    const newGuides = { x: [], y: [] };
    const threshold = 10;
    const projCx = projectedX + projW / 2;
    const projCy = projectedY + projH / 2;

    const elements = dragState.elementsSnapshot || elementsRef.current;
    elements.forEach(el => {
      if (dragState.ids && dragState.ids.includes(el.id)) return;
      
      const elW = (el.w_m || (el.w ? el.w / 40 : 1)) * itemScale;
      const elH = (el.h_m || (el.h ? el.h / 40 : 1)) * itemScale;
      const elCx = el.x + elW / 2;
      const elCy = el.y + elH / 2;

      if (Math.abs(el.x - projectedX) < threshold) newGuides.x.push(el.x);
      if (Math.abs(el.y - projectedY) < threshold) newGuides.y.push(el.y);
      if (Math.abs(elCx - projCx) < threshold) newGuides.x.push(elCx);
      if (Math.abs(elCy - projCy) < threshold) newGuides.y.push(elCy);
      if (Math.abs((el.x + elW) - (projectedX + projW)) < threshold) newGuides.x.push(el.x + elW);
      if (Math.abs((el.y + elH) - (projectedY + projH)) < threshold) newGuides.y.push(el.y + elH);
    });

    newGuides.x = [...new Set(newGuides.x)];
    newGuides.y = [...new Set(newGuides.y)];

    setGuides(prev => (prev.x.length === newGuides.x.length && prev.y.length === newGuides.y.length && prev.x.every((v,i) => v === newGuides.x[i]) && prev.y.every((v,i) => v === newGuides.y[i])) ? prev : newGuides);
  };

  const handleDragEnd = () => { setDragState(null); setGuides({ x: [], y: [] }); };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragState(null);
    setGuides({ x: [], y: [] });
    const source = e.dataTransfer.getData('source');
    const rect = canvasRef.current.getBoundingClientRect();
    const snapStep = itemScale / 4;
    const applySnap = (val) => Math.round(val / snapStep) * snapStep;
    
    if (source === 'toolbox') {
      const type = e.dataTransfer.getData('type');
      const tool = TOOL_GROUPS.flatMap(g => g.items).find(t => t.type === type);
      if (!tool) return;

      const w = tool.w_m * itemScale;
      const h = tool.h_m * itemScale;

      const x = applySnap((e.clientX - rect.left) / zoom - (w / 2));
      const y = applySnap((e.clientY - rect.top) / zoom - (h / 2));

      const newElement = {
        id: Date.now().toString(),
        type,
        x: Math.max(0, x),
        y: Math.max(0, y),
        rotation: 0,
        w_m: tool.w_m,
        h_m: tool.h_m,
        style: typeof tool.style === 'string' ? tool.style : '',
        content: typeof tool.content === 'string' ? tool.content : ''
      };

      updateFloorplan({ elements: [...floorplan.elements, newElement] });
      setSelectedIds([newElement.id]);
    } else if (source === 'canvas') {
      const draggedIdsStr = e.dataTransfer.getData('draggedids');
      if (!draggedIdsStr) return;
      const draggedIds = JSON.parse(draggedIdsStr);
      const startX = parseFloat(e.dataTransfer.getData('startx'));
      const startY = parseFloat(e.dataTransfer.getData('starty'));
      
      const deltaX = (e.clientX - startX) / zoom;
      const deltaY = (e.clientY - startY) / zoom;

      const elements = floorplan.elements.map(el => {
        if (draggedIds.includes(el.id)) {
          return { 
            ...el, 
            x: Math.max(0, applySnap(el.x + deltaX)), 
            y: Math.max(0, applySnap(el.y + deltaY)) 
          };
        }
        return el;
      });
      updateFloorplan({ elements });
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (e.target !== canvasRef.current) return;
    if (e.button !== 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / zoom;
    const startY = (e.clientY - rect.top) / zoom;

    setSelectionBox({ startX, startY, currentX: startX, currentY: startY });

    const handleMouseMove = (moveEvent) => {
      const currentX = (moveEvent.clientX - rect.left) / zoom;
      const currentY = (moveEvent.clientY - rect.top) / zoom;
      setSelectionBox(prev => prev ? { ...prev, currentX, currentY } : null);
    };

    const handleMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      setSelectionBox(prev => {
        if (prev) {
          const minX = Math.min(prev.startX, prev.currentX);
          const maxX = Math.max(prev.startX, prev.currentX);
          const minY = Math.min(prev.startY, prev.currentY);
          const maxY = Math.max(prev.startY, prev.currentY);
          
          if (maxX - minX < 5 && maxY - minY < 5) {
            setSelectedIds([]);
            return null;
          }

          const elements = elementsRef.current;
          const newSelected = elements.filter(el => {
            const w = (el.w_m || (el.w ? el.w / 40 : 1)) * itemScale;
            const h = (el.h_m || (el.h ? el.h / 40 : 1)) * itemScale;
            return (el.x < maxX && el.x + w > minX && el.y < maxY && el.y + h > minY);
          }).map(el => el.id);

          const expandedNewSelected = expandSelectionByGroup(newSelected, elements);

          if (upEvent.shiftKey) {
            setSelectedIds(currentIds => [...new Set([...currentIds, ...expandedNewSelected])]);
          } else {
            setSelectedIds(expandedNewSelected);
          }
        }
        return null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRotate = () => {
    if (selectedIds.length === 0) return;
    const elements = floorplan.elements.map(el => 
      selectedIds.includes(el.id) ? { ...el, rotation: (el.rotation + 45) % 360 } : el
    );
    updateFloorplan({ elements });
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    updateFloorplan({ elements: floorplan.elements.filter(el => !selectedIds.includes(el.id)) });
    setSelectedIds([]);
  };

  const handleAlignLeft = () => {
    if (selectedIds.length < 2) return;
    const minX = Math.min(...floorplan.elements.filter(el => selectedIds.includes(el.id)).map(el => el.x));
    updateFloorplan({ elements: floorplan.elements.map(el => selectedIds.includes(el.id) ? { ...el, x: minX } : el) });
  };

  const handleAlignRight = () => {
    if (selectedIds.length < 2) return;
    const selected = floorplan.elements.filter(el => selectedIds.includes(el.id));
    const maxRight = Math.max(...selected.map(el => el.x + (el.w_m || (el.w ? el.w / 40 : 1)) * itemScale));
    updateFloorplan({
      elements: floorplan.elements.map(el => {
        if (!selectedIds.includes(el.id)) return el;
        const w = (el.w_m || (el.w ? el.w / 40 : 1)) * itemScale;
        return { ...el, x: maxRight - w };
      })
    });
  };

  const handleAlignTop = () => {
    if (selectedIds.length < 2) return;
    const minY = Math.min(...floorplan.elements.filter(el => selectedIds.includes(el.id)).map(el => el.y));
    updateFloorplan({ elements: floorplan.elements.map(el => selectedIds.includes(el.id) ? { ...el, y: minY } : el) });
  };

  const handleAlignBottom = () => {
    if (selectedIds.length < 2) return;
    const selected = floorplan.elements.filter(el => selectedIds.includes(el.id));
    const maxBottom = Math.max(...selected.map(el => el.y + (el.h_m || (el.h ? el.h / 40 : 1)) * itemScale));
    updateFloorplan({
      elements: floorplan.elements.map(el => {
        if (!selectedIds.includes(el.id)) return el;
        const h = (el.h_m || (el.h ? el.h / 40 : 1)) * itemScale;
        return { ...el, y: maxBottom - h };
      })
    });
  };

  const handleDistributeHorizontal = () => {
    if (selectedIds.length < 3) return;
    const selected = floorplan.elements.filter(el => selectedIds.includes(el.id)).sort((a, b) => a.x - b.x);
    const minX = selected[0].x;
    const maxX = selected[selected.length - 1].x;
    const spacing = (maxX - minX) / (selected.length - 1);
    
    updateFloorplan({
      elements: floorplan.elements.map(el => {
        const index = selected.findIndex(s => s.id === el.id);
        if (index > 0 && index < selected.length - 1) {
          return { ...el, x: minX + (index * spacing) };
        }
        return el;
      })
    });
  };

  const handleDistributeVertical = () => {
    if (selectedIds.length < 3) return;
    const selected = floorplan.elements.filter(el => selectedIds.includes(el.id)).sort((a, b) => a.y - b.y);
    const minY = selected[0].y;
    const maxY = selected[selected.length - 1].y;
    const spacing = (maxY - minY) / (selected.length - 1);
    
    updateFloorplan({
      elements: floorplan.elements.map(el => {
        const index = selected.findIndex(s => s.id === el.id);
        if (index > 0 && index < selected.length - 1) {
          return { ...el, y: minY + (index * spacing) };
        }
        return el;
      })
    });
  };

  const handleDuplicate = () => {
    if (selectedIds.length === 0) return;
    const elsToCopy = floorplan.elements.filter(el => selectedIds.includes(el.id));
    if (elsToCopy.length === 0) return;

    const newElements = elsToCopy.map(elToCopy => ({
      ...elToCopy,
      id: Date.now().toString() + Math.random(),
      x: elToCopy.x + 20,
      y: elToCopy.y + 20
    }));
    updateFloorplan({ elements: [...floorplan.elements, ...newElements] });
    setSelectedIds(newElements.map(el => el.id));
  };

  const handleBringToFront = () => {
    if (selectedIds.length === 0) return;
    const selected = floorplan.elements.filter(el => selectedIds.includes(el.id));
    const unselected = floorplan.elements.filter(el => !selectedIds.includes(el.id));
    updateFloorplan({ elements: [...unselected, ...selected] });
  };

  const handleSendToBack = () => {
    if (selectedIds.length === 0) return;
    const selected = floorplan.elements.filter(el => selectedIds.includes(el.id));
    const unselected = floorplan.elements.filter(el => !selectedIds.includes(el.id));
    updateFloorplan({ elements: [...selected, ...unselected] });
  };

  const handleGroup = () => {
    if (selectedIds.length < 2) return;
    const newGroupId = 'grp_' + Date.now();
    updateFloorplan({
      elements: floorplan.elements.map(el => selectedIds.includes(el.id) ? { ...el, groupId: newGroupId } : el)
    });
  };

  const handleUngroup = () => {
    if (selectedIds.length === 0) return;
    updateFloorplan({
      elements: floorplan.elements.map(el => selectedIds.includes(el.id) ? { ...el, groupId: null } : el)
    });
  };

  const handleCreateGrid = () => {
    if (selectedIds.length !== 1) return;
    const baseEl = floorplan.elements.find(el => el.id === selectedIds[0]);
    if (!baseEl) return;
    
    const gridInput = window.prompt("請輸入行列數量 (Rows x Columns), 例如: 5x10", "5x10");
    if (!gridInput) return;
    const parts = gridInput.toLowerCase().split('x');
    const rows = parseInt(parts[0]?.trim());
    const cols = parseInt(parts[1]?.trim());
    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) return window.alert("格式錯誤 (Invalid format). 請輸入有效的數字，例如: 5x10");

    const spacingInput = window.prompt("請輸入物件間距 (Spacing in meters), 例如: 0.5", "0.5");
    if (spacingInput === null) return;
    const spacingM = parseFloat(spacingInput) || 0;

    const newElements = [];
    const w = (baseEl.w_m || (baseEl.w ? baseEl.w / 40 : 1)) * itemScale;
    const h = (baseEl.h_m || (baseEl.h ? baseEl.h / 40 : 1)) * itemScale;
    const gap = spacingM * itemScale;

    for(let r = 0; r < rows; r++) {
      for(let c = 0; c < cols; c++) {
        if (r === 0 && c === 0) continue;
        newElements.push({ ...baseEl, id: Date.now().toString() + Math.random(), x: baseEl.x + (c * (w + gap)), y: baseEl.y + (r * (h + gap)) });
      }
    }
    
    if (newElements.length > 0) {
      updateFloorplan({ elements: [...floorplan.elements, ...newElements] });
      setSelectedIds([baseEl.id, ...newElements.map(el => el.id)]);
    }
  };

  const handleClearAll = () => {
    if (floorplan.elements.length === 0) return;
    if (window.confirm("確定要清除所有項目嗎？ (Are you sure you want to clear all items?)")) {
      updateFloorplan({ elements: [] });
      setSelectedIds([]);
    }
  };

  const handleSavePreset = () => {
    if (floorplan.elements.length === 0) return window.alert("無物件可儲存 (Empty layout).");
    const name = window.prompt("請輸入預設佈置名稱 (Enter preset name):", "My Setup");
    if (!name) return;
    const newPresets = [...presets, { id: Date.now(), name, elements: floorplan.elements }];
    localStorage.setItem('vms_floorplan_presets', JSON.stringify(newPresets));
    setPresets(newPresets);
    window.alert("佈置已儲存為預設 (Saved successfully)!");
  };

  const handleLoadPresetOrEvent = (val) => {
    let elementsToLoad = [];
    if (val.startsWith('preset_')) {
      const presetId = Number(val.replace('preset_', ''));
      const preset = presets.find(p => p.id === presetId);
      if (preset) elementsToLoad = preset.elements;
    } else if (val.startsWith('event_')) {
      const eventId = val.replace('event_', '');
      const event = events.find(e => e.id === eventId);
      if (event?.floorplan?.elements) elementsToLoad = event.floorplan.elements;
    }

    if (elementsToLoad.length > 0) {
      if (floorplan.elements.length > 0 && !window.confirm("這會覆蓋目前的佈置，確定嗎？ (This will overwrite current layout. Are you sure?)")) return;
      const newElements = elementsToLoad.map(el => ({ ...el, id: Date.now().toString() + Math.random().toString() }));
      updateFloorplan({ elements: newElements });
      setSelectedIds([]);
    }
  };

  const canvasContent = (isInteractive) => (
    <div 
      ref={isInteractive ? canvasRef : previewCanvasRef}
      onDragOver={isInteractive ? handleDragOver : undefined}
      onDrop={isInteractive ? handleDrop : undefined}
      onMouseDown={isInteractive ? handleCanvasMouseDown : undefined}
      onClick={isInteractive ? (isDrawingZone ? handleCanvasClick : undefined) : undefined}
      className={`relative ${isInteractive ? 'bg-slate-100' : 'bg-transparent'} ${isDrawingZone ? 'cursor-crosshair' : ''}`}
      style={{
        width: bgImage ? 'max-content' : (isInteractive ? '100%' : '800px'),
        height: bgImage ? 'max-content' : (isInteractive ? '100%' : '600px'),
          backgroundImage: bgImage
            ? `linear-gradient(to right, rgba(226, 232, 240, 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(226, 232, 240, 0.6) 1px, transparent 1px), url("${bgImage}")` 
          : 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
        backgroundSize: bgImage 
          ? `${itemScale}px ${itemScale}px, ${itemScale}px ${itemScale}px, auto` 
          : `${itemScale}px ${itemScale}px`,
        backgroundPosition: bgImage ? 'top left, top left, top left' : 'top left',
        backgroundRepeat: bgImage ? 'repeat, repeat, no-repeat' : 'repeat'
      }}
    >
      {bgImage && <img src={bgImage} onLoad={() => window.dispatchEvent(new Event('resize'))} alt="map-sizer" className="opacity-0 pointer-events-none select-none block" />}

      {!bgImage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
          <ImageIcon size={48} className="mb-4 opacity-10" />
          <p className="font-medium text-sm opacity-50">1x1m 比例網格 (1m x 1m Reference Grid)</p>
        </div>
      )}

      {visibleZones.length > 0 && (
         <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
           <defs>
             <filter id="zoneGlow" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="3" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
             </filter>
           </defs>
           {visibleZones.map(z => {
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
                    filter={isHighlighted ? "url(#zoneGlow)" : ""}
                    className={isHighlighted ? "animate-pulse" : ""}
                    style={{ transition: 'all 0.3s ease' }}
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

      {isInteractive && selectionBox && (
        <div 
          className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none z-50"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY)
          }}
        />
      )}

      {isInteractive && guides.x.map(x => (
        <div key={`gx-${x}`} className="absolute top-0 bottom-0 border-l border-blue-500 opacity-60 z-50 pointer-events-none" style={{ left: x, width: 1 }} />
      ))}
      {isInteractive && guides.y.map(y => (
        <div key={`gy-${y}`} className="absolute left-0 right-0 border-t border-blue-500 opacity-60 z-50 pointer-events-none" style={{ top: y, height: 1 }} />
      ))}

      {floorplan.elements.map(el => {
        const w_m = el.w_m || (el.w ? el.w / 40 : 1);
        const h_m = el.h_m || (el.h ? el.h / 40 : 1);
        
        const toolDef = TOOL_GROUPS.flatMap(g => g.items).find(t => t.type === el.type);
        const displayStyle = toolDef && el.type !== 'text' ? toolDef.style : el.style;
        const displayContent = toolDef && el.type !== 'text' ? toolDef.content : el.content;

        return (
          <div
            key={el.id}
            draggable={isInteractive}
            onDragStart={isInteractive ? (e) => handleDragStart(e, 'canvas', el.id) : undefined}
            onDragEnd={isInteractive ? handleDragEnd : undefined}
            onClick={isInteractive ? (e) => {
              e.stopPropagation();
              const targetGroupIds = expandSelectionByGroup([el.id], elementsRef.current);
              if (e.shiftKey) {
                setSelectedIds(prev => prev.includes(el.id) ? prev.filter(id => !targetGroupIds.includes(id)) : [...new Set([...prev, ...targetGroupIds])]);
              } else {
                setSelectedIds(targetGroupIds);
              }
            } : undefined}
            className={`absolute ${isInteractive ? 'cursor-move hover:ring-2 ring-slate-400' : 'pointer-events-none'} transition-shadow print:ring-0 print:shadow-none ${displayStyle} ${isInteractive && selectedIds.includes(el.id) ? 'ring-4 ring-blue-500 ring-opacity-50 shadow-xl z-10 print:ring-0 print:shadow-none' : ''}`}
            style={{ left: el.x || 0, top: el.y || 0, width: w_m * itemScale, height: h_m * itemScale, transform: `rotate(${el.rotation || 0}deg)` }}
          >
            {el.type === 'text' ? (
              <div className="w-full h-full flex items-center justify-center overflow-visible">
                <span className="font-bold text-slate-800 whitespace-nowrap text-sm">{el.label || (isInteractive ? '自訂文字 (Type label...)' : '')}</span>
              </div>
            ) : (
              displayContent
            )}
            {el.label && el.type !== 'text' && (
              <div 
                className="absolute left-1/2 bottom-0 pointer-events-none"
                style={{ transform: `translate(-50%, 120%) rotate(${-(el.rotation || 0)}deg)` }}
              >
                <span className="bg-white/90 backdrop-blur-sm text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded shadow-sm text-xs font-black whitespace-nowrap inline-block">
                  {el.label}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!isFullscreen) {
    return (
      <div className="flex flex-col gap-2">
         <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 print:hidden">
           <div>
             <h4 className="font-bold text-slate-800 flex items-center">
               <ImageIcon size={18} className="mr-2 text-slate-500" /> 平面圖總覽 (Floorplan Snapshot)
             </h4>
             <p className="text-xs text-slate-500 mt-0.5">點擊全螢幕以新增或移動物件。 (Fullscreen to edit)</p>
           </div>
           <button type="button" onClick={() => setIsFullscreen(true)} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm font-bold shadow-md">
             <Maximize size={16} /> 全螢幕編輯 (Edit)
           </button>
         </div>
         
         <div 
           ref={previewContainerRef} 
           className="w-full h-[350px] md:h-[450px] bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden relative flex items-center justify-center cursor-zoom-in group shadow-inner print:hidden"
           onClick={() => setIsFullscreen(true)}
         >
            <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
               <div className="bg-white px-5 py-2.5 rounded-xl font-bold text-slate-800 shadow-xl opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0">
                   <Maximize size={18} className="text-blue-600"/> 點擊全螢幕編輯 (Click to Edit)
               </div>
            </div>
            <div className="relative pointer-events-none transition-transform duration-300" style={{ transform: `scale(${previewScale})`, transformOrigin: 'center center' }}>
               {canvasContent(false)}
            </div>
         </div>

         <div className="hidden print:flex relative pointer-events-none rounded overflow-hidden justify-center my-4" style={{ breakInside: 'avoid' }}>
             <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center' }}>
               {canvasContent(false)}
             </div>
         </div>
      </div>
    );
  }

  const fullscreenEditor = (
    <div className="fixed inset-0 z-[9999] bg-white p-4 md:p-6 flex flex-col gap-4 w-screen h-screen overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-4">
          {!liteMode && (
            <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase">比例 (Scale)</span>
              <input 
                type="range" 
                min="10" 
                max="150" 
                value={itemScale} 
                onChange={(e) => updateFloorplan({ itemScale: Number(e.target.value) })}
                className="w-24 accent-blue-600"
              />
              <span className="text-xs font-mono font-bold text-blue-600 w-8">{itemScale}</span>
            </div>
          )}

          <button type="button" onClick={handleClearAll} className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm font-bold text-slate-700 shadow-sm select-none">
            <Eraser size={16} />
            <span>清除全部 (Clear)</span>
          </button>

          <div className="flex items-center gap-2 border-l border-slate-300 pl-4 ml-2">
            <button type="button" onClick={handleSavePreset} className="flex items-center gap-1.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm select-none">
              <Save size={16} /> <span className="hidden sm:inline">儲存佈置 (Save)</span>
            </button>
              <select 
                onChange={(e) => { 
                  if(e.target.value === 'clear_all') { 
                    if(window.confirm("確定刪除所有已儲存的預設佈置？ (Delete all presets?)")) { localStorage.removeItem('vms_floorplan_presets'); setPresets([]); } 
                  } else if (e.target.value) { 
                    handleLoadPresetOrEvent(e.target.value); 
                  } 
                  e.target.value = ''; 
                }} 
                className="text-sm font-bold text-slate-600 bg-white border border-slate-300 px-2 py-1.5 rounded-lg hover:bg-slate-50 outline-none shadow-sm cursor-pointer w-40"
              >
                <option value="">📂 載入地圖 (Load)</option>
                {presets.length > 0 && (
                  <optgroup label="預設範本 (Templates)">
                    {presets.map(p => <option key={p.id} value={`preset_${p.id}`}>{p.name}</option>)}
                  </optgroup>
                )}
                {events && events.filter(e => e.floorplan?.elements?.length > 0).length > 0 && (
                  <optgroup label="過往訂單 (Previous Events)">
                    {events.filter(e => e.floorplan?.elements?.length > 0).map(e => <option key={e.id} value={`event_${e.id}`}>{e.eventName} ({e.date})</option>)}
                  </optgroup>
                )}
                {presets.length > 0 && (
                  <>
                <option disabled>──────────</option>
                <option value="clear_all">刪除所有 (Delete All)</option>
                  </>
                )}
              </select>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 shadow-sm select-none">
            <button type="button" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="縮小 (Zoom Out)"><ZoomOut size={16}/></button>
            <button type="button" onClick={() => setZoom(1)} className="px-2 text-[10px] font-black text-blue-600 hover:bg-slate-100 rounded transition-colors" title="重設縮放 (Reset Zoom)">{Math.round(zoom * 100)}%</button>
            <button type="button" onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="放大 (Zoom In)"><ZoomIn size={16}/></button>
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 shadow-sm select-none">
            <button type="button" onClick={handleUndo} disabled={historyStepRef.current === 0} className="p-1.5 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-600 transition-colors" title="復原 (Undo - Ctrl+Z)"><Undo2 size={16}/></button>
            <button type="button" onClick={handleRedo} disabled={historyStepRef.current >= historyRef.current.length - 1} className="p-1.5 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-600 transition-colors" title="重做 (Redo - Ctrl+Y)"><Redo2 size={16}/></button>
          </div>

          {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded border border-blue-100 animate-in fade-in">
            <span className="text-xs font-bold text-blue-800 mr-2 flex items-center"><MousePointer2 size={14} className="mr-1"/> 已選取 ({selectedIds.length})</span>
            
            <button type="button" onClick={handleBringToFront} title="移至最前 (Bring to Front)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><ChevronsUp size={16} /></button>
            <button type="button" onClick={handleSendToBack} title="移至最後 (Send to Back)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><ChevronsDown size={16} /></button>
            <div className="h-4 w-px bg-blue-200 mx-1"></div>
            
            {selectedIds.length > 1 && (
              <>
                <button type="button" onClick={handleAlignTop} title="向上對齊 (Align Top)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><ArrowUpToLine size={16} /></button>
                <button type="button" onClick={handleAlignBottom} title="向下對齊 (Align Bottom)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><ArrowDownToLine size={16} /></button>
                <button type="button" onClick={handleAlignLeft} title="向左對齊 (Align Left)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><AlignLeft size={16} /></button>
                <button type="button" onClick={handleAlignRight} title="向右對齊 (Align Right)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><AlignRight size={16} /></button>
                
                {selectedIds.length > 2 && (
                  <>
                    <div className="h-4 w-px bg-blue-200 mx-0.5"></div>
                    <button type="button" onClick={handleDistributeHorizontal} title="水平均分 (Distribute Horizontally)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><MoveHorizontal size={16} /></button>
                    <button type="button" onClick={handleDistributeVertical} title="垂直均分 (Distribute Vertically)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><MoveVertical size={16} /></button>
                  </>
                )}
                <div className="h-4 w-px bg-blue-200 mx-0.5"></div>
                <button type="button" onClick={handleGroup} title="組成群組 (Group)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><Link size={16} /></button>
              </>
            )}
            {selectedIds.some(id => floorplan.elements.find(el => el.id === id)?.groupId) && (
                <button type="button" onClick={handleUngroup} title="取消群組 (Ungroup)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><Unlink size={16} /></button>
            )}
            {selectedIds.length === 1 && (
                <>
                  <div className="h-4 w-px bg-blue-200 mx-1"></div>
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden animate-in fade-in">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1.5 border-r border-slate-300">標籤:</span>
                    <input 
                      type="text" 
                      value={floorplan.elements.find(el => el.id === selectedIds[0])?.label || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateFloorplan({
                          elements: floorplan.elements.map(el => el.id === selectedIds[0] ? { ...el, label: val } : el)
                        });
                      }}
                      placeholder="e.g. VIP 1"
                      className="w-24 px-2 py-1 text-[10px] outline-none text-blue-800 font-bold"
                    />
                  </div>
                  <button type="button" onClick={handleCreateGrid} title="建立陣列網格 (Array Grid)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors ml-1"><Grid size={16} /></button>
                </>
            )}
            <div className="h-4 w-px bg-blue-200 mx-1"></div>

            <button type="button" onClick={handleDuplicate} title="複製 (Duplicate)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><Copy size={16} /></button>
            <button type="button" onClick={handleRotate} title="旋轉 (Rotate)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-blue-600 transition-colors"><RotateCw size={16} /></button>
            <button type="button" onClick={handleDelete} title="刪除 (Delete)" className="bg-white p-1.5 rounded shadow-sm text-slate-600 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
          </div>
          )}
          <button 
            type="button" 
            onClick={() => {
              setIsFullscreen(false);
              if (onClose) onClose();
            }} 
            className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm font-bold text-slate-700 shadow-sm"
          >
            <Minimize size={16} /> 縮小完成 (Done)
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-64 min-w-[16rem] bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto shadow-inner no-scrollbar">
          {!liteMode && (
            <div>
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-100 pb-1 flex items-center justify-between">
                <span>區域繪製 (Zone Drawing)</span>
                {isDrawingZone && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
              </h4>
              <div className="space-y-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsDrawingZone(!isDrawingZone);
                    if (!isDrawingZone) setDrawingZoneId(zones[0]?.id);
                  }}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-2 ${isDrawingZone ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  {isDrawingZone ? <><MousePointer2 size={14}/> 停止繪製 (Stop)</> : <><PenTool size={14}/> 開始繪製 (Draw Zones)</>}
                </button>
                
                {isDrawingZone && (
                  <div className="p-2 bg-white rounded-lg border border-red-100 space-y-2 animate-in slide-in-from-top-2">
                    <p className="text-[10px] text-slate-500 mb-2 leading-tight">選擇一個區域並點擊右側地圖來繪製頂點</p>
                    <select 
                      value={drawingZoneId || ''} 
                      onChange={(e) => setDrawingZoneId(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-200 rounded outline-none font-bold text-slate-700 bg-slate-50"
                    >
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.nameZh || z.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          const newZones = zones.map(z => z.id === drawingZoneId ? { ...z, points: [] } : z);
                          updateZones(newZones);
                        }}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition-colors"
                      >
                        清除目前
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          const newZones = zones.map(z => {
                            if (z.id === drawingZoneId && z.points?.length > 0) {
                              return { ...z, points: z.points.slice(0, -1) };
                            }
                            return z;
                          });
                          updateZones(newZones);
                        }}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition-colors"
                      >
                        復原點
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {TOOL_GROUPS.map((group, gIdx) => (
            <div key={gIdx}>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">{group.name}</h4>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map(tool => (
                  <div
                    key={tool.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'toolbox', tool.type)}
                    onDragEnd={handleDragEnd}
                    className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-lg border border-slate-200 cursor-grab hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    <div className={`${tool.style} flex items-center justify-center overflow-hidden`} style={{ width: Math.min(tool.w_m * 40, 40), height: Math.min(tool.h_m * 40, 40) }}>
                      {tool.content}
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 text-center leading-tight mt-2">{tool.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 relative overflow-auto shadow-inner">
          <div style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: 'top left',
            width: 'max-content',
            height: 'max-content'
          }}>
            {canvasContent(true)}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(fullscreenEditor, document.body);
}