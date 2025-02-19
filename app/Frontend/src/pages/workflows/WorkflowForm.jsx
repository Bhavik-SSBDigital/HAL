import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-toastify';
import { CreateWorkflow } from '../../common/Apis';

export default function WorkflowForm({ handleCloseForm }) {
  const { register, handleSubmit, control, setValue, reset } = useForm({
    defaultValues: {
      name: '',
      description: '',
      steps: [],
    },
  });

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
  } = useFieldArray({ control, name: 'steps' });

  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(null);

  const handleAddAssignment = (stepIndex) => {
    setCurrentStepIndex(stepIndex);
    setShowAssignmentForm(true);
  };

  const handleAssignmentSubmit = (assignment) => {
    const updatedSteps = [...stepFields];
    updatedSteps[currentStepIndex].assignments = [
      ...(updatedSteps[currentStepIndex].assignments || []),
      {
        ...assignment,
        assigneeIds: assignment.assigneeIds
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id),
      },
    ];
    setValue('steps', updatedSteps);
    setShowAssignmentForm(false);
  };

  const createWorkflow = async (data) => {
    try {
      const res = await CreateWorkflow(data);
      toast.success(res?.data?.message);
      handleCloseForm();
      reset();
    } catch (error) {
      toast.error(error?.response?.data?.messaeg || error?.message);
    }
  };
  return (
    <div className="mx-auto bg-white">
      <h2 className="text-xl font-bold mb-4 text-center">Add Workflow</h2>

      <form onSubmit={handleSubmit(createWorkflow)}>
        {/* Workflow Name */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Workflow Name :
          </label>
          <input
            {...register('name', { required: true })}
            className="border p-2 sm:p-3 w-full rounded-md"
            placeholder="Enter workflow name"
          />
        </div>

        {/* Workflow Description */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Description :
          </label>
          <textarea
            {...register('description', { required: true })}
            className="border p-2 sm:p-3 w-full rounded-md"
            placeholder="Provide a brief description"
          />
        </div>

        {/* Steps Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Workflow Steps :</h3>

          {stepFields.map((step, stepIndex) => (
            <div
              key={step.id}
              className="border border-black p-7 rounded-md shadow-8 mb-4 relative bg-gray-100"
            >
              {/* Remove Step Button (Trash Icon) */}
              <button
                type="button"
                onClick={() => removeStep(stepIndex)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
              >
                <IconTrash size={20} />
              </button>

              {/* Step Name */}
              <label className="block text-sm font-semibold mb-2">
                Step Name :
              </label>
              <input
                {...register(`steps.${stepIndex}.stepName`, { required: true })}
                className="border p-2 sm:p-3 w-full rounded-md mb-2"
                placeholder={`Step ${stepIndex + 1} Name`}
              />

              {/* Assignments Section with Add Button */}
              <div className="flex justify-between items-center mt-4">
                <h4 className="text-sm font-semibold">Assignments :</h4>
                <button
                  type="button"
                  onClick={() => handleAddAssignment(stepIndex)}
                  className="text-blue-500 hover:text-blue-700 text-sm flex items-center border p-1 rounded-md px-5"
                >
                  <IconPlus size={14} className="mr-1" /> Add
                </button>
              </div>

              {/* Display Assignments */}
              {step.assignments && step.assignments.length > 0 ? (
                <div className="mt-2 border rounded-md">
                  {/* Scrollable Container */}
                  <div className="overflow-x-auto">
                    {/* Table Headers */}
                    <div className="min-w-[500px] grid grid-cols-4 gap-4 font-semibold text-sm bg-gray-200 p-2 border-b">
                      <span className="whitespace-nowrap">Assignee Type</span>
                      <span className="whitespace-nowrap">Action Type</span>
                      <span className="whitespace-nowrap">Assignee IDs</span>
                      <span className="whitespace-nowrap">Action</span>
                    </div>

                    {/* Assignment List */}
                    <ul className="min-w-[500px]">
                      {step.assignments.map((assignment, index) => (
                        <li
                          key={index}
                          className="grid grid-cols-4 gap-4 items-center p-2 text-sm border-b"
                        >
                          <span className="whitespace-nowrap">
                            {assignment.assigneeType}
                          </span>
                          <span className="whitespace-nowrap">
                            {assignment.actionType}
                          </span>
                          <span className="whitespace-nowrap">
                            {assignment.assigneeIds?.join(', ') || 'N/A'}
                          </span>
                          <span>
                            {/* Remove Assignment Button (Trash Icon) */}
                            <button
                              type="button"
                              className="text-gray-500 hover:text-red-500 ml-auto"
                              onClick={() => {
                                const updatedSteps = [...stepFields];
                                updatedSteps[stepIndex].assignments.splice(
                                  index,
                                  1,
                                );
                                setValue('steps', updatedSteps);
                              }}
                            >
                              <IconTrash size={18} />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm mt-2 italic border p-2 rounded-md">
                  No assignments added.
                </p>
              )}
            </div>
          ))}

          {/* Add Step Button */}
          <button
            type="button"
            onClick={() => appendStep({ stepName: '', assignments: [] })}
            className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center justify-center w-full"
          >
            <IconPlus className="mr-2" size={18} /> Add Step
          </button>
        </div>

        {/* Submit & Close Buttons */}

        <hr className="mt-15 border-t-2 border-gray-300" />

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
          <button
            type="button"
            onClick={handleCloseForm}
            className="border flex-1 py-2 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-green-600 flex-1 py-2 text-white rounded-md"
          >
            Submit
          </button>
        </div>
      </form>

      {/* Assignment Form as Modal */}
      {showAssignmentForm && (
        <AssignmentForm
          onSubmit={handleAssignmentSubmit}
          onClose={() => setShowAssignmentForm(false)}
        />
      )}
    </div>
  );
}

// Assignment Form (Modal)
function AssignmentForm({ onSubmit, onClose }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      assigneeType: 'USER',
      actionType: 'APPROVAL',
      assigneeIds: '',
    },
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white p-4 sm:p-6 rounded-md shadow-lg w-[90%] sm:w-2/3 max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-center">
          Add Assignment
        </h3>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Assignee Type */}
          <label className="block text-sm font-semibold mb-2">
            Assignee Type
          </label>
          <select
            {...register('assigneeType')}
            className="border p-2 sm:p-3 w-full rounded-md mb-3"
          >
            <option value="USER">User</option>
            <option value="ROLE">Role</option>
            <option value="DEPARTMENT">Department</option>
            <option value="UNIT">Unit</option>
          </select>

          {/* Assignee IDs */}
          <label className="block text-sm font-semibold mb-2">
            Assignee IDs
          </label>
          <input
            {...register('assigneeIds')}
            className="border p-2 sm:p-3 w-full rounded-md mb-3"
            placeholder="Enter assignee IDs (comma separated)"
          />

          {/* Action Type */}
          <label className="block text-sm font-semibold mb-2">
            Action Type
          </label>
          <input
            {...register('actionType')}
            className="border p-2 sm:p-3 w-full rounded-md mb-3"
            placeholder="Enter Action Type"
          />

          {/* Submit & Cancel Buttons */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="border px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 px-4 py-2 text-white rounded-md"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
