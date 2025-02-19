import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import ShowWorkflow from '../../common/Workflow/ShowWorkflow';
import { CreateWorkflow, GetWorkflows } from '../../common/Apis';
import { toast } from 'react-toastify';
import { Autocomplete, TextField } from '@mui/material';

const staticApprovers = {
  USER: [
    { id: '1', name: 'User  A' },
    { id: '2', name: 'User  B' },
  ],
  ROLE: [
    { id: '3', name: 'Role X' },
    { id: '4', name: 'Role Y' },
  ],
  DEPARTMENT: [
    { id: '5', name: 'Department M' },
    { id: '6', name: 'Department N' },
  ],
  UNIT: [
    { id: '7', name: 'Unit P' },
    { id: '8', name: 'Unit Q' },
  ],
};

const Workflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, control, setValue, watch } = useForm({
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
  const [assignments, setAssignments] = useState([]);

  const handleAddAssignment = (stepIndex) => {
    setCurrentStepIndex(stepIndex);
    setShowAssignmentForm(true);
  };

  const handleAssignmentSubmit = (assignment) => {
    const updatedSteps = [...stepFields];
    updatedSteps[currentStepIndex].assignments = [
      ...(updatedSteps[currentStepIndex].assignments || []),
      assignment,
    ];
    setValue('steps', updatedSteps);
    setShowAssignmentForm(false);
  };

  const onSubmit = async (data) => {
    const formattedData = {
      name: data.name,
      description: data.description,
      createdById: data.createdById,
      steps: data.steps.map((step) => ({
        stepName: step.stepName,
        allowParallel: step.allowParallel,
        assignments: step.assignments.map((assignment) => ({
          assigneeType: assignment.assigneeType,
          assigneeIds: assignment.assigneeIds,
          actionType: assignment.actionType,
        })),
      })),
    };

    try {
      const res = await CreateWorkflow(formattedData);
      toast.success(res?.data?.message);
      setWorkflows([...workflows, res?.data?.data]);
      reset();
      setDialogOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  const filteredWorkflows = workflows.filter((workflow) =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {}, [selectedApproverType]);

  useEffect(() => {
    const getList = async () => {
      const res = await GetWorkflows();
      setWorkflows(res?.data?.workflows);
    };
    getList();
  }, []);

  return (
    <div className="p-6 bg-[#F1F5F9]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Workflows</h2>
        <button
          onClick={() => setDialogOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded transition duration-200 hover:bg-blue-700"
        >
          Add Workflow
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          disabled={workflows.length == 0}
          placeholder="Search Workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 w-full rounded bg-white"
        />
      </div>

      {filteredWorkflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-lg p-6 border border-gray-300">
          <h3 className="text-xl font-semibold text-gray-700">
            No Workflows Found
          </h3>
          <p className="text-gray-500 mt-2 text-center">
            Create your first workflow by clicking the "Add Workflow" button
            above.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow, index) => (
            <li
              key={index}
              className="bg-white shadow-lg rounded-lg p-5 hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105 border border-gray-200"
            >
              <h3 className="text-xl font-semibold text-gray-800">
                {workflow.name}
              </h3>
              <p className="text-gray-600 mt-2">{workflow.description}</p>
              <p className="text-gray-600 mt-2">Steps :</p>
              <ShowWorkflow workFlow={workflow?.versions[0]?.steps} />
            </li>
          ))}
        </ul>
      )}

      {/* form */}
      {dialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm z-50">
          <div className="bg-white border p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-6 text-center">Add Workflow</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  htmlFor="name"
                >
                  Workflow Name
                </label>
                <input
                  id="name"
                  {...register('name', { required: 'Name is required' })}
                  placeholder="Enter workflow name"
                  className={`border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  htmlFor="description"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  {...register('description', {
                    required: 'Description is required',
                  })}
                  placeholder="Provide a brief description"
                  className={`border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <input type="hidden" {...register('createdById')} />

              <div>
                <h3 className="text-lg font-semibold mb-4">Steps</h3>
                {stepFields.map((item, index) => (
                  <div key={item.id} className="border p-4 rounded-md mb-6">
                    <label
                      className="block text-sm font-semibold mb-2"
                      htmlFor={`steps.${index}.stepName`}
                    >
                      Step Name
                    </label>
                    <input
                      id={`steps.${index}.stepName`}
                      {...register(`steps.${index}.stepName`, {
                        required: 'Step name is required',
                      })}
                      placeholder="Enter step name"
                      className={`border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        errors.steps?.[index]?.stepName
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                    {errors.steps?.[index]?.stepName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.steps[index].stepName.message}
                      </p>
                    )}

                    <label className="block text-sm font-semibold mb-2">
                      Allow Parallel?
                    </label>
                    <select
                      {...register(`steps.${index}.allowParallel`)}
                      className="border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>

                    <h4 className="text-sm font-semibold mb-2 mt-4">
                      Assignments:
                    </h4>
                    {assignmentFields.map((assignmentItem, assignmentIndex) => (
                      <div
                        key={assignmentItem.id}
                        className="p-4 border rounded-md mb-4"
                      >
                        <label className="block text-sm font-semibold mb-2">
                          Assignee Type
                        </label>
                        <select
                          {...register(
                            `steps.${index}.assignments.${assignmentIndex}.assigneeType`,
                          )}
                          className="border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="USER">User</option>
                          <option value="ROLE">Role</option>
                          <option value="DEPARTMENT">Department</option>
                          <option value="UNIT">Unit</option>
                        </select>

                        <label className="block text-sm font-semibold mb-2 mt-3">
                          Assignee
                        </label>
                        <input
                          type="text"
                          {...register(
                            `steps.${index}.assignments.${assignmentIndex}.assigneeIds`,
                          )}
                          placeholder="Enter assignee ID"
                          className="border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />

                        <label className="block text-sm font-semibold mb-2 mt-3">
                          Action Type
                        </label>
                        <select
                          {...register(
                            `steps.${index}.assignments.${assignmentIndex}.actionType`,
                          )}
                          className="border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="APPROVAL">Approval</option>
                          <option value="REVIEW">Review</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeAssignment(assignmentIndex)}
                          className="text-red-500 text-sm hover:underline mt-3"
                        >
                          Remove Assignment
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        appendAssignment({
                          assigneeType: 'USER',
                          assigneeIds: [],
                          actionType: 'APPROVAL',
                        })
                      }
                      className="bg-blue-500 text-white px-6 py-2 rounded-md text-sm hover:bg-blue-600 mt-3"
                    >
                      + Add Assignment
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-red-500 text-sm hover:underline mt-4 w-full"
                    >
                      Remove Step
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    appendStep({
                      stepName: '',
                      allowParallel: false,
                      assignments: [
                        {
                          assigneeType: 'USER',
                          assigneeIds: [],
                          actionType: 'APPROVAL',
                        },
                      ],
                    })
                  }
                  className="bg-blue-500 text-white px-6 py-2 rounded-md text-sm hover:bg-blue-600"
                >
                  + Add Step
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-500 text-white px-6 py-2 rounded-md w-full hover:bg-green-600 mt-4"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>

            <button
              onClick={() => setDialogOpen(false)}
              className="mt-4 text-red-500 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflows;
