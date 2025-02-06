import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Grid,
  CircularProgress,
  Grid2,
} from '@mui/material';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getUsers } from '../../common/Apis';

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
      adminId: '',
    },
  });

  const [departments, setDepartments] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/getDepartmentNames`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDepartments(data.names);
      } catch (error) {
        console.error('Error fetching departments', error);
      }
    };

    const fetchAdmins = async () => {
      try {
        const { data } = await getUsers();
        setAdmins(data.data);
      } catch (error) {
        console.error('Error fetching admins', error);
      }
    };

    fetchDepartments();
    fetchAdmins();

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
      toast.success(
        id
          ? 'Department updated successfully'
          : 'Department created successfully',
      );
      navigate('/departments/list');
    } catch (error) {
      toast.error(
        id ? 'Failed to update department' : 'Failed to create department',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper style={{ padding: 20, margin: 'auto' }}>
      <Typography variant="h6" align="center" gutterBottom>
        {id ? 'Edit Department' : 'Add Department'}
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12 }}>
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Department Name"
                    variant="outlined"
                    required
                  />
                )}
              />
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Department Code"
                    variant="outlined"
                    required
                  />
                )}
              />
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Parent Department</InputLabel>
                <Controller
                  name="parentDepartmentId"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="Parent Department">
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {departments.map((dept) => (
                        <MenuItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Admin</InputLabel>
                <Controller
                  name="adminId"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="Admin">
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {admins.map((admin) => (
                        <MenuItem key={admin.id} value={admin.id}>
                          {admin.username}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} />
                ) : id ? (
                  'Save Changes'
                ) : (
                  'Create Department'
                )}
              </Button>
            </Grid2>
          </Grid2>
        </form>
      )}
    </Paper>
  );
}
