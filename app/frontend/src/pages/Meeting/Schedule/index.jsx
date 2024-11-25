import React, { useEffect, useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Stack,
  Autocomplete,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'react-toastify';

function Schedule({ handleClose, setMeetings, meetings }) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const token = sessionStorage.getItem('accessToken');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
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
          (item) => item.date === res.data.meeting.date,
        );

        if (foundIdx >= 0) {
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
      console.error(error?.response?.data?.message || error?.message);
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  const watchIsRecurring = watch('isRecurring', false);
  const watchFrequency = watch('frequency', 'daily');

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Schedule a Meeting
      </Typography>
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={1}>
        <Controller
          name="startTime"
          control={control}
          defaultValue=""
          rules={{
            required: 'Start time is required',
          }}
          render={({ field }) => (
            <TextField
              {...field}
              required
              label="Start Time"
              type="datetime-local"
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true }}
              error={!!errors.startTime}
              helperText={errors.startTime?.message}
            />
          )}
        />
        <Controller
          name="endTime"
          control={control}
          defaultValue=""
          rules={{
            required: 'End time is required',
            validate: (value) => {
              const startTime = new Date(control._formValues.startTime);
              const endTime = new Date(value);
              if (endTime <= startTime) {
                return 'End time must be later than start time';
              }
              return true;
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              required
              label="End Time"
              type="datetime-local"
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true }}
              error={!!errors.endTime}
              helperText={errors.endTime?.message}
            />
          )}
        />
      </Stack>
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
            onChange={(e, value) =>
              field.onChange(value.map((user) => user.username))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Add Attendees"
                placeholder="Select attendees"
                margin="dense"
                fullWidth
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
            {...field}
            required
            label="Agenda"
            fullWidth
            multiline
            rows={3}
            margin="dense"
          />
        )}
      />
      <Controller
        name="isRecurring"
        control={control}
        defaultValue={false}
        render={({ field }) => (
          <FormControlLabel
            control={<Checkbox {...field} checked={field.value} />}
            label="Recurring Meeting"
            sx={{ marginTop: 2 }}
          />
        )}
      />
      {watchIsRecurring && (
        <Stack spacing={2} mt={2}>
          <FormControl>
            <FormLabel>Recurrence Frequency</FormLabel>
            <Controller
              name="frequency"
              control={control}
              defaultValue="daily"
              render={({ field }) => (
                <RadioGroup {...field} row>
                  <FormControlLabel
                    value="daily"
                    control={<Radio />}
                    label="Daily"
                  />
                  <FormControlLabel
                    value="weekly"
                    control={<Radio />}
                    label="Weekly"
                  />
                  <FormControlLabel
                    value="monthly"
                    control={<Radio />}
                    label="Monthly"
                  />
                </RadioGroup>
              )}
            />
          </FormControl>
          {watchFrequency === 'weekly' && (
            <Controller
              name="dayOfWeek"
              control={control}
              defaultValue="Monday"
              render={({ field }) => (
                <TextField {...field} select label="Day of the Week" fullWidth>
                  {[
                    'Sunday',
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                  ].map((day) => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          )}
          {watchFrequency === 'monthly' && (
            <Controller
              name="dateOfMonth"
              control={control}
              defaultValue={1}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Date of the Month"
                  type="number"
                  inputProps={{ min: 1, max: 31 }}
                  fullWidth
                />
              )}
            />
          )}
        </Stack>
      )}
      <Stack mt={2} flexDirection="row" justifyContent="flex-end" gap={2}>
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
