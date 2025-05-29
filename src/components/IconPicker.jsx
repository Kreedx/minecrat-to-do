import React from 'react';
import * as Icons from 'react-icons/fa';

export default function IconPicker({ onSelect, selected }) {
  const commonIcons = [
    'FaHome', 'FaStar', 'FaHeart', 'FaBookmark',
    'FaCalendar', 'FaCode', 'FaCoffee', 'FaFlag'
  ];

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
        {commonIcons.map(iconName => {
            const IconComponent = Icons[iconName];
            const isSelected = selected === iconName;
            return (
                <button
                    key={iconName}
                    onClick={() => onSelect(iconName)}
                    className={`flex items-center justify-center p-4 rounded-lg transition-all duration-150 shadow hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      isSelected 
                        ? 'bg-blue-100 ring-2 ring-blue-400' 
                        : 'bg-gray-50 hover:bg-blue-100'
                    }`}
                    aria-label={iconName}
                    type="button"
                >
                    <IconComponent size={28} className={`${isSelected ? 'text-blue-700' : 'text-gray-600'}`} />
                </button>
            );
        })}
    </div>
  );
}
