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
import { getDepartments, GetRoles, GetRootLevelRoles } from '../../common/Apis';
import TopLoader from '../../common/Loader/TopLoader';

export default function NewUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      username: '',
      email: '',
      status: '',
      roles: [],
    },
  });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  const fetchRoles = async () => {
    try {
      const { data } = await GetRoles();
      setRoles(data.roles);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
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
      {isSubmitting ? <TopLoader /> : null}

      <Paper style={{ padding: '20px', borderRadius: '10px' }}>
        <Typography variant="h5" textAlign={'center'} mb={1}>
          User Details
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12 }}>
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <TextField label="Username" {...field} fullWidth />
                )}
              />
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField label="Email" {...field} fullWidth />
                )}
              />
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <TextField label="Status" {...field} fullWidth>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </TextField>
                )}
              />
            </Grid2>

            <Grid2 size={{ xs: 12 }}>
              <Controller
                name="roles"
                control={control}
                render={({ field }) => (
                  <TextField select label="Roles" {...field} fullWidth multiple>
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.role}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid2>

            <Grid2 size={{ xs: 12, sm: 6 }} sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                fullWidth
                type="submit"
                disabled={isSubmitting}
              >
                {id ? 'Update' : 'Save'}
              </Button>
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }} sx={{ textAlign: 'center' }}>
              <Link to="/users/list">
                <Button variant="outlined" fullWidth>
                  Cancel
                </Button>
              </Link>
            </Grid2>
          </Grid2>
        </form>
      </Paper>
    </>
  );
}
