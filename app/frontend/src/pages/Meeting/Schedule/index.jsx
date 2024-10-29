import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    IconButton,
    Typography,
    FormControlLabel,
    Checkbox,
    Stack
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'react-toastify';

function Schedule({ handleClose }) {
    const { control, handleSubmit } = useForm();
    const token = sessionStorage.getItem('accessToken');
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const onSubmit = async (data) => {
        try {
            const url = backendUrl + "/createMeet"
            const res = await axios.post(url, data, { headers: { Authorization: `Bearer ${token}` } })
            toast.success(res.data.message);
        } catch (error) {

        } finally {
            handleClose();
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 400 }}>
            <Controller
                name="title"
                control={control}
                defaultValue=""
                render={({ field }) => (
                    <TextField
                        {...field}
                        required
                        label="Title"
                        fullWidth
                        margin="dense"
                    />
                )}
            />
            <Controller
                name="startTime"
                control={control}
                defaultValue=""
                render={({ field }) => (
                    <TextField
                        {...field}
                        required
                        label="Start Time"
                        type="time"
                        fullWidth
                        sx={{ width: { xs: "100%", sm: "49%" }, mr: '5px' }}
                        margin="dense"
                        InputLabelProps={{ shrink: true }}
                    />
                )}
            />
            <Controller
                name="endTime"
                control={control}
                defaultValue=""
                render={({ field }) => (
                    <TextField
                        {...field}
                        required
                        label="End Time"
                        type="time"
                        fullWidth
                        margin="dense"
                        sx={{ width: { xs: "100%", sm: "49%" } }}
                        InputLabelProps={{ shrink: true }}
                    />
                )}
            />
            <Controller
                name="attendees"
                control={control}
                defaultValue=""
                render={({ field }) => (
                    <TextField
                        required
                        {...field}
                        label="Add Attendees"
                        fullWidth
                        margin="dense"
                    />
                )}
            />
            <Controller
                name="agenda"
                control={control}
                defaultValue=""
                render={({ field }) => (
                    <TextField
                        required
                        {...field}
                        label="Agenda"
                        fullWidth
                        multiline
                        rows={3}
                        margin="dense"
                    />
                )}
            />
            <Controller
                name="flexibleWithAttendees"
                control={control}
                defaultValue={false}
                render={({ field }) => (
                    <FormControlLabel
                        required
                        control={<Checkbox {...field} checked={field.value} />}
                        label="Flexible with Attendees"
                    />
                )}
            />
            <Stack mt={1} flexDirection="row" justifyContent="flex-end" gap={1}>
                <Button onClick={handleClose} color="error">
                    Cancel
                </Button>
                <Button type="submit" color="primary" variant="contained">
                    Save
                </Button>
            </Stack>
        </form>
    );
}

export default Schedule;
