import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getDepartments } from '../../common/Apis';

export default function NewDepartment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = sessionStorage.getItem('accessToken');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      department: '',
      code: '',
      type: 'department',
      parentDepartmentId: '',
    },
  });

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data } = await getDepartments();
        setDepartments(data?.departments);
      } catch (error) {
        console.error('Error fetching departments', error);
      }
    };

    fetchDepartments();

    if (id) {
      setLoading(true);
      axios
        .get(`${backendUrl}/getDepartment/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(({ data }) => {
          reset(data.department);
        })
        .catch((error) =>
          console.error('Error fetching department details', error),
        )
        .finally(() => setLoading(false));
    }
  }, [id, backendUrl, token, reset]);

  const onSubmit = async (formData) => {
    setLoading(true);
    const url = id
      ? `${backendUrl}/editDepartment/${id}`
      : `${backendUrl}/addDepartment`;
    try {
      const response = await axios.post(url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(response?.data?.message);
      navigate('/departments/list');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold text-center mb-4">
        {id ? 'Edit Department' : 'Add Department'}
      </h2>
      {loading ? (
        <div className="flex justify-center items-center">
          <div className="loader"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div>
            <label className="block text-gray-700">Department Name</label>
            <Controller
              name="department"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  className="w-full p-2 border rounded"
                  required
                />
              )}
            />
          </div>
          <div>
            <label className="block text-gray-700">Department Code</label>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  className="w-full p-2 border rounded"
                  required
                />
              )}
            />
          </div>
          <div>
            <label className="block text-gray-700">Parent Department</label>
            <Controller
              name="parentDepartmentId"
              control={control}
              render={({ field }) => (
                <select {...field} className="w-full p-2 border rounded">
                  <option value="">None</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="w-full bg-button-primary-default hover:bg-button-primary-hover text-white p-2 rounded"
              disabled={isSubmitting}
            >
              {id ? 'Save Changes' : 'Create Department'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/roles/createNew')}
              className="w-full borde bg-button-info-default hover:bg-button-info-hover p-2 rounde text-white"
              disabled={isSubmitting}
            >
              Redirect to create role
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
