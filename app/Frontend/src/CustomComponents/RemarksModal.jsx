import React, { useState, useEffect } from 'react';
import CustomModal from './CustomModal';
import CustomButton from './CustomButton';

const RemarksModal = ({ open, title, onSubmit, onClose, loading }) => {
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (!open) {
      setRemark('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (remark.trim()) {
      onSubmit(remark);
    }
  };

  return (
    <CustomModal isOpen={open} onClose={onClose} className="w-96">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
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
            type={'button'}
            text="Cancel"
            variant="danger"
            click={onClose}
          />
          <CustomButton disabled={loading} text="Submit" type="submit" />
        </div>
      </form>
    </CustomModal>
  );
};

export default RemarksModal;
