import React, { useState, useEffect } from 'react';
import CustomButton from './CustomButton';

const RemarksModal = ({ open, onSubmit, onClose, loading }) => {
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (!open) {
      setRemark('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (remark.trim()) {
      onSubmit(remark);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4">Add Remarks</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full p-2 border rounded-lg focus:outline-none"
            rows="4"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Enter your remarks here..."
            required
          />
          <div className="flex justify-end mt-4 space-x-2">
            <CustomButton
              disabled={loading}
              text={'Cancel'}
              type={'danger'}
              click={onClose}
            />
            <CustomButton disabled={loading} text={'Submit'} type={'submit'} />
          </div>
        </form>
      </div>
    </div>
  );
};

export default RemarksModal;
