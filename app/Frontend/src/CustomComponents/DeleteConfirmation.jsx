export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed z-30 inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-gray-800 bg-white p-6 rounded-lg shadow-xl w-96">
        <p className="text-lg font-semibold">Confirm Deletion</p>
        <p className="text-gray-300 mt-2">
          Are you sure you want to delete this item?
        </p>
        <div className="flex justify-end space-x-3 mt-5">
          <button
            className="px-4 py-2 bg-button-danger-default hover:bg-button-danger-hover text-white hover:bg-gray-500 transition-all rounded-lg"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-button-primary-default hover:bg-button-primary-hover transition-all text-white rounded-lg"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
