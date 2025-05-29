import React from 'react';

export default function CustomCard({
  children,
  className,
  click,
  title,
  style,
  ...rest
}) {
  return (
    <div
      title={title}
      style={style}
      onClick={click}
      className={`p-6 bg-white border border-slate-300 rounded-md ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
