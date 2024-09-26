import React, { useState } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    TextField, Paper, Grid, Typography, IconButton, Chip,
    Grid2, Card, CardContent, CardActions, Badge,
    Stack
} from '@mui/material';
import { Folder, Delete, UploadFile, InsertDriveFile } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { IconFileFilled, IconFolderFilled } from '@tabler/icons-react';

const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

export default function FileSystem() {
    const [folders, setFolders] = useState([
        { name: 'Desktop files', files: ['File1.pdf', 'File2.pdf'], createdBy: 'John Doe', updatedAt: '15-Sep-2023' },
        { name: 'My documents', files: [], createdBy: 'Jane Doe', updatedAt: '20-Sep-2023' },
        { name: 'Photos', files: ['File5.pdf'], createdBy: 'Alex Smith', updatedAt: '25-Sep-2023' }
    ]);
    const [openDialog, setOpenDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [currentFolder, setCurrentFolder] = useState(null);

    const handleCreateFolder = () => {
        setFolders([...folders, { name: newFolderName, files: [], category: 'Quality', createdBy: 'New User', updatedAt: new Date().toLocaleDateString(), locked: false }]);
        setNewFolderName('');
        setOpenDialog(false);
    };

    const handleOpenFolder = (folder) => {
        setCurrentFolder(folder);
    };

    const handleDeleteFile = (folderName, fileName) => {
        setFolders(folders.map(folder => {
            if (folder.name === folderName) {
                return { ...folder, files: folder.files.filter(file => file !== fileName) };
            }
            return folder;
        }));
    };

    return (
        <Box sx={{ flexGrow: 1, p: 1, minHeight: "calc(100vh - 80px)" }}>
            <Grid2 container spacing={2}>
                {folders.map((folder, index) => (
                    <Grid2 xs={12} sm={6} md={4} key={index}>
                        <Card className='cardDesign' sx={{ width: 180 }}>
                            <Stack sx={{ backgroundColor: '#F0F0F0', height: "100px", borderRadius: "6px" }} justifyContent="center" alignItems="center">
                                <Badge
                                    color="error"
                                    anchorOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }}
                                >
                                    <Folder fontSize="large" sx={{ color: '#FFA000', fontSize: '80px' }} />
                                </Badge>
                            </Stack>
                            <CardContent sx={{ padding: "0px", mt: 1 }}>
                                <Typography variant="body1" component="div" color='black' fontWeight={600}>
                                    {folder.name}
                                </Typography>
                                <Stack flexDirection="row" gap={2}>
                                    <Stack flexDirection="row" gap="3px" alignItems="center"><IconFolderFilled size={18} color='#999999' /> 8</Stack>
                                    <Stack flexDirection="row" gap="3px" alignItems="center"><IconFileFilled size={18} color='#999999' /> 10</Stack>                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid2>
                ))}
            </Grid2>

            {currentFolder && (
                <Box mt={3}>
                    <h3>{currentFolder.name}</h3>
                    <Button
                        startIcon={<UploadFile />}
                        variant="contained"
                        sx={{ mb: 2 }}
                    >
                        Upload File
                    </Button>
                    <Grid2 container spacing={2}>
                        {currentFolder.files.map((file, idx) => (
                            <Grid2 item xs={12} key={idx}>
                                <Item>
                                    <Typography variant="body2">
                                        <InsertDriveFile sx={{ mr: 1 }} />
                                        {file}
                                    </Typography>
                                    <IconButton onClick={() => handleDeleteFile(currentFolder.name, file)}>
                                        <Delete />
                                    </IconButton>
                                </Item>
                            </Grid2>
                        ))}
                    </Grid2>
                </Box>
            )}

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder Name"
                        fullWidth
                        variant="outlined"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateFolder} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
