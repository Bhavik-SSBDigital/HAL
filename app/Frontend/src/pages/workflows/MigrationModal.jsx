import React, { useEffect, useRef } from 'react';
import CustomButton from '../../CustomComponents/CustomButton';

export default function MigrationModal({
  migrationData,
  selectedProcesses,
  setSelectedProcesses,
  onMigrate,
  migrating,
  onClose,
}) {
  const modalRef = useRef();

  if (!migrationData || !migrationData.oldWorkflow || !migrationData.newWorkflow) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">Error: Migration data is incomplete or missing.</p>
        <CustomButton click={onClose} text="Close" variant="secondary" />
      </div>
    );
  }

  const { oldWorkflow, newWorkflow, processes = [] } = migrationData;

  const toggleSelectAll = () => {
    if (selectedProcesses.length === processes.length) {
      setSelectedProcesses([]);
    } else {
      setSelectedProcesses(processes.map((p) => p.processId));
    }
  };

  const toggleProcess = (processId) => {
    setSelectedProcesses((prev) =>
      prev.includes(processId)
        ? prev.filter((id) => id !== processId)
        : [...prev, processId]
    );
  };

  const handleClose = () => {
    if (selectedProcesses.length > 0) {
      if (window.confirm('You have selected processes. Are you sure you want to close without migrating?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const renderItems = (items, label) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mt-2">
        <span className="font-semibold">{label}:</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {items.map((item, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 text-xs rounded-full ${
                item.type === 'user'
                  ? 'bg-blue-100 text-blue-800'
                  : item.type === 'role'
                  ? 'bg-green-100 text-green-800'
                  : item.type === 'department'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.name} ({item.type})
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header with title and close button */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">
            Migrate Processes to New Workflow Version
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <p className="text-sm text-gray-600 mb-4">
            The workflow <strong>{oldWorkflow.name} v{oldWorkflow.version}</strong> has been updated to{' '}
            <strong>{newWorkflow.name} v{newWorkflow.version}</strong>.
            The following active processes are using the old version. Select which to migrate.
          </p>

          <div className="mb-4 flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedProcesses.length === processes.length && processes.length > 0}
                onChange={toggleSelectAll}
              />
              Select All
            </label>
            <span>
              {selectedProcesses.length} of {processes.length} selected
            </span>
          </div>

          <div className="space-y-3">
            {processes.map((process) => (
              <div key={process.processId} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedProcesses.includes(process.processId)}
                    onChange={() => toggleProcess(process.processId)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{process.processName}</h3>
                      <span className="text-sm text-gray-500">
                        by {process.initiator}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-semibold">Current Step:</span>{' '}
                      {process.currentStepName} (Step {process.currentStepNumber})
                    </p>
                    <p className="text-sm text-gray-600 mt-1 bg-blue-50 p-2 rounded">
                      {process.summary}
                    </p>

                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer">
                        Show step-by-step changes
                      </summary>
                      <div className="mt-2 text-xs space-y-2">
                        {process.stepChanges?.map((step) => (
                          <div key={step.stepNumber} className="border-t pt-2">
                            <div className="font-medium">
                              Step {step.stepNumber}: {step.stepName}
                              {!step.existsInNew && (
                                <span className="text-red-600 ml-2">(removed)</span>
                              )}
                            </div>
                            {renderItems(step.added, '➕ Added')}
                            {renderItems(step.removed, '➖ Removed')}
                            {step.addedCount === 0 && step.removedCount === 0 && (
                              <div className="ml-4 text-gray-500">No changes</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex justify-end gap-3 p-4 border-t">
          <CustomButton
            text="Cancel"
            click={handleClose}
            variant="secondary"
          />
          <CustomButton
            text={migrating ? 'Migrating...' : 'Migrate Selected'}
            click={onMigrate}
            disabled={migrating || selectedProcesses.length === 0}
            variant="primary"
          />
        </div>
      </div>
    </div>
  );
}