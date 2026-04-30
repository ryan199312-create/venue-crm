import React from 'react';
import { 
  isZoneSelected, 
  getPreferredZoneLabel 
} from '../../services/billingService';

export const LocationSelector = ({ formData, setFormData, className = "", appSettings }) => {
  const selectedLocs = formData.selectedLocations || [];

  // 1. Resolve Dynamic Zones from settings or fallback to legacy defaults
  const dynamicZones = appSettings?.zonesConfig || [
    { id: 'red', nameZh: '紅區', nameEn: 'Red Zone' },
    { id: 'yellow', nameZh: '黃區', nameEn: 'Yellow Zone' },
    { id: 'green', nameZh: '綠區', nameEn: 'Green Zone' },
    { id: 'blue', nameZh: '藍區', nameEn: 'Blue Zone' }
  ];
  
  const zoneLabels = dynamicZones.map(z => getPreferredZoneLabel(z));
  const locationCheckboxes = [...zoneLabels, '全場'];

  const buildVenueString = (checkboxes, manualInput) => {
    // If '全場' is selected, it should be the primary label, but we keep others for data integrity
    const allParts = [
      ...(checkboxes || []),
      manualInput ? manualInput.trim() : null
    ];
    return allParts.filter(part => part && part.length > 0).join(', ');
  };

  const handleCheckboxChange = (loc) => {
    let newLocs = [...selectedLocs];
    
    if (loc === '全場') {
      if (newLocs.includes('全場')) {
        // UNCHECKING: Remove everything associated with zones
        newLocs = newLocs.filter(l => l !== '全場' && !zoneLabels.includes(l) && !dynamicZones.some(z => l === z.nameZh));
      } else {
        // CHECKING: Add '全場' and ALL zone labels
        newLocs = Array.from(new Set([...newLocs, '全場', ...zoneLabels]));
      }
    } else {
      const targetZone = dynamicZones.find(z => getPreferredZoneLabel(z) === loc || z.nameZh === loc);
      const isCurrentlySelected = targetZone ? isZoneSelected(targetZone, newLocs) : newLocs.includes(loc);

      if (isCurrentlySelected) {
        // Remove individual zone
        if (targetZone) {
          newLocs = newLocs.filter(l => l !== getPreferredZoneLabel(targetZone) && l !== targetZone.nameZh);
        } else {
          newLocs = newLocs.filter(l => l !== loc);
        }
        // If an individual zone is removed, it's no longer '全場'
        newLocs = newLocs.filter(l => l !== '全場');
      } else {
        // Add individual zone
        newLocs.push(loc);
        
        // Check if all zones are now selected to auto-mark '全場'
        const allZonesSelected = dynamicZones.every(z => isZoneSelected(z, newLocs));
        if (allZonesSelected && !newLocs.includes('全場')) {
          newLocs.push('全場');
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      selectedLocations: newLocs,
      venueLocation: buildVenueString(newLocs, prev.locationOther)
    }));
  };

  const isChecked = (loc) => {
    const targetZone = dynamicZones.find(z => getPreferredZoneLabel(z) === loc);
    if (targetZone) return isZoneSelected(targetZone, selectedLocs);
    return selectedLocs.includes(loc);
  };

  const handleOtherChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      locationOther: val,
      venueLocation: buildVenueString(prev.selectedLocations, val)
    }));
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-2">活動位置 (Venue Location)</label>
      <div className="flex flex-wrap gap-3 mb-2">
        {locationCheckboxes.map(loc => (
          <label key={loc} className={`flex items-center space-x-2 px-3 py-2 rounded border cursor-pointer transition-colors ${isChecked(loc) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
            <input
              type="checkbox"
              checked={isChecked(loc)}
              onChange={() => handleCheckboxChange(loc)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${isChecked(loc) ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>{loc}</span>
          </label>
        ))}
      </div>
      <input
        type="text"
        name="locationOther"
        autoComplete="off"
        placeholder="其他位置 (Other)"
        value={formData.locationOther || ''}
        onChange={handleOtherChange}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
      />
    </div>
  );
};

export default LocationSelector;