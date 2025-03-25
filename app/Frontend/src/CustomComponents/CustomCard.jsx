import React from 'react';

export default function CustomCard({ children, className, click }) {
  return (
    <div
      onClick={click}
      className={`p-6 bg-white border border-slate-300 rounded-md ${className}`}
    >
      {children}
    </div>
  );
}
