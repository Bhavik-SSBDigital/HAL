import React from 'react';

export default function CustomButton({
  variant,
  click,
  text,
  className,
  disabled,
  title,
  type,
}) {
  const baseClasses =
    'px-5 py-2 rounded-md text-white transition-colors duration-200';

  const buttonStyles = {
    primary:
      'bg-button-primary-default hover:bg-button-primary-hover disabled:bg-button-primary-disabled',
    secondary:
      'bg-button-secondary-default hover:bg-button-secondary-hover disabled:bg-button-secondary-disabled',
    success:
      'bg-button-success-default hover:bg-button-success-hover disabled:bg-button-success-disabled',
    danger:
      'bg-button-danger-default hover:bg-button-danger-hover disabled:bg-button-danger-disabled',
    warning:
      'bg-button-warning-default hover:bg-button-warning-hover disabled:bg-button-warning-disabled',
    info: 'bg-button-info-default hover:bg-button-info-hover disabled:bg-button-info-disabled',
  };

  return (
    <button
      onClick={click}
      title={title}
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${
        buttonStyles[variant] || buttonStyles.primary
      } ${className}`}
    >
      {text}
    </button>
  );
}
