import { IconPlus, IconSquareLetterX, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  CreateWorkflow,
  GetAllRoles,
  getDepartments,
  getRolesHierarchyInDepartment,
  GetUsersWithDetails,
} from '../../common/Apis';
import { Autocomplete, TextField } from '@mui/material';
import TreeGraph from '../../components/TreeGraph';

export default function WorkflowForm({ handleCloseForm }) {
  const [selectedNodes, setSelectedNodes] = useState([]);
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
    console.log(assignment);
    const updatedSteps = [...stepFields];
    updatedSteps[currentStepIndex].assignments = [
      ...(updatedSteps[currentStepIndex].assignments || []),
      { ...assignment, selectedRoles: selectedNodes },
    ];
    console.log(updatedSteps);
    setValue('steps', updatedSteps);
    setShowAssignmentForm(false);
  };

  const createWorkflow = async (data) => {
    if (data?.steps?.length == 0) {
      toast.info('Please add steps to continue');
      return;
    }
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
                    <div className="min-w-[500px] grid grid-cols-5 gap-4 font-semibold text-sm bg-gray-200 p-2 border-b">
                      <span className="whitespace-nowrap">Assignee Type</span>
                      <span className="whitespace-nowrap">Action Type</span>
                      <span className="whitespace-nowrap">Access Type</span>
                      <span className="whitespace-nowrap">Assignee IDs</span>
                      <span className="whitespace-nowrap">Action</span>
                    </div>

                    {/* Assignment List */}
                    <ul className="min-w-[500px]">
                      {step.assignments.map((assignment, index) => (
                        <li
                          key={index}
                          className="grid grid-cols-5 gap-4 items-center p-2 text-sm border-b"
                        >
                          <span className="whitespace-nowrap">
                            {assignment.assigneeType}
                          </span>
                          <span className="whitespace-nowrap">
                            {assignment.actionType}
                          </span>
                          <span className="whitespace-nowrap">
                            {assignment.accessTypes?.join(', ') || 'N/A'}
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
            onClick={() => {
              handleCloseForm();
            }}
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
          setSelectedNodes={setSelectedNodes}
          selectedNodes={selectedNodes}
        />
      )}
    </div>
  );
}

// Assignment Form (Modal)
function AssignmentForm({
  onSubmit,
  onClose,
  setSelectedNodes,
  selectedNodes,
}) {
  const { register, handleSubmit, watch, control } = useForm({
    defaultValues: {
      assigneeType: 'USER',
      actionType: 'APPROVAL',
      assigneeIds: [],
      accessTypes: [],
      direction: null,
    },
  });
  const [departmentsAndRoles, setDepartmentsAndRoles] = useState([]);
  const [assigneeType, assigneeIds] = watch(['assigneeType', 'assigneeIds']);
  const [openWorkflows, setOpenWorkflows] = useState(false);

  // network calls
  const [userList, setUserList] = useState([]);
  const GetUserList = async () => {
    const response = await GetUsersWithDetails();
    setUserList(response?.data);
  };

  const [roleList, setRoleList] = useState([]);
  const GetRoleList = async () => {
    const response = await GetAllRoles();
    setRoleList(response?.data?.roles);
  };

  const [departmentList, setDepartmentList] = useState([]);
  const GetDepartmentList = async () => {
    const response = await getDepartments();
    setDepartmentList(response?.data?.departments);
  };

  useEffect(() => {
    if (userList.length == 0 && assigneeType?.toLowerCase() == 'user') {
      GetUserList();
    } else if (roleList.length == 0 && assigneeType?.toLowerCase() == 'role') {
      GetRoleList();
    } else if (
      departmentList.length == 0 &&
      assigneeType?.toLowerCase() == 'department'
    ) {
      GetDepartmentList();
    }
  }, [assigneeType]);

  // workflows
  const [currentPage, setCurrentPage] = useState(0);
  const [hierarchyData, setHierarchyData] = useState({});
  const [loading, setLoading] = useState(false);
  const selectedDepartments = departmentList.filter((dep) =>
    assigneeIds?.includes(dep?.id),
  );

  const currentDepartment = selectedDepartments?.[currentPage];

  useEffect(() => {
    const fetchHierarchy = async () => {
      if (!currentDepartment || hierarchyData[currentDepartment.id]) return;

      try {
        setLoading(true);
        const response = await getRolesHierarchyInDepartment(
          currentDepartment.id,
        );
        setHierarchyData((prev) => ({
          ...prev,
          [currentDepartment.id]: response.data.data,
        }));
      } catch (error) {
        toast.error(
          error?.response?.data?.message || 'Failed to load hierarchy',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, [currentDepartment]);

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 px-4">
        <div className="bg-white p-4 sm:p-6 rounded-md shadow-lg w-[90%] sm:w-2/3 max-w-md max-h-[95vh] overflow-auto">
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
              className="border p-2 w-full rounded-sm mb-3"
            >
              <option value="USER">User</option>
              <option value="ROLE">Role</option>
              <option value="DEPARTMENT">Department</option>
            </select>

            {/* Assignee Selection */}
            {assigneeType?.toLowerCase() === 'user' && (
              <>
                <label className="block text-sm font-semibold mb-2">
                  Users
                </label>
                <Controller
                  name="assigneeIds"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      className="mb-3"
                      size="small"
                      options={userList || []}
                      getOptionLabel={(option) => option.username}
                      onChange={(_, value) =>
                        field.onChange(value.map((v) => v.id))
                      }
                      renderInput={(params) => (
                        <TextField {...params} variant="outlined" />
                      )}
                    />
                  )}
                />
              </>
            )}

            {assigneeType?.toLowerCase() === 'role' && (
              <>
                <label className="block text-sm font-semibold mb-2">
                  Roles
                </label>
                <Controller
                  name="assigneeIds"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      className="mb-3"
                      size="small"
                      options={roleList || []}
                      getOptionLabel={(option) =>
                        `${option.role} (department - ${option.departmentName})`
                      }
                      onChange={(_, value) =>
                        field.onChange(value.map((v) => v.id))
                      }
                      renderInput={(params) => (
                        <TextField {...params} variant="outlined" />
                      )}
                    />
                  )}
                />
              </>
            )}

            {assigneeType.toLowerCase() === 'department' && (
              <>
                <label className="block text-sm font-semibold mb-2">
                  Departments
                </label>
                <Controller
                  name="assigneeIds"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      className="mb-3"
                      size="small"
                      options={departmentList || []}
                      getOptionLabel={(option) =>
                        `${option.name} (code - ${option.id})`
                      }
                      onChange={(_, value) =>
                        field.onChange(value.map((v) => v.id))
                      }
                      renderInput={(params) => (
                        <TextField {...params} variant="outlined" />
                      )}
                    />
                  )}
                />

                {assigneeIds?.length !== 0 ? (
                  <button
                    type="button"
                    className="bg-blue-500 rounded-md text-white p-2 border ml-auto block hover:bg-blue-600"
                    onClick={() => setOpenWorkflows(true)}
                  >
                    Select Roles
                  </button>
                ) : null}
                {selectedNodes && selectedNodes.length > 0 ? (
                  <div className="mb-3 mt-1 border rounded-md">
                    {/* Scrollable Container */}
                    <div className="overflow-x-auto">
                      {/* Table Headers */}
                      <div className="min-w-[500px] grid grid-cols-2 gap-4 font-semibold text-sm bg-gray-200 p-2 border-b">
                        <span className="whitespace-nowrap">
                          Department Code
                        </span>
                        <span className="whitespace-nowrap">Flow</span>
                      </div>

                      {/* Assignment List */}
                      <ul className="min-w-[500px]">
                        {selectedNodes.map((node, index) => (
                          <li
                            key={index}
                            className="grid grid-cols-2 gap-4 items-center p-2 text-sm border-b"
                          >
                            <span className="whitespace-nowrap">
                              {node.department}
                            </span>
                            <span className="whitespace-nowrap">
                              {node.roles.join(' -> ')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 my-3 text-sm mt-2 italic border p-2 rounded-md">
                    No Roles Selected.
                  </p>
                )}
              </>
            )}

            {/* Access Types Selection */}
            <label className="block text-sm font-semibold mb-2">
              Access Type
            </label>
            <Controller
              name="accessTypes"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  className="mb-3"
                  size="small"
                  options={['READ', 'EDIT', 'DOWNLOAD']}
                  onChange={(_, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField {...params} variant="outlined" />
                  )}
                />
              )}
            />

            {/* Action Type */}
            <label className="block text-sm font-semibold mb-2">
              Action Type
            </label>
            <select
              {...register('actionType')}
              className="border p-2 w-full rounded-sm mb-3"
            >
              <option value="APPROVAL">APPROVAL</option>
              <option value="VIEW">VIEW</option>
              <option value="RECOMMENDATION">RECOMMENDATION</option>
            </select>

            {/* Direction */}
            {assigneeType.toLowerCase() == 'department' && (
              <>
                <label className="block text-sm font-semibold mb-2">
                  Direction Of Flow
                </label>
                <select
                  {...register('direction')}
                  className="border p-2 w-full rounded-sm mb-3"
                >
                  <option value="UPWARDS">UPWARDS</option>
                  <option value="DOWNWARDS">DOWNWARDS</option>
                </select>
              </>
            )}

            {/* Submit & Cancel Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setSelectedNodes([]);
                }}
                className="border px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 text-white rounded-md"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>

      {openWorkflows && currentDepartment && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white p-8 rounded-md shadow-lg w-full max-w-xl relative">
            <button
              onClick={() => {
                setOpenWorkflows(false);
              }}
              className="absolute right-2 top-2"
            >
              <IconSquareLetterX />
            </button>
            {/* Show Single Department */}
            <div className="mb-4 p-4 max-h-[80vh] overflow-auto">
              <h3 className="font-bold">
                Department : {currentDepartment.name}
              </h3>

              {/* Show Hierarchy if Available */}
              <div className="mb-4 p-4">
                {/* Show Hierarchy in TreeGraph */}
                <TreeGraph
                  data={hierarchyData[currentDepartment.id] || []}
                  loading={loading}
                  controls={true}
                  departmentId={currentDepartment.id}
                  onHierarchyUpdate={(value) => setSelectedNodes(value)}
                  selectedNodes={selectedNodes}
                />
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                disabled={currentPage === 0}
                className={`px-3 py-1 border rounded ${
                  currentPage === 0 ? 'opacity-50' : ''
                }`}
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    prev + 1 < departmentList.length ? prev + 1 : prev,
                  )
                }
                disabled={currentPage + 1 >= departmentList.length}
                className={`px-3 py-1 border rounded ${
                  currentPage + 1 >= departmentList.length ? 'opacity-50' : ''
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
