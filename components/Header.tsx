
import React from 'react';
import { Settings, Search, Bell, MapPin, Compass } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  currentLocation: { country: string; city: string | null };
  onLocationClick: () => void;
  onNotificationsClick: () => void;
  onSettingsClick: () => void;
  onDiscoveryClick: () => void;
  unreadCount?: number;
}

const Header: React.FC<HeaderProps> = ({ 
  currentLocation, 
  onLocationClick, 
  onNotificationsClick, 
  onSettingsClick, 
  onDiscoveryClick,
  unreadCount = 0 
}) => {
  const { language } = useLanguage();
  
  // Helper to format location string
  const getLocationLabel = () => {
    if (currentLocation.country === 'عام') return language === 'en' ? 'General' : 'عام';
    if (currentLocation.city) return `${currentLocation.country} | ${currentLocation.city}`;
    return currentLocation.country;
  };

  return (
    <div className="bg-white px-4 pt-3 pb-1 flex justify-between items-center">
      
      {/* Location Selector (Visual Logic handles RTL/LTR via flex-row-reverse if needed, but justify-between handles spacing) */}
      
      {/* Right Side (in RTL) / Left Side (in LTR) - Location Selector */}
      {/* We use specific order in DOM and justify-between. 
          In RTL: DOM order 1 is Right. 
          In LTR: DOM order 1 is Left. 
          Wait, in Header.tsx originally: 
          Location was "Right Side (Visual)" but implicitly first in DOM? 
          Actually original code had Location first in DOM.
          justify-between puts first item at Start (Right in RTL, Left in LTR). 
          So no change needed for flex logic, just content.
      */}
      <button 
        onClick={onLocationClick}
        className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 py-1.5 px-3 rounded-full transition-colors border border-gray-100"
      >
        <MapPin size={16} className="text-blue-600" fill="currentColor" fillOpacity={0.2} />
        <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">
          {getLocationLabel()}
        </span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1">
        
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600">
          <Search size={24} strokeWidth={2} />
        </button>

        <button 
          onClick={onDiscoveryClick}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700 group"
        >
          <Compass size={24} strokeWidth={2} className="group-hover:text-blue-600 transition-colors" />
        </button>

        <button 
          onClick={onNotificationsClick}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 relative"
        >
          <Bell size={24} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white px-0.5 leading-none shadow-sm animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button 
          onClick={onSettingsClick}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        >
          <Settings size={24} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default Header;
