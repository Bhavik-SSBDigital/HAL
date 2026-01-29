import React from 'react';

export default function CustomTextField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error, // ✅ new
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder || `Enter ${label}`}
        disabled={disabled}
        className={`w-full rounded-lg px-3 py-2 text-sm border
          focus:outline-none focus:ring-2
          ${
            error
              ? 'border-red-500 focus:ring-red-400'
              : 'border-gray-300 focus:ring-green-500'
          }
          disabled:bg-gray-100 disabled:cursor-not-allowed`}
      />

      {/* ✅ Error message */}
      {error && <span className="text-xs text-red-600 mt-0.5">{error}</span>}
    </div>
  );
}
