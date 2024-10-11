import React, { useEffect, useState } from 'react';
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
  Box,
  CircularProgress,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import axios from 'axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
// import Sidedrawer from "../drawer/Sidedrawer";
import { toast } from 'react-toastify';
// import useStoreData, { sessionData } from "../../Store";

export default function NewUser() {
  const { id } = useParams();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [editObject, setEditObject] = useState({});
  const url = backendUrl + '/getAllBranches';
  const urlRole = backendUrl + '/getRolesInBranch/';
  const initialUser = {
    name: '',
    username: '',
    branch: '',
    role: '',
    email: '',
    status: '',
  };
  // const { editObject, setEditObject } = sessionData();
  const [formData, setFormData] = useState({ ...initialUser });
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [specialUserCheck, setSpecialUserCheck] = useState(false);
  // console.log(JSON.stringify(roles) + 'roles');
  const handleSelectSpecialUser = (e) => {
    if (e.target.checked) {
      setFormData((prev) => ({ ...prev, branch: 'headOffice' }));
      setSpecialUserCheck(true);
    } else {
      setSpecialUserCheck(false);
    }
  };

  const [physicalDocsCheck, setPhysicalDocsCheck] = useState(false);
  const handleSelectPhysicalDocs = (e) => {
    console.log(e.target.checked);
    if (e.target.checked) {
      //   setFormData((prev) => ({ ...prev, branch: 'headOffice' }));
      setPhysicalDocsCheck(true);
    } else {
      setPhysicalDocsCheck(false);
    }
  };
  const getBranches = async () => {
    const accessToken = sessionStorage.getItem('accessToken');
    const { data } = await axios.post(url, null, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    setBranches(data.branches);
    return data.branches;
  };
  const getRoles = async (id) => {
    const accessToken = sessionStorage.getItem('accessToken');
    const { data } = await axios.post(urlRole + `${id}`, null, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    setRoles(data.roles);
  };
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    if (name === 'branch') {
      if (value) {
        const { _id } = branches.find((data) => data.name === value);
        getRoles(_id);
      }
    }
  };
  const navigate = useNavigate();
  const handleSubmit = async (editId) => {
    if (
      !formData.branch ||
      !formData.email ||
      !formData.name ||
      !formData.role ||
      !formData.status ||
      !formData.username
    ) {
      toast.info('Please fill form');
      return;
    }
    setLoading(true);
    const url =
      backendUrl +
      (Object.keys(editObject).length > 0 ? `/editUser/${editId}` : '/signup');
    try {
      const response = await axios.post(
        url,
        {
          ...formData,
          specialUser: specialUserCheck,
          isKeeperOfPhysicalDocs: physicalDocsCheck,
          // password: "viraj",
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );

      if (response.status === 200) {
        Object.keys(editObject).length > 0
          ? toast.success('User edited')
          : toast.success('User created');
        setEditObject({});
        navigate('/users/list');
        setLoading(false);
        setFormData({ ...initialUser });
      }
    } catch (error) {
      // Handle the error and show an alert
      setLoading(false);
      console.error('Error:', error);
      toast.error(error.response.data.message);
    }
  };
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const branch = await getBranches();
    if (Object.keys(editObject).length > 0) {
      // setFormData(editObject);
      const { _id } = branch.find((data) => data.name === editObject.branch);
      getRoles(_id);
    }
  };
  useEffect(() => {
    fetchData();
  }, [editObject]);
  const getEditDetails = async () => {
    setLoading(true);
    try {
      const url = backendUrl + `/getUser/${id}`;
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
  }, []);
  return (
    <>
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
        {/* <Stack
                        alignItems="center"
                        sx={{
                            // mx: 1,
                            borderRadius: "10px",
                            width: { xs: "300px" },
                            mx: "auto",
                        }}
                    >
                        <Typography
                            variant="h4"
                            component="span"
                            gutterBottom
                            sx={{
                                textAlign: "center",
                                width: 270,
                                height: 35,
                                fontWeight: 700,
                                borderRadius: "10px",
                                m: "5px",
                                // color: "lightblue",
                            }}
                        >
                            User details
                        </Typography>
                    </Stack> */}
        <Grid container spacing={4} mt={1}>
          <Grid item xs={12} sm={6} md={6}>
            <Typography variant="body1">User Name :</Typography>
            <TextField
              sx={{ background: 'whitesmoke' }}
              fullWidth
              size="small"
              // label="Name Of User"
              variant="outlined"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Typography variant="body1">Normal Name :</Typography>
            <TextField
              sx={{ background: 'whitesmoke' }}
              fullWidth
              size="small"
              variant="outlined"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Typography variant="body1">Email :</Typography>
            <TextField
              sx={{ background: 'whitesmoke' }}
              fullWidth
              size="small"
              // label="Email"
              variant="outlined"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Typography variant="body1">User Branch :</Typography>
            <FormControl fullWidth variant="outlined">
              {/* <InputLabel>User Branch</InputLabel> */}
              <Select
                sx={{ background: 'whitesmoke' }}
                name="branch"
                size="small"
                value={formData.branch}
                onChange={handleInputChange}
              // disabled={specialUserCheck}
              // label="branch"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {branches?.map((data) => (
                  <MenuItem value={data.name}>{data.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Typography variant="body1">User Role :</Typography>
            <FormControl fullWidth variant="outlined">
              {/* <InputLabel>User Role</InputLabel> */}
              <Select
                name="role"
                size="small"
                sx={{ background: 'whitesmoke' }}
                value={formData.role}
                onChange={handleInputChange}
              // label="Users role"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {roles?.map((data) => (
                  <MenuItem value={data.role}>{data.role}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Typography variant="body1">Status :</Typography>
            <FormControl fullWidth variant="outlined">
              {/* <InputLabel>User Status</InputLabel> */}
              <Select
                name="status"
                size="small"
                sx={{ background: 'whitesmoke' }}
                value={formData.status}
                onChange={handleInputChange}
              // label="Status"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={specialUserCheck}
                  disabled={formData.branch !== 'headOffice'}
                  onChange={handleSelectSpecialUser}
                  name="specialUser"
                />
              }
              label="SPECIAL USER?"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={physicalDocsCheck}
                  //   disabled={formData.branch !== 'headOffice'}
                  onChange={handleSelectPhysicalDocs}
                  name="isKeeperOfPhysicalDocs"
                />
              }
              label="Will this used to be responsible for maintaining physical documents?"
            />
          </Grid>
          {/* <Grid item xs={12}>
                <Box sx={{ padding: '10px' }}>
                  <Typography variant="body1">select permissions :</Typography>
                  <Filefolders selection={selection} setSelection={setSelection}/>
                </Box>
              </Grid> */}
          <Grid item xs={12} sx={{ textAlign: 'center' }}>
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
              {loading ? (
                <CircularProgress size={20} />
              ) : Object.keys(editObject).length > 0 ? (
                'update'
              ) : (
                'Save'
              )}
            </Button>
            <Link to="/users/list">
              <Button
                variant="contained"
                color="error"
                disabled={loading}
                sx={{ margin: '5px', width: '150px' }}
              >
                Cancel
              </Button>
            </Link>
          </Grid>
        </Grid>
        {/* </Paper> */}
        {/* </Box> */}
      </div>
    </>
  );
}
