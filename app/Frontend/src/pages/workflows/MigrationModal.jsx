import React from 'react';
import CustomButton from '../../CustomComponents/CustomButton';

export default function MigrationModal({
  migrationData,
  selectedProcesses,
  setSelectedProcesses,
  onMigrate,
  migrating,
  onClose,
}) {
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

  const renderAssignees = (assignees) => {
    if (!assignees || assignees.length === 0) return null;
    return assignees.map((a, idx) => (
      <span key={idx} className="inline-flex items-center gap-1 mr-2 mb-1">
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          a.type === 'user' ? 'bg-blue-100 text-blue-800' :
          a.type === 'role' ? 'bg-green-100 text-green-800' :
          a.type === 'department' ? 'bg-purple-100 text-purple-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {a.name} ({a.type})
        </span>
      </span>
    ));
  };

  return (
    <div className="p-6 max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-2">
        Migrate Processes to New Workflow Version
      </h2>
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
                        {step.addedAssignees?.length > 0 && (
                          <div className="ml-4 mt-1">
                            <span className="font-semibold">➕ Added:</span>
                            <div className="flex flex-wrap mt-1">
                              {renderAssignees(step.addedAssignees)}
                            </div>
                          </div>
                        )}
                        {step.removedAssignees?.length > 0 && (
                          <div className="ml-4 mt-1">
                            <span className="font-semibold">➖ Removed:</span>
                            <div className="flex flex-wrap mt-1">
                              {renderAssignees(step.removedAssignees)}
                            </div>
                          </div>
                        )}
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

      <div className="mt-6 flex justify-end gap-3">
        <CustomButton
          text="Cancel"
          click={onClose}                // ← use click
          variant="secondary"
        />
        <CustomButton
          text={migrating ? 'Migrating...' : 'Migrate Selected'}
          click={onMigrate}               // ← use click
          disabled={migrating || selectedProcesses.length === 0}
          variant="primary"
        />
      </div>
    </div>
  );
}