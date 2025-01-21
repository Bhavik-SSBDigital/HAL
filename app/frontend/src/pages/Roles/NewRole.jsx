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
} from '@mui/material';
import axios from 'axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Filefolders from '../Filefolders/Filefolders';
import { toast } from 'react-toastify';

export default function NewRole() {
  const { id } = useParams();
  // const { editObject, setEditObject } = sessionData();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [editObject, setEditObject] = useState({});
  const url = backendUrl + '/getAllBranches';
  const initialUser = {
    branch: '',
    role: '',
  };
  const [formData, setFormData] = useState({ ...initialUser });
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selection, setSelection] = useState({
    selectedView: [],
    selectedDownload: [],
    selectedUpload: [],
    // foldersWithFullPermission: [],
    fullAccess: [],
  });
  const getBranches = async () => {
    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setBranches(data.departments);
    } catch (error) {
      // Handle the error and show an alert
      // console.error('Error:', error);
      alert('Unable to fetch branches. Please try again.');
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  const navigate = useNavigate();
  const handleSubmit = async (editId) => {
    setLoading(true);
    const url =
      backendUrl +
      (Object.keys(editObject).length > 0 ? `/editRole/${editId}` : '/AddRole');

    try {
      let combinedData = {
        ...formData,
        ...selection,
      };

      const response = await axios.post(url, combinedData);

      if (response.status === 200) {
        setEditObject({});
        Object.keys(editObject).length > 0
          ? toast.success('Role edited')
          : toast.success('Role created');
        navigate('/roles/list');
        setLoading(false);
        setFormData({ ...initialUser });
      }
    } catch (error) {
      setLoading(false);
      // Handle the error and show an alert
      console.error('Error:', error);
      Object.keys(editObject).length > 0
        ? toast.error('Error editing role')
        : toast.error('Error creating role');
    }
  };
  const [loading, setLoading] = useState(false);

  const getEditDetails = async () => {
    setLoading(true);
    try {
      const url = backendUrl + `/getRole/${id}`;
      const res = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      if (res.status === 200) {
        setEditObject(res.data);
        setFormData(res.data);
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (id) {
      getEditDetails();
    }
    getBranches();
    const getRoles = async () => {
      try {
        const urlRole = backendUrl + '/getRoleNames';
        const accessToken = sessionStorage.getItem('accessToken');
        const { data } = await axios.post(urlRole, null, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        setRoles(data.roles);
      } catch (error) {
        console.error('error', error);
      }
    };
    getRoles();
  }, []);
  return (
    <>
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
              User Branch :
            </Typography>
            <FormControl fullWidth variant="outlined">
              {/* <InputLabel>User Branch</InputLabel> */}
              <Select
                name="branch"
                size="small"
                sx={{ backgroundColor: 'whitesmoke' }}
                value={formData.branch}
                onChange={handleInputChange}
                // label="branch"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {/* <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Deactive">Deactive</MenuItem> */}
                {branches?.map((data) => (
                  <MenuItem value={data.name}>{data.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              User Role:
            </Typography>
            <Autocomplete
              fullWidth
              id="role"
              size="small"
              sx={{ backgroundColor: 'whitesmoke' }}
              options={roles}
              freeSolo
              value={formData.role}
              onInputChange={(event, newValue) =>
                handleInputChange({
                  target: { name: 'role', value: newValue },
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  // onChange={handleInputChange}
                />
              )}
            />
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <p style={{ fontWeight: 500, fontSize: 17 }}>
              Select permissions :
            </p>

            <Box
              sx={{
                padding: '10px',
                maxHeight: '350px',
                overflow: 'auto',
                border: '1px solid black',
                borderRadius: '5px',
              }}
            >
              {Object.keys(editObject).length > 0 ? (
                <Filefolders
                  selection={selection}
                  setSelection={setSelection}
                  checkShow={true}
                  id={formData._id}
                />
              ) : (
                <Filefolders
                  selection={selection}
                  setSelection={setSelection}
                  checkShow={true}
                  id={null}
                />
              )}
            </Box>
          </Grid2>
          <Grid2 size={{ xs: 12 }} sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              color="success"
              disabled={loading}
              onClick={() =>
                Object.keys(editObject).length > 0
                  ? handleSubmit(editObject._id)
                  : handleSubmit()
              }
              sx={{ margin: '5px', width: '150px' }}
            >
              {Object.keys(editObject).length > 0 ? 'update' : 'Save'}
            </Button>
            <Link to="/roles/list">
              <Button
                variant="contained"
                color="error"
                disabled={loading}
                sx={{ margin: '5px', width: '150px' }}
              >
                Cancel
              </Button>
            </Link>
          </Grid2>
        </Grid2>
        {loading && (
          <Stack
            justifyContent="center"
            alignItems="center"
            sx={{ width: '100%', m: 1 }}
          >
            <CircularProgress color="inherit" size={30} />
          </Stack>
        )}
        {/* </Paper> */}
      </div>
    </>
  );
}
