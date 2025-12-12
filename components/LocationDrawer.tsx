import React, { useState } from 'react';
import { X, MapPin, ChevronLeft, Globe } from 'lucide-react';
import { ARAB_LOCATIONS, LocationData } from '../data/locations';

interface LocationDrawerProps {
  onClose: () => void;
  onSelect: (country: string, city: string | null) => void;
}

const LocationDrawer: React.FC<LocationDrawerProps> = ({ onClose, onSelect }) => {
  const [view, setView] = useState<'countries' | 'cities'>('countries');
  const [selectedCountryObj, setSelectedCountryObj] = useState<LocationData | null>(null);

  const handleCountrySelect = (location: LocationData) => {
    setSelectedCountryObj(location);
    setView('cities');
  };

  const handleGeneralSelect = () => {
    onSelect('عام', null);
    onClose();
  };

  const handleAllCitiesSelect = () => {
    if (selectedCountryObj) {
      onSelect(selectedCountryObj.country, null);
      onClose();
    }
  };

  const handleCitySelect = (city: string) => {
    if (selectedCountryObj) {
      onSelect(selectedCountryObj.country, city);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-[90] transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 h-[60vh] bg-white z-[100] rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.15)] flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
           <div className="flex items-center gap-2">
             {view === 'cities' ? (
                <button 
                  onClick={() => setView('countries')}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft size={24} className="text-gray-600 rotate-180" />
                </button>
             ) : (
                <div className="w-8"></div> // Spacer
             )}
             <span className="font-bold text-gray-800 text-lg">
               {view === 'countries' ? 'اختر الدولة' : `مدن ${selectedCountryObj?.country}`}
             </span>
           </div>
           
           <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
             <X size={24} className="text-gray-500" />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          
          {view === 'countries' && (
            <div className="flex flex-col gap-1">
              {/* General Option */}
              <button 
                onClick={handleGeneralSelect}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="bg-blue-100 p-2 rounded-full group-hover:bg-blue-200 transition-colors">
                  <Globe size={20} className="text-blue-600" />
                </div>
                <span className="font-bold text-gray-700">عام (كل الدول)</span>
              </button>
              
              <div className="h-px bg-gray-100 my-1 mx-4"></div>

              {/* Countries List */}
              {ARAB_LOCATIONS.map((loc) => (
                <button 
                  key={loc.country}
                  onClick={() => handleCountrySelect(loc)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-right dir-rtl"
                >
                  <span className="font-medium text-gray-800">{loc.country}</span>
                  <ChevronLeft size={18} className="text-gray-300" />
                </button>
              ))}
            </div>
          )}

          {view === 'cities' && selectedCountryObj && (
            <div className="flex flex-col gap-1">
              {/* All Cities Option */}
              <button 
                onClick={handleAllCitiesSelect}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="bg-blue-100 p-2 rounded-full group-hover:bg-blue-200 transition-colors">
                  <MapPin size={20} className="text-blue-600" />
                </div>
                <span className="font-bold text-gray-700">كل المدن</span>
              </button>

              <div className="h-px bg-gray-100 my-1 mx-4"></div>

              {/* Cities List */}
              {selectedCountryObj.cities.map((city) => (
                <button 
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className="flex items-center justify-start p-3 rounded-xl hover:bg-gray-50 transition-colors text-right dir-rtl"
                >
                  <span className="font-medium text-gray-700">{city}</span>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default LocationDrawer;