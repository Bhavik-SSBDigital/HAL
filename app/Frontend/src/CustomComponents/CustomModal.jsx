import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomModal({ children, isOpen, onClose, className }) {
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
            className={`bg-white z-50 p-6 rounded-lg shadow-lg relative border border-slate-700 
  max-h-[95vh] overflow-auto m-3 
  w-fit min-w-[42rem] max-w-4xl 
  ${className}`}
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
