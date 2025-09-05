import {
  IconInfoCircle,
  IconPlus,
  IconSquareLetterX,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  CreateWorkflow,
  EditWorkflow,
  GetAllRoles,
  getDepartments,
  getRolesHierarchyInDepartment,
  GetUsersWithDetails,
} from '../../common/Apis';
import {
  Autocomplete,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormHelperText,
} from '@mui/material';
import TreeGraph from '../../components/TreeGraph';
import CustomButton from '../../CustomComponents/CustomButton';

export default function WorkflowForm({
  handleCloseForm,
  editData,
  setEditData,
  updateList,
}) {
  const [selectedNodes, setSelectedNodes] = useState([]);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm({
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
    const stepName = getValues(`steps.${currentStepIndex}.stepName`);

    // If assigneeType is DEPARTMENT, set the direction from selectedNodes
    if (assignment.assigneeType === 'DEPARTMENT' && selectedNodes.length > 0) {
      assignment.direction = selectedNodes[0]?.direction || null; // Use the direction from selectedNodes
    }

    updatedSteps[currentStepIndex].assignments = [
      ...(updatedSteps[currentStepIndex].assignments || []),
      { ...assignment, selectedRoles: selectedNodes },
    ];
    updatedSteps[currentStepIndex].stepName = stepName;
    setValue('steps', updatedSteps);
    setShowAssignmentForm(false);
  };
  const createWorkflow = async (data) => {
    if (!data?.steps || data.steps.length < 2) {
      toast.info('Please add at least two steps to proceed.');
      return;
    }

    if (data?.steps?.find((item) => item.assignments.length == 0)) {
      toast.info('Please add assignments');
      return;
    }
    try {
      const res = editData
        ? await EditWorkflow(editData?.id, data)
        : await CreateWorkflow(data);
      toast.success(res?.data?.message);
      updateList();
      handleCloseForm();
      reset();
      setEditData(null);
    } catch (error) {
      toast.error(error?.response?.data?.messaeg || error?.message);
    }
  };

  useEffect(() => {
    if (editData) {
      reset(editData);
    }

    console.log(editData);
  }, [editData]);
  return (
    <div className="mx-auto bg-white overflow-auto p-2">
      <h2 className="text-xl font-bold mb-4 text-center">Add Workflow</h2>

      <form onSubmit={handleSubmit(createWorkflow)}>
        {/* Workflow Name */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Workflow Name :
          </label>
          <input
            {...register('name', {
              required: 'Workflow name is required',
              pattern: {
                value: /^[a-zA-Z0-9\s_-]+$/, // letters, numbers, space, _ and -
                message: 'Special characters are not allowed',
              },
            })}
            className="border p-2 sm:p-3 w-full rounded-md"
            placeholder="Enter workflow name"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Workflow Description */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Description :
          </label>
          <textarea
            {...register('description')}
            required
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
                {...register(`steps.${stepIndex}.stepName`)}
                required
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
                    <table className="w-full text-sm">
                      {/* Table Head */}
                      <thead className="bg-gray-200 font-semibold">
                        <tr className="border-b">
                          <th className="p-2 text-left whitespace-nowrap">
                            Assignee Type
                          </th>
                          <th className="p-2 text-left whitespace-nowrap">
                            Action Type
                          </th>
                          {/* <th className="p-2 text-left whitespace-nowrap">
                            Access Type
                          </th> */}
                          <th className="p-2 text-left whitespace-nowrap">
                            Assignees
                          </th>
                          <th className="p-2 text-left whitespace-nowrap">
                            Action
                          </th>
                        </tr>
                      </thead>

                      {/* Table Body */}
                      <tbody>
                        {step.assignments.map((assignment, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 whitespace-nowrap">
                              {assignment.assigneeType}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              {assignment.actionType}
                            </td>
                            {/* <td className="p-2 whitespace-nowrap">
                              {assignment.accessTypes?.join(', ') || 'N/A'}
                            </td> */}
                            <td className="p-2 whitespace-nowrap">
                              {assignment.assigneeIds
                                .map(
                                  (item) =>
                                    item?.name || item?.username || item?.role,
                                )
                                .filter(Boolean)
                                .join(', ') || 'N/A'}
                            </td>
                            <td className="p-2 text-center">
                              {/* Remove Assignment Button (Trash Icon) */}
                              <button
                                type="button"
                                className="text-gray-500 hover:text-red-500"
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
            className="bg-button-secondary-default hover:bg-button-secondary-hover text-white px-4 py-2 rounded-md flex items-center justify-center w-full"
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
          <CustomButton
            type={'submit'}
            text={editData ? 'Update' : 'Submit'}
            className={'flex-1'}
          />
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
  function sortSelectedRolesByStep(data, selectedIds, direction) {
    const selectedSet = new Set(selectedIds);

    // Helper: find parent-child relationships
    function findParents(node) {
      const results = [];
      if (node.children) {
        for (const child of node.children) {
          if (selectedSet.has(child.id)) {
            results.push({ child: child.id, parent: node.id });
          }
          results.push(...findParents(child));
        }
      }
      return results;
    }

    // Gather all parent-child pairs
    let parentChildPairs = [];
    for (const root of data) {
      parentChildPairs = parentChildPairs.concat(findParents(root));
    }

    // Step 1: identify leaf nodes (selected with no selected children)
    const selectedWithChildren = new Set(
      parentChildPairs.map((pc) => pc.parent),
    );
    const leaves = Array.from(selectedSet).filter(
      (id) => !selectedWithChildren.has(id),
    );

    // Step 2: find selected parents of the selected leaves
    const parents = parentChildPairs
      .filter((pc) => leaves.includes(pc.child) && selectedSet.has(pc.parent))
      .map((pc) => pc.parent);

    const uniqueParents = [...new Set(parents)];

    // Map IDs to names
    const idToName = {};
    (function mapAll(nodes) {
      for (const n of nodes) {
        idToName[n.id] = n.name;
        if (n.children) mapAll(n.children);
      }
    })(data);

    // Build step-based output
    let stepGroups = [];

    if (leaves.length && uniqueParents.length) {
      stepGroups =
        direction === 'UPWARDS'
          ? [
              { step: 1, roles: leaves.map((id) => idToName[id]) },
              { step: 2, roles: uniqueParents.map((id) => idToName[id]) },
            ]
          : [
              { step: 1, roles: uniqueParents.map((id) => idToName[id]) },
              { step: 2, roles: leaves.map((id) => idToName[id]) },
            ];
    } else if (leaves.length) {
      stepGroups = [{ step: 1, roles: leaves.map((id) => idToName[id]) }];
    } else if (uniqueParents.length) {
      stepGroups = [
        { step: 1, roles: uniqueParents.map((id) => idToName[id]) },
      ];
    }

    // Return JSX UI
    return (
      <div>
        {stepGroups.map((group) => (
          <div key={group.step} className="text-sm text-gray-800 mb-1">
            <strong>Step {group.step}:</strong> {group.roles.join(', ')}
          </div>
        ))}
      </div>
    );
  }

  const { register, handleSubmit, watch, control, setValue } = useForm({
    defaultValues: {
      assigneeType: 'USER',
      actionType: 'APPROVAL',
      assigneeIds: [],
      // accessTypes: [],
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
    setValue('assigneeIds', []);
  }, [assigneeType]);

  // workflows
  const [currentPage, setCurrentPage] = useState(0);
  const [hierarchyData, setHierarchyData] = useState({});
  const [loading, setLoading] = useState(false);
  const selectedDepartments = departmentList.filter((dep) =>
    assigneeIds?.some((item) => item?.id == dep?.id),
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
        <div className="bg-white p-4 sm:p-6 rounded-md shadow-lg w-full max-w-2xl max-h-[95vh] overflow-auto">
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
              required
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
                  render={({ field }) => {
                    console.log(field);
                    const allSelected =
                      field.value?.length === userList?.length; // Check if all users are selected

                    // Add "Select All" option at the top
                    const enhancedOptions = [
                      {
                        id: 'all',
                        username: allSelected ? 'Deselect All' : 'Select All',
                      },
                      ...(userList || []),
                    ];

                    return (
                      <Autocomplete
                        multiple
                        className="mb-3"
                        size="small"
                        options={enhancedOptions}
                        getOptionLabel={(option) => option.username}
                        value={
                          allSelected
                            ? userList
                            : userList?.filter((u) =>
                                field.value.some((item) => item.id === u.id),
                              )
                        }
                        onChange={(_, value) => {
                          if (value.some((v) => v.id === 'all')) {
                            field.onChange(allSelected ? [] : userList); // Select/Deselect all
                          } else {
                            field.onChange(value); // Normal selection
                          }
                        }}
                        renderInput={(params) => (
                          <TextField {...params} variant="outlined" />
                        )}
                      />
                    );
                  }}
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
                  render={({ field }) => {
                    const allSelected =
                      field.value?.length === roleList?.length; // Check if all are selected

                    // Add "Select All" option at the top
                    const enhancedOptions = [
                      {
                        id: 'all',
                        role: allSelected ? 'Deselect All' : 'Select All',
                        departmentName: '',
                      },
                      ...(roleList || []),
                    ];

                    return (
                      <Autocomplete
                        multiple
                        className="mb-3"
                        size="small"
                        options={enhancedOptions}
                        getOptionLabel={(option) =>
                          option.id === 'all'
                            ? option.role
                            : `${option.role} (department - ${option.departmentName})`
                        }
                        value={
                          allSelected
                            ? roleList
                            : roleList?.filter(
                                (r) =>
                                  field.value.some((item) => item.id === r.id), // Compare full objects
                              )
                        }
                        onChange={(_, value) => {
                          if (value.some((v) => v.id === 'all')) {
                            field.onChange(allSelected ? [] : roleList); // Select/Deselect all
                          } else {
                            field.onChange(value); // Store full object instead of just IDs
                          }
                        }}
                        renderInput={(params) => (
                          <TextField {...params} variant="outlined" />
                        )}
                      />
                    );
                  }}
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
                  render={({ field }) => {
                    const allSelected =
                      field.value?.length === departmentList?.length; // Check if all are selected

                    const enhancedOptions = [
                      {
                        id: 'all',
                        name: allSelected ? 'Deselect All' : 'Select All',
                      },
                      ...(departmentList || []),
                    ];

                    return (
                      <Autocomplete
                        multiple
                        className="mb-3"
                        size="small"
                        options={enhancedOptions}
                        getOptionLabel={(option) =>
                          option.id === 'all'
                            ? option.name
                            : `${option.name} (code - ${option.id})`
                        }
                        value={
                          allSelected
                            ? departmentList
                            : departmentList?.filter(
                                (d) =>
                                  field.value.some((item) => item.id === d.id), // Compare full objects
                              )
                        }
                        onChange={(_, value) => {
                          if (value.some((v) => v.id === 'all')) {
                            field.onChange(allSelected ? [] : departmentList); // Select/Deselect all
                          } else {
                            field.onChange(value); // Store full objects instead of just IDs
                          }
                        }}
                        renderInput={(params) => (
                          <TextField {...params} variant="outlined" />
                        )}
                      />
                    );
                  }}
                />

                {assigneeIds?.length !== 0 ? (
                  <button
                    type="button"
                    className="bg-button-secondary-default hover:bg-button-secondary-hover rounded-md text-white p-2 border ml-auto block"
                    onClick={() => setOpenWorkflows(true)}
                  >
                    Select Roles
                  </button>
                ) : null}
                {selectedNodes && selectedNodes.length > 0 ? (
                  <>
                    <div className="flex mt-2 items-center bg-purple-100 border-l-4 border-purple-500 text-blue-800 p-3 rounded-md">
                      <IconInfoCircle size={20} className="mr-2" />
                      <span>
                        Selected roles will take part on behalf of the selected
                        department
                      </span>
                    </div>

                    <div className="mb-3 mt-1 border rounded-md overflow-x-auto">
                      <table className="min-w-[500px] w-full border-collapse">
                        {/* Table Head */}
                        <thead>
                          <tr className="bg-gray-200 text-sm font-semibold border-b">
                            <th className="p-2 text-left">Department Code</th>
                            <th className="p-2 text-left">Flow</th>
                            <th className="p-2 text-center">
                              Allow Parallel ( Process will be sent to all roles
                              at the same time )
                            </th>
                            <th className="p-2 text-center">Direction</th>
                          </tr>
                        </thead>

                        {/* Table Body */}
                        <tbody>
                          {selectedNodes.map((node, index) => (
                            <tr key={index} className="border-b text-sm">
                              <td className="p-3 whitespace-nowrap">
                                {node.department}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {sortSelectedRolesByStep(
                                  node.roles,
                                  node.roles.map((item) => item.id),
                                  node.direction,
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={node.allowParallel || false}
                                  onChange={(e) => {
                                    const updatedNodes = [...selectedNodes];
                                    updatedNodes[index] = {
                                      ...node,
                                      allowParallel: e.target.checked, // Toggle allowParallel
                                    };
                                    setSelectedNodes(updatedNodes); // Notify parent component
                                  }}
                                  className="cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <label className="block text-sm font-semibold mb-2">
                                  Direction Of Flow
                                </label>
                                <select
                                  value={node.direction || ''}
                                  onChange={(e) => {
                                    const updatedNodes = [...selectedNodes];
                                    updatedNodes[index] = {
                                      ...node,
                                      direction: e.target.value,
                                    };
                                    setSelectedNodes(updatedNodes);
                                  }}
                                  required
                                  className="border p-2 w-full rounded-sm mb-3"
                                >
                                  <option value="">Select Direction</option>
                                  <option value="UPWARDS">UPWARDS</option>
                                  <option value="DOWNWARDS">DOWNWARDS</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 my-3 text-sm mt-2 italic border p-2 rounded-md">
                    No Roles Selected.
                  </p>
                )}
              </>
            )}

            {/* Access Types Selection */}
            {/* <label className="block text-sm font-semibold mb-2">
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
            /> */}

            {/* Action Type */}
            <label className="block text-sm font-semibold mb-2">
              Action Type
            </label>
            <select
              {...register('actionType')}
              required
              className="border p-2 w-full rounded-sm mb-3"
            >
              <option value="APPROVAL">APPROVAL</option>
              <option value="REVIEW">VIEW</option>
              {/* <option value="RECOMMENDATION">RECOMMENDATION</option> */}
            </select>

            {/* Direction */}
            {/* {assigneeType.toLowerCase() == 'department' && (
              <>
                <label className="block text-sm font-semibold mb-2">
                  Direction Of Flow
                </label>
                <select
                  {...register('direction')}
                  required
                  className="border p-2 w-full rounded-sm mb-3"
                >
                  <option value="UPWARDS">UPWARDS</option>
                  <option value="DOWNWARDS">DOWNWARDS</option>
                </select>
              </>
            )} */}

            {/* Submit & Cancel Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setSelectedNodes([]);
                }}
                className="border px-4 py-2 rounded-md bg-button-danger-default hover:bg-button-danger-hover text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-button-primary-default hover:bg-button-primary-hover px-4 py-2 text-white rounded-md"
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
                setCurrentPage(0);
              }}
              className="absolute right-2 top-2"
            >
              <IconSquareLetterX />
            </button>
            {/* Show Single Department */}
            <div className="mb-4 max-h-[80vh] overflow-auto">
              <h3 className="font-bold">
                Department : {currentDepartment.name}
              </h3>

              {/* Show Hierarchy if Available */}
              <div className="mb-4 p-1">
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
