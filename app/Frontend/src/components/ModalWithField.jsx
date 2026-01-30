import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import CustomModal from '../CustomComponents/CustomModal';
import CustomButton from '../CustomComponents/CustomButton';
import CustomTextField from '../CustomComponents/CustomTextField';

export default function ModalWithField({
  open,
  setOpen,
  actionsLoading,
  setActionsLoading,
  fieldName,
  onSubmit,
  defaultWatermark = '',
  lockWatermark = false,
}) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fieldValue: '',
      watermark: '',
    },
  });

  // 👇 Set watermark when modal opens
  React.useEffect(() => {
    if (open && defaultWatermark) {
      setValue('watermark', defaultWatermark);
    }
  }, [open, defaultWatermark, setValue]);

  const handleFormSubmit = async (data) => {
    setActionsLoading(true);
    await onSubmit(data);
    setActionsLoading(false);
    setOpen(false);
    reset();
  };

  return (
    <CustomModal isOpen={open} onClose={() => setOpen(false)}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-4 p-4"
      >
        {/* Dynamic field */}
        <Controller
          name="fieldValue"
          control={control}
          rules={{ required: `${fieldName} is required` }}
          render={({ field }) => (
            <CustomTextField
              label={fieldName}
              type={
                fieldName.toLowerCase() === 'password' ? 'password' : 'text'
              }
              {...field}
              error={errors.fieldValue?.message}
            />
          )}
        />

        {/* Watermark field */}
        <Controller
          name="watermark"
          control={control}
          rules={{ required: 'Watermark is required' }}
          render={({ field }) => (
            <CustomTextField
              label="Watermark"
              type="text"
              {...field}
              disabled={lockWatermark}   // 👈 lock it
              error={errors.watermark?.message}
            />
          )}
        />

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <CustomButton
            variant="danger"
            disabled={actionsLoading}
            type="button"
            click={() => {
              setOpen(false);
              reset();
            }}
            text="Cancel"
          />
          <CustomButton
            variant="primary"
            disabled={actionsLoading}
            type="submit"
            text="Submit"
          />
        </div>
      </form>
    </CustomModal>
  );
}

