import React, { useEffect, useState } from 'react';
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
  Stack,
  Autocomplete,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'react-toastify';

function Schedule({ handleClose, setMeetings, meetings }) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const token = sessionStorage.getItem('accessToken');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);

  const onSubmit = async (data) => {
    try {
      const url = backendUrl + '/createMeet';
      const res = await axios.post(url, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.message);
      setMeetings((prev) => {
        const foundIdx = prev.findIndex(
          (item) => item.date == res.data.meeting.date,
        );

        if (foundIdx >= 0) {
          // Correct condition to check if date exists
          return prev.map((item, idx) => {
            if (idx === foundIdx) {
              return {
                ...item,
                scheduledMeetings: [
                  ...item.scheduledMeetings,
                  {
                    meetingId: res.data.meeting.meetingId,
                    name: res.data.meeting.name,
                    host: res.data.meeting.host,
                    agenda: res.data.meeting.agenda,
                    time: res.data.meeting.time,
                    duration: res.data.meeting.duration,
                  },
                ],
              };
            } else {
              return item;
            }
          });
        } else {
          return [
            ...prev,
            {
              date: res.data.meeting.date,
              day: res.data.meeting.day,
              scheduledMeetings: [
                {
                  meetingId: res.data.meeting.meetingId,
                  name: res.data.meeting.name,
                  host: res.data.meeting.host,
                  agenda: res.data.meeting.agenda,
                  time: res.data.meeting.time,
                  duration: res.data.meeting.duration,
                },
              ],
            },
          ];
        }
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      handleClose();
    }
  };

  const getUsers = async () => {
    try {
      const url = backendUrl + '/getUsers';
      const res = await axios({
        method: 'post',
        url: url,
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.users || []);
    } catch (error) {
      console.log(error?.response?.data?.message || error?.message);
    }
  };
  useEffect(() => {
    getUsers();
  }, []);
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
            type="datetime-local"
            fullWidth
            sx={{ width: { xs: '100%', sm: '49%' }, mr: '5px' }}
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
            type="datetime-local"
            fullWidth
            margin="dense"
            sx={{ width: { xs: '100%', sm: '49%' } }}
            InputLabelProps={{ shrink: true }}
          />
        )}
      />
      <Controller
        name="attendees"
        control={control}
        defaultValue={[]}
        render={({ field }) => (
          <Autocomplete
            multiple
            options={users}
            disableCloseOnSelect
            getOptionLabel={(option) => option.username}
            value={selectedUsers}
            onChange={(e, value) => {
              setSelectedUsers(value); // Update local state for display
              field.onChange(value.map((user) => user.username)); // Update form value to only labels
            }}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option._id}>
                <Checkbox checked={selected} style={{ marginRight: 8 }} />
                {option.username}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Add Attendees"
                placeholder="Select attendees"
                margin="dense"
                fullWidth
                error={!!errors.attendees}
                helperText={errors.attendees ? errors.attendees.message : ''}
              />
            )}
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
