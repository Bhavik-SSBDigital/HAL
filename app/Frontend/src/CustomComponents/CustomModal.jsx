import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomModal({
  children,
  isOpen,
  onClose,
  className,
  size = 'lg',
}) {
  const sizeClasses = {
    xs: 'max-w-xs min-w-[16rem]',
    sm: 'max-w-sm min-w-[20rem]',
    md: 'max-w-md min-w-[24rem]',
    lg: 'max-w-lg min-w-[28rem]',
    xl: 'max-w-xl min-w-[32rem]',
    '2xl': 'max-w-2xl min-w-[36rem]',
    '3xl': 'max-w-3xl min-w-[40rem]',
    '4xl': 'max-w-4xl min-w-[48rem]',
    '5xl': 'max-w-5xl min-w-[56rem]',
    '6xl': 'max-w-6xl min-w-[64rem]',
    full: 'w-full h-full',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-99 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
        >
          <motion.div
            key="modal-content"
            className={`
              bg-white z-50 p-6 rounded-lg shadow-lg relative border border-slate-700 
              max-h-[95vh] overflow-auto m-3 
              ${sizeClasses[size] || sizeClasses.lg}
              ${className}
            `}
            initial={{ y: 20, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
