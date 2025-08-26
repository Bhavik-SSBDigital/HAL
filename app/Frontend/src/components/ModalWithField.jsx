import React, { useState } from 'react';
import CustomModal from '../CustomComponents/CustomModal';
import CustomButton from '../CustomComponents/CustomButton';
import CustomTextField from '../CustomComponents/CustomTextField'; // assuming you have this input

export default function ModalWithField({
  open,
  setOpen,
  actionsLoading,
  setActionsLoading,
  fieldName, // field label/name passed from parent
  onSubmit, // callback to send value back to parent
}) {
  const [fieldValue, setFieldValue] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionsLoading(true);

    // Pass value back to parent
    await onSubmit(fieldValue);

    setActionsLoading(false);
    setOpen(false);
    setFieldValue('');
  };

  return (
    <CustomModal isOpen={open} onClose={() => setOpen(false)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <CustomTextField
          label={fieldName}
          type={fieldName.toLowerCase() === 'password' ? 'password' : 'text'}
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          required
        />

        <div className="flex justify-end gap-3">
          <CustomButton
            variant="danger"
            disabled={actionsLoading}
            type="button"
            click={() => setOpen(false)}
            text={'Cancel'}
          ></CustomButton>

          <CustomButton
            variant="primary"
            disabled={actionsLoading}
            type="submit"
            text={'Submit'}
          ></CustomButton>
        </div>
      </form>
    </CustomModal>
  );
}
