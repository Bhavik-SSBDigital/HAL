import React from 'react';

export default function ShowWorkflow({ workFlow, handleDelete }) {
  // Helper function to truncate text
  function truncateText(text, maxLength = 12) {
    if (!text || typeof text !== 'string') return '---';
    return text.length <= maxLength
      ? text
      : `${text.substring(0, maxLength)}...`;
  }

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {workFlow?.map((item, index) => (
        <div
          key={index}
          className="relative bg-white shadow-lg rounded-lg border border-purple-500 p-6 w-60 md:w-72"
        >
          {/* Delete button */}
          <button
            onClick={() => handleDelete(index)}
            className="absolute top-2 right-2 text-red-500 text-xl"
          >
            ✖
          </button>

          {/* Workflow Index */}
          <h3 className="text-xl font-semibold text-center text-gray-800">
            Step {index + 1}
          </h3>

          <div className="mt-4 space-y-4">
            {/* Step Name */}
            <div>
              <p className="font-medium text-gray-700">
                <strong>Step:</strong> {item.stepName}
              </p>
            </div>

            {/* Allow Parallel */}
            <div>
              <p className="font-medium text-gray-700">
                <strong>Allow Parallel:</strong>{' '}
                {item.allowParallel ? 'Yes' : 'No'}
              </p>
            </div>

            {/* Assignments */}
            {item.assignments?.map((assignment, assignIndex) => (
              <div key={assignIndex} className="space-y-2">
                <p className="font-medium text-gray-700">
                  <strong>Assignment {assignIndex + 1}:</strong>
                </p>

                <div>
                  <p className="text-gray-600">
                    <strong>Assignee Type:</strong>{' '}
                    {truncateText(assignment.assigneeType)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">
                    <strong>Assignee ID:</strong>{' '}
                    {truncateText(assignment.assigneeId)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">
                    <strong>Action Type:</strong>{' '}
                    {truncateText(assignment.actionType)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
