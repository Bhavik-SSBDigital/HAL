import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import ShowWorkflow from '../../common/Workflow/ShowWorkflow';

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

const WorkflowManager = () => {
  const [workflows, setWorkflows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      createdById: 1,
      steps: [
        {
          stepName: '',
          allowParallel: false,
          assignments: [
            { assigneeType: 'USER', assigneeId: [], actionType: 'APPROVAL' },
          ],
        },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });

  const selectedApproverType = watch('steps');

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
          assigneeId: assignment.assigneeId,
          actionType: assignment.actionType,
        })),
      })),
    };

    setWorkflows([...workflows, formattedData]);
    reset();
    setDialogOpen(false);
  };

  const filteredWorkflows = workflows.filter((workflow) =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
              <ShowWorkflow workFlow={workflow.steps} />
            </li>
          ))}
        </ul>
      )}

      {/* form */}
      {dialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm z-50">
          <div className="bg-white border p-6 rounded-lg shadow-lg w-full max-w-lg top-[50%] left-[50%] max-h-[90vh] overflow-auto">
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
                {fields.map((item, index) => (
                  <div key={item.id} className="border p-4 rounded-md mb-6">
                    <div className="space-y-4">
                      <div>
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
                      </div>

                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          htmlFor={`steps.${index}.assignments.0.assigneeType`}
                        >
                          Assignee Type
                        </label>
                        <select
                          id={`steps.${index}.assignments.0.assigneeType`}
                          {...register(
                            `steps.${index}.assignments.0.assigneeType`,
                          )}
                          className="border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="USER">User</option>
                          <option value="ROLE">Role</option>
                          <option value="DEPARTMENT">Department</option>
                          <option value="UNIT">Unit</option>
                        </select>
                      </div>

                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          htmlFor={`steps.${index}.assignments.0.assigneeId`}
                        >
                          Assignee
                        </label>
                        <select
                          id={`steps.${index}.assignments.0.assigneeId`}
                          {...register(
                            `steps.${index}.assignments.0.assigneeId`,
                            {
                              required: 'Assignee is required',
                            },
                          )}
                          className={`border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            errors.steps?.[index]?.assignments?.[0]?.assigneeId
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                          multiple
                        >
                          {(
                            staticApprovers[
                              watch(`steps.${index}.assignments.0.assigneeType`)
                            ] || []
                          ).map((approver) => (
                            <option key={approver.id} value={approver.id}>
                              {approver.name}
                            </option>
                          ))}
                        </select>
                        {errors.steps?.[index]?.assignments?.[0]
                          ?.assigneeId && (
                          <p className="text-red-500 text-sm mt-1">
                            {
                              errors.steps[index].assignments[0].assigneeId
                                .message
                            }
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          htmlFor={`steps.${index}.assignments.0.actionType`}
                        >
                          Action Type
                        </label>
                        <select
                          id={`steps.${index}.assignments.0.actionType`}
                          {...register(
                            `steps.${index}.assignments.0.actionType`,
                          )}
                          className="border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="APPROVAL">Approval</option>
                          <option value="REVIEW">Review</option>
                        </select>
                      </div>

                      <div>
                        <label
                          className="block text-sm font-semibold mb-2"
                          htmlFor={`steps.${index}.allowParallel`}
                        >
                          Allow Parallel?
                        </label>
                        <select
                          id={`steps.${index}.allowParallel`}
                          {...register(`steps.${index}.allowParallel`)}
                          className="border p-3 w-full rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 text-sm hover:underline mt-4 mx-auto w-full"
                      >
                        Remove Step
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    append({
                      stepName: '',
                      allowParallel: false,
                      assignments: [
                        {
                          assigneeType: 'USER',
                          assigneeId: [],
                          actionType: 'APPROVAL',
                        },
                      ],
                    })
                  }
                  className="bg-blue-500 text-white px-6 py-2 rounded-md text-sm transition duration-200 hover:bg-blue-600"
                >
                  + Add Step
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-500 text-white px-6 py-2 rounded-md w-full transition duration-200 hover:bg-green-600 mt-4"
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

export default WorkflowManager;
