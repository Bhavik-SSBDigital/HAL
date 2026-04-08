import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Autocomplete, TextField, Button, Dialog, 
  DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress, Alert
} from '@mui/material';

// Import the new functions from your API file
import { getAllProcessesForAdmin, deleteProcessCleanup } from '../../common/Apis'; 

const DeleteProcess = () => {
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const response = await getAllProcessesForAdmin();
      setProcesses(response.data);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to load processes. Ensure you have admin privileges.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProcess) return;
    setIsDeleting(true);
    setOpenConfirm(false);

    try {
      await deleteProcessCleanup(selectedProcess.id);
      
      setMessage({ 
        type: 'success', 
        text: `Process "${selectedProcess.name}" was successfully deleted.` 
      });
      setSelectedProcess(null);
      fetchProcesses(); // Refresh the list after successful deletion
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error?.response?.data?.message || 'An error occurred while deleting the process.' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, margin: '0 auto', backgroundColor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h4" mb={1} color="error.main" fontWeight="bold">
        Process Cleanup Utility
      </Typography>
      <Typography variant="body1" color="textSecondary" mb={4}>
        Selecting and deleting a process here will permanently remove all associated database records, workflow history, documents, and physical file system directories. <strong>This action cannot be undone.</strong>
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box display="flex" gap={2} alignItems="center">
          <Autocomplete
            fullWidth
            options={processes}
            getOptionLabel={(option) => `${option.name} (Initiator: ${option?.initiator?.username}) - [${option.status}]`}
            value={selectedProcess}
            onChange={(_, newValue) => setSelectedProcess(newValue)}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Search Process by Name or Initiator" 
                variant="outlined" 
              />
            )}
          />
          <Button 
            variant="contained" 
            color="error" 
            disabled={!selectedProcess || isDeleting}
            onClick={() => setOpenConfirm(true)}
            sx={{ height: 56, px: 4, whiteSpace: 'nowrap' }}
          >
            {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Delete Process'}
          </Button>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog 
        open={openConfirm} 
        onClose={() => setOpenConfirm(false)}
        PaperProps={{ sx: { borderTop: '4px solid #d32f2f' } }}
      >
        <DialogTitle fontWeight="bold">Confirm Permanent Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you absolutely sure you want to delete the process <strong>{selectedProcess?.name}</strong>? 
            <br/><br/>
            This will wipe all documents, workflow steps, QA threads, and the parent folder from the server.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenConfirm(false)} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Yes, Delete Forever
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeleteProcess;