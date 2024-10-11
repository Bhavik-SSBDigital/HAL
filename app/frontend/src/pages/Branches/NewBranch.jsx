import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    Grid,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
// import { useHistory } from 'react-router-dom';
import axios from "axios";
// import NavBar from "../Home/NavBar/NavBar";
import { Link } from "react-router-dom";
// import Sidedrawer from "../drawer/Sidedrawer";
import { toast } from "react-toastify";
// import useStoreData, { sessionData } from "../../Store";

const NewBranch = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const { id } = useParams();
    const [editObject, setEditObject] = useState({});
    const [formData, setFormData] = useState({
        code: 0,
        name: "",
        status: "",
    });
    const getId = (obj) => {
        return;
    };
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };
    const navigate = useNavigate();
    // ...
    const [loading, setLoading] = useState(false);
    async function handleSubmit(editId) {
        if (!formData.name || !formData.status) {
            toast.info("Please fill all details");
            return;
        }
        setLoading(true);
        console.log(editId + "id");
        try {
            const url =
                backendUrl +
                (Object.keys(editObject).length > 0
                    ? `/editBranch/${editId}`
                    : "/createBranch");
            const accessToken = sessionStorage.getItem("accessToken");
            const response = await axios.post(url, formData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.status === 200) {
                Object.keys(editObject).length > 0
                    ? toast.success("Branch is edited")
                    : toast.success("Branch is created");
                setEditObject({});
                setLoading(false);
                navigate("/branches/list");
                setFormData({
                    code: 0,
                    name: "",
                    status: "",
                });
            } else {
                setLoading(false);
                toast.error("Error");
            }
        } catch (error) {
            setLoading(false);
            toast.error("Something went wrong");
        }
    }
    const getEditDetails = async () => {
        setLoading(true);
        try {
            const url = backendUrl + `/getBranch/${id}`
            const res = await axios.post(url, null, {
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`
                }
            })
            if (res.status === 200) {
                setEditObject(res.data);
                setFormData(res.data);
            }
        } catch (error) {
            console.error(error.message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (id) {
            getEditDetails();
        }
    }, [])
    return (
        <>
            <div
                style={{
                    width: "100%",
                    maxHeight: "fit-content",
                    backgroundColor: "white",
                    padding: "20px",
                    border: "1px solid lightgray",
                    borderRadius: "10px",
                    boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px'
                }}
            >
                <Stack alignItems="center" m="20px 0" gap={5}>
                    <FormControl fullWidth>
                        <TextField
                            label="Branch Code"
                            type="number"
                            name="code"
                            inputProps={{ min: "0" }}
                            value={formData.code}
                            onChange={handleInputChange}
                            sx={{ backgroundColor: "whitesmoke" }}
                        />
                    </FormControl>
                    <FormControl fullWidth>
                        <TextField
                            label="Branch Name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            sx={{ backgroundColor: "whitesmoke" }}
                        />
                    </FormControl>
                    <FormControl fullWidth>
                        <Select
                            displayEmpty
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            sx={{ backgroundColor: "whitesmoke" }}
                        >
                            <MenuItem value="">
                                <em>Select Status</em>
                            </MenuItem>
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Deactive">Deactive</MenuItem>
                        </Select>
                    </FormControl>
                    <Stack>
                        <Stack spacing={2} direction="row" justifyContent="center">
                            <Button
                                variant="contained"
                                color="success"
                                sx={{ width: "150px" }}
                                disabled={loading}
                                onClick={() =>
                                    Object.keys(editObject).length > 0
                                        ? handleSubmit(editObject._id)
                                        : handleSubmit()
                                }
                            >
                                {loading ? <CircularProgress size={26} /> : Object.keys(editObject).length > 0 ? "update" : "Save"}
                            </Button>
                            <Link to="/branches/list">
                                <Button variant="contained" sx={{ width: '150px' }} color="error" disabled={loading}>
                                    Cancel
                                </Button>
                            </Link>
                        </Stack>
                    </Stack>
                </Stack>
                {/* </Paper> */}
                {/* </Box> */}
            </div>
        </>
    );
};
export default NewBranch;
