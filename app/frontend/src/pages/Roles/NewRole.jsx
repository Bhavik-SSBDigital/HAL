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
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Filefolders from '../Filefolders/Filefolders';
import { toast } from 'react-toastify';
import { useForm, Controller } from 'react-hook-form';
import TopLoader from '../../common/Loader/TopLoader';
import { GetRoles } from '../../common/Apis';

export default function NewRole() {
  const { id } = useParams();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [editObject, setEditObject] = useState({});
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
      const { data } = await axios.post(`${backendUrl}/getAllBranches`, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setBranches(data.departments);
    } catch (error) {
      alert('Unable to fetch branches. Please try again.');
    }
  };

  const getRoles = async () => {
    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await GetRoles();
      setRoles(data.roles);
    } catch (error) {
      console.error('Error', error);
    }
  };

  const getEditDetails = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${backendUrl}/getRole/${id}`, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      if (res.status === 200) {
        const data = res.data;
        setEditObject(data);
        reset(data); // Populate form with edit data
        setSelection({
          selectedView: data.selectedView || [],
          selectedDownload: data.selectedDownload || [],
          selectedUpload: data.selectedUpload || [],
          fullAccess: data.fullAccess || [],
        });
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data) => {
    const url =
      backendUrl +
      (Object.keys(editObject).length > 0 ? `/editRole/${id}` : '/AddRole');
    try {
      const combinedData = {
        ...data,
        ...selection,
        isRootLevel: data.isRootLevel || false,
        parentRoleId: data.parentRoleId || null,
      };

      const response = await axios.post(url, combinedData);

      if (response.status === 200) {
        setEditObject({});
        Object.keys(editObject).length > 0
          ? toast.success('Role edited')
          : toast.success('Role created');
        navigate('/roles/list');
        reset();
        setSelection({
          selectedView: [],
          selectedDownload: [],
          selectedUpload: [],
          fullAccess: [],
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Object.keys(editObject).length > 0
        ? toast.error('Error editing role')
        : toast.error('Error creating role');
    }
  };

  useEffect(() => {
    if (id) {
      getEditDetails();
    }
    getBranches();
    getRoles();
  }, [id]);

  const [isRootLevel] = watch(['isRootLevel']);

  useEffect(() => {
    setValue('department', '');
  }, [isRootLevel]);
  return (
    <>
      {isSubmitting ? <TopLoader /> : null}
      <div
        style={{
          width: '100%',
          backgroundColor: 'white',
          padding: '25px',
          border: '1px solid lightgray',
          borderRadius: '10px',
          boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
        }}
      >
        <Grid2 container spacing={2} mt={1}>
          <Grid2 size={{ xs: 12 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Is Root Level:
            </Typography>
            <FormControl fullWidth variant="outlined">
              <Controller
                name="isRootLevel"
                control={control}
                render={({ field }) => (
                  <Select {...field}>
                    <MenuItem value={true}>Yes</MenuItem>
                    <MenuItem value={false}>No</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
          </Grid2>
          {isRootLevel ? null : (
            <>
              <Grid2 size={{ xs: 12 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  User Branch :
                </Typography>
                <FormControl fullWidth variant="outlined">
                  <Controller
                    name="department"
                    control={control}
                    render={({ field }) => (
                      <Select {...field}>
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {branches?.map((data) => (
                          <MenuItem value={data.id} key={data.id}>
                            {data.name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid2>
            </>
          )}

          <Grid2 size={{ xs: 12 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              User Role:
            </Typography>

            <Controller
              name="role"
              control={control}
              render={({ field }) => <TextField {...field} fullWidth />}
            />
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Parent Role:
            </Typography>
            <Controller
              name="parentRoleId"
              control={control}
              render={({ field }) => (
                <TextField select {...field} fullWidth>
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.role}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Select permissions:
            </Typography>
            <Box
              sx={{
                padding: '10px',
                maxHeight: '350px',
                overflow: 'auto',
                border: '1px solid black',
                borderRadius: '5px',
              }}
            >
              <Filefolders
                selection={selection}
                setSelection={setSelection}
                checkShow={true}
              />
            </Box>
          </Grid2>

          <Grid2 size={{ xs: 12 }} sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              onClick={handleSubmit(handleFormSubmit)}
              sx={{ margin: '5px', maxWidth: '250px' }}
            >
              {Object.keys(editObject).length > 0 ? 'Update' : 'Save'}
            </Button>
            <Link to="/roles/list">
              <Button
                fullWidth
                variant="contained"
                disabled={isSubmitting}
                sx={{ margin: '5px', maxWidth: '250px' }}
              >
                Cancel
              </Button>
            </Link>
          </Grid2>
        </Grid2>
      </div>
    </>
  );
}
