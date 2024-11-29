import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Divider,
  TextField,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import VideocamIcon from '@mui/icons-material/Videocam';
import MicIcon from '@mui/icons-material/Mic';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import Loader from '../../../common/Loader';
import FormSkeleton from '../../../common/Skeletons/FormSkeleton';
import { useNavigate } from 'react-router-dom';

const MeetingDetailsDialog = ({ open, onClose, id }) => {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [loading, setLoading] = useState(true);
  const username = sessionStorage.getItem('username');
  const token = sessionStorage.getItem('accessToken');
  const [meetingDetails, setMeetingDetails] = useState({});
  const formatDateTime = (dateString) => new Date(dateString).toLocaleString();

  const getDetails = async () => {
    setLoading(true);
    const url = backendUrl + `/getMeetingDetails/${id}`;
    try {
      const res = await axios({
        method: 'get',
        url: url,
        headers: { Authorization: `Bearer ${token}` },
      });
      setMeetingDetails(res.data.meetingDetails || {});
    } catch (error) {
      console.log(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };
  const postComment = async (data) => {
    const url = backendUrl + '/addCommentInMeeting';
    const formData = { comment: data.comment, meetingId: id };
    try {
      const res = await axios({
        method: 'post',
        url: url,
        data: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      setMeetingDetails((prev) => ({
        ...prev,
        comments: [
          ...prev.comments,
          {
            commentor: username,
            comment: data.comment,
            timestamp: new Date().toISOString(),
          },
        ],
      }));
      reset();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };
  useEffect(() => {
    setMeetingDetails({});
    if (id) {
      getDetails();
    }
  }, [id]);
  const navigate = useNavigate();
  const handleInitiate = () => {
    const url = `/processes/initiate?meetingId=${id}`;
    navigate(url);
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {meetingDetails?.title ? meetingDetails?.title : '---'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <FormSkeleton />
        ) : (
          <Box sx={{ p: 1 }}>
            <Stack
              flexDirection={'row'}
              flexWrap={'wrap'}
              gap={1}
              justifyContent="space-between"
              mb={3}
            >
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Agenda
                </Typography>
                <Typography variant="body2" sx={{ mb: 4 }}>
                  {meetingDetails?.agenda ? meetingDetails?.agenda : '---'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Meeting Time
                </Typography>
                <Typography variant="body2" sx={{ mb: 4 }}>
                  <AccessTimeIcon
                    fontSize="small"
                    sx={{ verticalAlign: 'middle', mr: 0.5 }}
                  />
                  {meetingDetails?.startTime
                    ? formatDateTime(meetingDetails?.startTime)
                    : null}
                  -
                  {meetingDetails?.endTime
                    ? formatDateTime(meetingDetails?.endTime)
                    : null}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Created By
                </Typography>
                <Typography variant="body2" sx={{ mb: 4 }}>
                  <AccountCircleOutlinedIcon
                    fontSize="small"
                    sx={{ verticalAlign: 'middle', mr: 0.5 }}
                  />
                  {meetingDetails?.createdBy}
                </Typography>
              </Box>
            </Stack>

            <Typography variant="h6" gutterBottom>
              Attendees :
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexWrap: 'wrap',
                mb: 2,
                p: 2,
                bgcolor: '#EEEEEE',
                borderRadius: '8px',
              }}
            >
              {meetingDetails?.attendees?.length ? (
                meetingDetails?.attendees?.map((attendee, index) => (
                  <Chip key={index} label={attendee} color="primary" />
                ))
              ) : (
                <Typography color="textSecondary" variant="body2">
                  No Attendees.
                </Typography>
              )}
            </Stack>

            <Typography variant="h6" gutterBottom>
              Logs :
            </Typography>
            <List
              dense
              sx={{
                bgcolor: '#EEEEEE',
                mb: 2,
                p: '10px',
                borderRadius: '8px',
                maxHeight: '350px',
                overflow: 'auto',
              }}
            >
              {meetingDetails?.logs?.length > 0 ? (
                meetingDetails?.logs.map((log, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${log.attendee} joined at ${formatDateTime(
                        log.joinedAt,
                      )}`}
                      secondary={
                        log.leftAt
                          ? `Left at ${formatDateTime(log.leftAt)}`
                          : 'Currently in meeting'
                      }
                    />
                  </ListItem>
                ))
              ) : (
                <Typography color="textSecondary" variant="body2">
                  No logs available.
                </Typography>
              )}
            </List>

            <Typography variant="h6" gutterBottom>
              Comments :
            </Typography>
            <List
              dense
              sx={{
                bgcolor: '#EEEEEE',
                p: '10px',
                borderRadius: '8px',
                maxHeight: '350px',
                overflow: 'auto',
              }}
            >
              {meetingDetails?.comments?.length > 0 ? (
                meetingDetails?.comments.map((comment, index) => (
                  <ListItem key={index} alignItems="flex-start">
                    <Avatar>{comment.commentor[0]}</Avatar>
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        {comment.commentor} -{' '}
                        {formatDateTime(comment.timestamp)}
                      </Typography>
                      <Typography variant="body2">{comment.comment}</Typography>
                    </Box>
                  </ListItem>
                ))
              ) : (
                <Typography color="textSecondary" variant="body2">
                  No comments yet.
                </Typography>
              )}
            </List>
            <Typography
              variant="h6"
              my={2}
              sx={{ display: 'inline-block', marginTop: '20px' }}
            >
              Do you want to initiate process for this meeting :
            </Typography>
            <Button variant="contained" sx={{ ml: 1 }} onClick={handleInitiate}>
              Initiate
            </Button>
            <form onSubmit={handleSubmit(postComment)}>
              <Stack flexDirection={'row'} mt={2} gap={1}>
                <TextField
                  {...register('comment', { required: true })}
                  name="comment"
                  fullWidth
                  label="Write Comment"
                  size="small"
                />
                <Button variant="contained" type="submit">
                  {isSubmitting ? <CircularProgress size={22} /> : 'Post'}
                </Button>
              </Stack>
            </form>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingDetailsDialog;
