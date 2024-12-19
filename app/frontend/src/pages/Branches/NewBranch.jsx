import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useForm, Controller } from 'react-hook-form';

const NewBranch = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { id } = useParams();
  const navigate = useNavigate();
  const [editObject, setEditObject] = useState({});
  const [loading, setLoading] = useState(false);

  // React Hook Form setup
  const {
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      code: 0,
      name: '',
      status: 'Active',
      isHeadOffice: false,
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      const url =
        backendUrl +
        (Object.keys(editObject).length > 0
          ? `/editBranch/${editObject._id}`
          : '/createBranch');
      const accessToken = sessionStorage.getItem('accessToken');

      const response = await axios.post(url, data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 200) {
        toast.success(
          Object.keys(editObject).length > 0
            ? 'Branch is edited'
            : 'Branch is created',
        );
        setEditObject({});
        setLoading(false);
        navigate('/branches/list');
        reset();
      } else {
        setLoading(false);
        toast.error('Error');
      }
    } catch (error) {
      setLoading(false);
      toast.error('Something went wrong');
    }
  };

  const getEditDetails = async () => {
    setLoading(true);
    try {
      const url = backendUrl + `/getBranch/${id}`;
      const res = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      if (res.status === 200) {
        setEditObject(res.data);
        for (const [key, value] of Object.entries(res.data)) {
          setValue(key, value); // Populate form fields
        }
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) getEditDetails();
  }, []);

  return (
    <div
      style={{
        width: '100%',
        maxHeight: 'fit-content',
        backgroundColor: 'white',
        padding: '20px',
        border: '1px solid lightgray',
        borderRadius: '10px',
        boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack alignItems="center" m="20px 0" gap={5}>
          <Controller
            name="code"
            control={control}
            rules={{ required: 'Branch code is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Branch Code"
                type="number"
                fullWidth
                inputProps={{ min: '0' }}
                sx={{ backgroundColor: 'whitesmoke' }}
                error={!!errors.code}
                helperText={errors.code?.message}
              />
            )}
          />

          <Controller
            name="name"
            control={control}
            rules={{ required: 'Branch name is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Branch Name"
                sx={{ backgroundColor: 'whitesmoke' }}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />

          <Controller
            name="status"
            control={control}
            rules={{ required: 'Status is required' }}
            render={({ field }) => (
              <FormControl fullWidth>
                <TextField
                  select
                  label="Status"
                  {...field}
                  displayEmpty
                  sx={{ backgroundColor: 'whitesmoke' }}
                  error={!!errors.status}
                >
                  <MenuItem value="">
                    <em>Select Status</em>
                  </MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Deactive">Deactive</MenuItem>
                </TextField>
                {errors.status && (
                  <p style={{ color: 'red' }}>{errors.status?.message}</p>
                )}
              </FormControl>
            )}
          />

          <Controller
            name="isHeadOffice"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <TextField
                  select
                  {...field}
                  label="Is Headoffice?"
                  sx={{ backgroundColor: 'whitesmoke' }}
                  error={!!errors.isHeadOffice}
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </TextField>
                {errors.isHeadOffice && (
                  <p style={{ color: 'red' }}>{errors.isHeadOffice?.message}</p>
                )}
              </FormControl>
            )}
          />

          <Stack spacing={2} direction="row" justifyContent="center">
            <Button
              type="submit"
              variant="contained"
              color="success"
              sx={{ width: '150px' }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={26} />
              ) : Object.keys(editObject).length > 0 ? (
                'Update'
              ) : (
                'Save'
              )}
            </Button>

            <Link to="/branches/list">
              <Button
                variant="contained"
                sx={{ width: '150px' }}
                color="error"
                disabled={loading}
              >
                Cancel
              </Button>
            </Link>
          </Stack>
        </Stack>
      </form>
    </div>
  );
};

export default NewBranch;
