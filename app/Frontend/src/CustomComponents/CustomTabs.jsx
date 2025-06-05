import React from 'react';

const CustomTabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div
      className="flex space-x-2 border-b border-gray-300 overflow-x-auto scrollbar-hide"
      style={{ scrollbarWidth: 'none' }} // Firefox
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200 ${
            activeTab === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-blue-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default CustomTabs;
