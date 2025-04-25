import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { toast } from 'react-toastify';
import axios from 'axios';
import ShowWorkflow from './ShowWorkflow';

export default function Workflow({
  workFlow,
  setWorkFlow,
  maxStepNumberReached,
}) {
  const token = sessionStorage.getItem('accessToken');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: { step: workFlow.length + 1, role: '' },
  });
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const getRoles = async () => {
      try {
        const { data } = await axios.post(`${backendUrl}/getRoles`, null, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoles(data.roles);
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };
    getRoles();
  }, []);

  const onSubmit = (data) => {
    if (!data.role) {
      toast.info('Please select a role');
      return;
    }
    setWorkFlow([...workFlow, { step: data.step, role: data.role }]);
    setValue('role', '');
  };

  const handleDelete = (index) => {
    setWorkFlow(workFlow.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="step"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full p-2 border rounded-md bg-gray-100"
            >
              {[...Array(workFlow.length + 1)].map((_, index) => (
                <option
                  key={index}
                  value={index + 1}
                  // disabled={
                  //   maxStepNumberReached && index + 1 <= maxStepNumberReached
                  // }
                >
                  {index + 1}
                </option>
              ))}
            </select>
          )}
        />
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full p-2 border rounded-md bg-gray-100"
            >
              <option value="" disabled>
                Select a role
              </option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.role}
                </option>
              ))}
            </select>
          )}
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded-md"
        >
          Add Step
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {/* {workFlow.map((item, index) => (
          <div
            key={index}
            className="p-4 border rounded-md flex justify-between items-center"
          >
            <div>
              <p>
                <strong>Step:</strong> {item.step}
              </p>
              <p>
                <strong>Role:</strong>{' '}
                {roles.find((r) => r._id === item.role)?.role || 'Unknown'}
              </p>
            </div>
            <button
              onClick={() => handleDelete(index)}
              className="text-red-500"
            >
              ✖
            </button>
          </div>
        ))} */}
        <ShowWorkflow workFlow={workFlow} handleDelete={handleDelete} />
      </div>
    </div>
  );
}
