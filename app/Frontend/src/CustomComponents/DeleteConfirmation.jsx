import CustomButton from './CustomButton';
import CustomModal from './CustomModal';

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) {
  if (!isOpen) return null;

  return (
    <CustomModal isOpen={isOpen} className={'!p-2'} onClose={onClose}>
      <div className="bg-gray-800 bg-white p-6 rounded-lg w-96">
        <p className="text-lg font-semibold">Confirm Deletion</p>
        <p className="text-gray-300 mt-2">
          Are you sure you want to delete this item?
        </p>
        <div className="flex justify-end space-x-3 mt-5">
          <CustomButton
            variant={'danger'}
            className="px-4 py-2 bg-button-danger-default hover:bg-button-danger-hover text-white hover:bg-gray-500 transition-all rounded-lg"
            click={onClose}
            disabled={isLoading}
            type={'button'}
            text={'Cancel'}
          ></CustomButton>
          <CustomButton
            className="px-4 py-2 bg-button-primary-default hover:bg-button-primary-hover transition-all text-white rounded-lg"
            click={onConfirm}
            disabled={isLoading}
            type={'button'}
            text={isLoading ? 'Deleting...' : 'Delete'}
          ></CustomButton>
        </div>
      </div>
    </CustomModal>
  );
}
