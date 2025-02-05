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
  FormControlLabel,
  Checkbox,
  Grid2,
} from '@mui/material';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function NewUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      username: '',
      email: '',
      status: '',
      department: '',
      roles: [],
      isRootLevel: false,
    },
  });
  const isRootLevel = watch('isRootLevel');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const depResponse = await axios.get(`${backendUrl}/departments`);
        setDepartments(depResponse.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const url = id ? `${backendUrl}/editUser/${id}` : `${backendUrl}/signup`;
      await axios.post(url, data);
      toast.success(id ? 'User updated' : 'User created');
      navigate('/users/list');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper style={{ padding: '20px', borderRadius: '10px' }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <Typography variant="body1">Username:</Typography>
            <Controller
              name="username"
              control={control}
              render={({ field }) => <TextField {...field} fullWidth />}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <Typography variant="body1">Email:</Typography>
            <Controller
              name="email"
              control={control}
              render={({ field }) => <TextField {...field} fullWidth />}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <Typography variant="body1">Status:</Typography>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select {...field} fullWidth>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              )}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <Typography variant="body1">Is Root Level:</Typography>
            <Controller
              name="isRootLevel"
              control={control}
              render={({ field }) => (
                <TextField {...field} select fullWidth>
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </TextField>
              )}
            />
          </Grid2>

          {!isRootLevel && (
            <>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Typography variant="body1">Department:</Typography>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} fullWidth>
                      {departments.map((dep) => (
                        <MenuItem key={dep.id} value={dep.id}>
                          {dep.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Typography variant="body1">Roles:</Typography>
                <Controller
                  name="roles"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} fullWidth multiple>
                      {roles.map((role) => (
                        <MenuItem key={role.id} value={role.id}>
                          {role.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </Grid2>
            </>
          )}
          <Grid2 size={{ xs: 12 }} sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              sx={{ maxWidth: 250, m: 1 }}
              fullWidth
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : id ? (
                'Update'
              ) : (
                'Save'
              )}
            </Button>
            <Link to="/users/list">
              <Button
                variant="contained"
                sx={{ maxWidth: 250, m: 1 }}
                fullWidth
              >
                Cancel
              </Button>
            </Link>
          </Grid2>
        </Grid2>
      </form>
    </Paper>
  );
}
