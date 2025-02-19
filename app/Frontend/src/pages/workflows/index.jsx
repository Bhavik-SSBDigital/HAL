import React, { useEffect, useState } from 'react';
import { GetWorkflows } from '../../common/Apis';
import WorkflowForm from './WorkflowForm';

export default function WorkflowVisualizer() {
  const [workflows, setWorkflows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const getList = async () => {
      try {
        const res = await GetWorkflows();
        setWorkflows(res?.data?.workflows || []);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      }
    };
    getList();
  }, []);

  const filteredWorkflows = workflows.filter((department) =>
    department.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 mx-auto bg-white rounded-md shadow-lg w-full">
      <h2 className="text-xl font-bold mb-6 text-center">Workflow</h2>

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-2/3 p-2 border rounded-md"
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          onClick={() => setShowForm(true)}
        >
          Add Workflow
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl relative overflow-y-auto max-h-[90vh]">
            <WorkflowForm handleCloseForm={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {filteredWorkflows.map((department, wIndex) => (
        <div key={wIndex} className="border p-4 rounded-md mb-6">
          <h3 className="text-lg font-semibold">{department.name}</h3>
          {department.versions.map((workflow, wfIndex) => (
            <div key={wfIndex} className="border p-4 rounded-md mt-4">
              <h4 className="font-semibold">
                Workflow Version {workflow.version}
              </h4>
              <p className="text-sm text-gray-600">{workflow.description}</p>
              <p className="text-sm text-gray-600">
                Created By: {workflow.createdBy.email}
              </p>
              <p className="text-sm text-gray-600">
                Created At: {new Date(workflow.createdAt).toLocaleString()}
              </p>
              <div className="mt-4">
                {workflow.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="border p-4 rounded-md mb-4">
                    <h5 className="font-semibold">
                      Step {step.stepNumber}: {step.stepName}
                    </h5>
                    <p className="text-sm text-gray-600">
                      Parallel Allowed: {step.allowParallel ? 'Yes' : 'No'}
                    </p>
                    <h6 className="mt-2 font-semibold">Assignments:</h6>
                    <ul className="list-disc pl-6 text-sm">
                      {step.assignments.map((assignment, assignIndex) => (
                        <li key={assignIndex}>
                          {assignment.assigneeType} - IDs:{' '}
                          {assignment.assigneeIds.length > 0
                            ? assignment.assigneeIds.join(', ')
                            : 'None'}{' '}
                          - {assignment.actionType}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
