import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Autocomplete, TextField as MuiTextField } from '@mui/material';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GetRoles } from '../../common/Apis';
import TopLoader from '../../common/Loader/TopLoader';

export default function NewUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      username: '',
      email: '',
      status: '',
      roles: [],
    },
  });
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data } = await GetRoles();
        setRoles(data.roles);
      } catch (error) {
        console.error(error);
      }
    };
    fetchRoles();
  }, []);

  const onSubmit = async (data) => {
    try {
      const url = id ? `${backendUrl}/editUser/${id}` : `${backendUrl}/signup`;
      await axios.post(url, data);
      toast.success(id ? 'User updated' : 'User created');
      navigate('/users/list');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error occurred');
    }
  };

  return (
    <>
      {isSubmitting && <TopLoader />}
      <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-4">User Details</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <Controller
                name="username"
                control={control}
                rules={{ required: 'Username is required' }}
                render={({ field }) => (
                  <input
                    {...field}
                    className="w-full p-2 border rounded"
                    placeholder="Username"
                  />
                )}
              />
              {errors.username && (
                <p className="text-red-500 text-sm">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                    message: 'Invalid email',
                  },
                }}
                render={({ field }) => (
                  <input
                    {...field}
                    className="w-full p-2 border rounded"
                    placeholder="Email"
                  />
                )}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>
            <div>
              <Controller
                name="status"
                control={control}
                rules={{ required: 'Status is required' }}
                render={({ field }) => (
                  <select {...field} className="w-full p-2 border rounded">
                    <option value="">Select Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                )}
              />
              {errors.status && (
                <p className="text-red-500 text-sm">{errors.status.message}</p>
              )}
            </div>
            <div>
              <Controller
                name="roles"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    options={roles}
                    getOptionLabel={(option) => option.role}
                    onChange={(_, value) =>
                      setValue(
                        'roles',
                        value.map((v) => v.id),
                      )
                    }
                    renderInput={(params) => (
                      <MuiTextField
                        {...params}
                        label="Roles"
                        variant="outlined"
                      />
                    )}
                  />
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-button-primary-default hover:bg-button-primary-hover text-white py-2 rounded"
              >
                {id ? 'Update' : 'Save'}
              </button>
              <Link to="/users/list">
                <button className="w-full border border-gray-400 py-2 rounded hover:bg-gray-100">
                  Cancel
                </button>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
