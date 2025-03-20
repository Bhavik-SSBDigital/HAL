import React from 'react';

export default function CustomButtom({ click, text }) {
  return (
    <button
      onClick={click}
      className="px-5 py-2 bg-button-primary-default hover:bg-button-primary-hover rounded-md text-white"
    >
      {text}
    </button>
  );
}
