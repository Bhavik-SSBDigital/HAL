import React, { useEffect, useState } from 'react';
import {
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Grid,
  Box,
  TextField,
  Stack,
  CircularProgress,
  Autocomplete,
  Grid2,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Filefolders from '../Filefolders/Filefolders';
import { toast } from 'react-toastify';
import { useForm, Controller } from 'react-hook-form';
import TopLoader from '../../common/Loader/TopLoader';
import {
  AddRole,
  EditRoleById,
  getAllBranches,
  GetRoleDetailsById,
  GetRoles,
} from '../../common/Apis';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomCard from '../../CustomComponents/CustomCard';

export default function NewRole() {
  const { id } = useParams();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selection, setSelection] = useState({
    selectedView: [],
    selectedDownload: [],
    selectedUpload: [],
    fullAccess: [],
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      role: '',
      department: '',
      isAdmin: false,
      isDepartmentHead: false,
      parentRoleId: '',
      isRootLevel: false,
      selectedView: [],
      selectedDownload: [],
      selectedUpload: [],
      fullAccess: [],
    },
  });

  const getBranches = async () => {
    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const response = await getAllBranches();
      setBranches(response?.data?.departments || []);
    } catch (error) {
      console.error('Unable to fetch branches. Please try again.', error);
    }
  };

  const getRoles = async () => {
    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await GetRoles();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error fetching roles', error);
    }
  };

  const getEditDetails = async () => {
    setLoading(true);
    try {
      const res = await GetRoleDetailsById(id);
      const data = res.data.role;
      reset({
        ...data,
        isAdmin: data.isAdmin === true || data.isAdmin === 'true',
        isDepartmentHead:
          data.isDepartmentHead === true || data.isDepartmentHead === 'true',
        isRootLevel: data.isRootLevel || false,
        parentRoleId: data.parentRoleId || '',
      });
      setSelection({
        selectedView: data.selectedView || [],
        selectedDownload: data.selectedDownload || [],
        selectedUpload: data.selectedUpload || [],
        fullAccess: data.fullAccess || [],
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
      navigate('/roles/list');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      const combinedData = {
        ...data,
        ...selection,
        isRootLevel: data.isRootLevel || false,
        isAdmin: data.isAdmin || false,
        isDepartmentHead: data.isDepartmentHead || false,
        parentRoleId: data.parentRoleId || null,
      };
      const response = await (id
        ? EditRoleById(id, combinedData)
        : AddRole(combinedData));
      toast.success(response?.data?.message);
      navigate('/roles/list');
      reset();
      setSelection({
        selectedView: [],
        selectedDownload: [],
        selectedUpload: [],
        fullAccess: [],
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save role');
    }
  };

  useEffect(() => {
    if (id) {
      getEditDetails();
    }
    getBranches();
    getRoles();
  }, [id]);

  const isRootLevel = watch('isRootLevel');
  const isSuperAdmin =
    sessionStorage.getItem('isRootLevel') === 'true' &&
    sessionStorage.getItem('isAdmin') === 'true';

  useEffect(() => {
    if (isRootLevel) {
      setValue('department', '');
      setValue('isAdmin', false);
      setValue('isDepartmentHead', false);
      setValue('parentRoleId', '');
    }
  }, [isRootLevel, setValue]);

  return (
    <>
      {isSubmitting ? <TopLoader /> : null}
      <CustomCard className="max-w-4xl mx-auto">
        <h5 className="text-center text-2xl font-semibold">Role Details</h5>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <label className="block mb-1">User Role</label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <input {...field} className="w-full p-2 border rounded" />
              )}
            />
          </div>
          {!isSuperAdmin && (
            <div>
              <label className="block mb-1">Is Root Level?</label>
              <Controller
                name="isRootLevel"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Root Level"
                  />
                )}
              />
            </div>
          )}

          {!isRootLevel && (
            <>
              <div>
                <label className="block mb-1">Is Admin?</label>
                <Controller
                  name="isAdmin"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Admin"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block mb-1">Is Department Head?</label>
                <Controller
                  name="isDepartmentHead"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Department Head"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block mb-1">User Branch</label>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="w-full p-2 border rounded">
                      <option value="">None</option>
                      {branches?.map((data) => (
                        <option key={data.id} value={data.id}>
                          {data.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>

              <div>
                <label className="block mb-1">Parent Role</label>
                <Controller
                  name="parentRoleId"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="w-full p-2 border rounded">
                      <option value="">Select</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.role}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </>
          )}

          <div className="p-3 max-h-56 overflow-auto border border-black rounded">
            <Filefolders
              selection={selection}
              setSelection={setSelection}
              checkShow={true}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            <CustomButton
              disabled={isSubmitting || loading}
              click={handleSubmit(handleFormSubmit)}
              text={id ? 'Update' : 'Create'}
            />
            <Link to="/roles/list">
              <CustomButton
                variant={'danger'}
                text={'Cancel'}
                disabled={isSubmitting || loading}
                className={'w-full'}
              />
            </Link>
          </div>
        </div>
      </CustomCard>
    </>
  );
}
