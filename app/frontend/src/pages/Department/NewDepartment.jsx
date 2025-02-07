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
import { getDepartments, getUsers } from '../../common/Apis';
import TopLoader from '../../common/Loader/TopLoader';

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
        console.log(data);
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
    <>
      {isSubmitting ? <TopLoader /> : null}
      <Paper style={{ padding: 20, margin: 'auto' }}>
        <Typography variant="h5" textAlign={'center'} mb={1}>
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
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={isSubmitting}
                >
                  {id ? 'Save Changes' : 'Create Department'}
                </Button>
              </Grid2>
            </Grid2>
          </form>
        )}
      </Paper>
    </>
  );
}
