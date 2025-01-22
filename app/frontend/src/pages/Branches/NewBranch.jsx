import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  CircularProgress,
  FormControl,
  Grid2,
  MenuItem,
  TextField,
  Divider,
  Typography,
  Stack,
} from '@mui/material';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Workflow from '../../components/Workflow';

const NewBranch = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { id } = useParams();
  const navigate = useNavigate();
  const [editObject, setEditObject] = useState({});
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: 0,
    department: null,
    parentDepartment: null,
    type: 'branch',
    status: 'Active',
    head: null,
    workFlow: [],
  });

  const [userList, setUserList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [flow, setFlow] = useState({ step: '' });
  const [usersOnStep, setUsersOnStep] = useState([]);

  // fetch all branches
  const getBranches = async () => {
    try {
      const url = backendUrl + '/getAllBranches';
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log(data.departments);
      setBranches(data.departments);
    } catch (error) {
      console.error('unable to fetch branches');
    }
  };

  // Fetch User List
  const fetchData = async () => {
    const url = `${backendUrl}/getUsernames`;
    const { data } = await axios.get(url);
    setUserList(data.users);
  };

  // Fetch Edit Details if ID exists
  const getEditDetails = async () => {
    setLoading(true);
    try {
      const url = `${backendUrl}/getBranch/${id}`;
      const res = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      if (res.status === 200) {
        setEditObject(res?.data);
        setFormData(res?.data); // Populate form fields
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    getBranches();
    if (id) getEditDetails();
  }, []);

  // Handle Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url =
        backendUrl +
        (Object.keys(editObject).length > 0
          ? `/editBranch/${editObject._id}`
          : '/createBranch');
      const accessToken = sessionStorage.getItem('accessToken');

      const response = await axios.post(url, formData, {
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
        setFormData({
          code: 0,
          name: '',
          parentDepartment: '',
          type: 'branch',
          status: 'Active',
          isHeadOffice: false,
          head: '',
          workFlow: [],
        });
      } else {
        setLoading(false);
        toast.error('Error');
      }
    } catch (error) {
      setLoading(false);
      toast.error('Something went wrong');
    }
  };

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
      <form onSubmit={handleSubmit}>
        <Grid2 container spacing={5} justifyContent="center" sx={{ mt: 2 }}>
          {/* Branch Code */}
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              label="Branch Code"
              type="number"
              fullWidth
              inputProps={{ min: '0' }}
              sx={{ backgroundColor: 'whitesmoke' }}
            />
          </Grid2>

          {/* Branch Name */}
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              label="Branch Name"
              fullWidth
              sx={{ backgroundColor: 'whitesmoke' }}
            />
          </Grid2>

          {/* Parent Department */}
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              name="parentDepartment"
              value={formData.parentDepartment}
              onChange={handleInputChange}
              select
              fullWidth
              label="Parent Department"
              sx={{ backgroundColor: 'whitesmoke' }}
            >
              {userList?.map((user, index) => (
                <MenuItem value={user.username} key={index}>
                  {user.username}
                </MenuItem>
              ))}
            </TextField>
          </Grid2>

          {/* head */}
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              name="head"
              value={formData.head}
              onChange={handleInputChange}
              select
              fullWidth
              label="Branch Head"
              sx={{ backgroundColor: 'whitesmoke' }}
            >
              {userList?.map((user, index) => (
                <MenuItem value={user.username} key={index}>
                  {user.username}
                </MenuItem>
              ))}
            </TextField>
          </Grid2>

          {/* Status */}
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <TextField
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                select
                label="Status"
                displayEmpty
                sx={{ backgroundColor: 'whitesmoke' }}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Deactive">Deactive</MenuItem>
              </TextField>
            </FormControl>
          </Grid2>
        </Grid2>
        <Divider sx={{ my: 5 }} />
        <Typography
          variant="h6"
          sx={{ textAlign: 'center', mb: 4 }}
          gutterBottom
        >
          Work Flow :
        </Typography>
        <Workflow
          workFlow={formData.workFlow}
          workFlowLength={formData.workFlow.length}
          handleWorkFlow={() => {}}
          setWorkFLow={setFormData}
          flow={flow}
          setFlow={setFlow}
          usersOnStep={usersOnStep}
          setUsersOnStep={setUsersOnStep}
          setBranches={setBranches}
          fullState={formData}
        />
        {/* Buttons */}
        <Grid2 xs={12} display="flex" justifyContent="center" gap={2}>
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
        </Grid2>
      </form>
    </div>
  );
};

export default NewBranch;
