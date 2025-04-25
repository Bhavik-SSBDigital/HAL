import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  createDepartment,
  editDepartment,
  getDepartmentbyID,
  getDepartments,
} from '../../common/Apis';
import CustomCard from '../../CustomComponents/CustomCard';
import CustomButton from '../../CustomComponents/CustomButton';

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

    const fetchDepartmentById = async (id) => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await getDepartmentbyID(id);
        reset(response.data.department);
      } catch (error) {
        toast.error(error?.response?.data?.message || error?.message);
        navigate('/departments/list');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDepartmentById(id);
    }
  }, [id, backendUrl, token, reset]);

  const onSubmit = async (formData) => {
    setLoading(true);

    try {
      let response;

      if (id) {
        response = await editDepartment(id, formData);
      } else {
        response = await createDepartment(formData);
      }

      toast.success(response?.data?.message);
      navigate('/departments/list');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomCard className={'max-w-4xl mx-auto'}>
      <h2 className="text-2xl font-semibold text-center mb-4">
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
            <CustomButton
              type="submit"
              disabled={isSubmitting || loading}
              className={'w-full'}
              text={id ? 'Save Changes' : 'Create Department'}
            />
            <CustomButton
              type="button"
              variant={'info'}
              className={'w-full'}
              click={() => navigate('/roles/createNew')}
              disabled={isSubmitting || loading}
              text={'Redirect to create role'}
            />
          </div>
        </form>
      )}
    </CustomCard>
  );
}
