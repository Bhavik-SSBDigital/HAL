// pages/SidebarSettings.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  Checkbox, Button, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import { fetchSidebarConfig, saveSidebarConfig } from '../common/Apis';

type UserType = 'showToAdmin' | 'showToDepartmentHead' | 'showToRootLevel' | 'showToNormal';

interface RouteConfig {
  id: number;
  routeKey: string;
  label: string;
  showToAdmin: boolean;
  showToDepartmentHead: boolean;
  showToRootLevel: boolean;
  showToNormal: boolean;
}

const USER_TYPE_COLUMNS: { key: UserType; label: string }[] = [
  { key: 'showToAdmin',          label: 'Admin' },
  { key: 'showToDepartmentHead', label: 'Department Head' },
  { key: 'showToRootLevel',      label: 'Root Level User' },
  { key: 'showToNormal',         label: 'Normal User' },
];

const SidebarSettings: React.FC = () => {
  const [configs, setConfigs]     = useState<RouteConfig[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchSidebarConfig();
        setConfigs(res.data);
      } catch(e) {
        console.log("error loading config", e)
        setToast({ open: true, message: 'Failed to load config', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = (routeKey: string, field: UserType) => {
    setConfigs((prev) =>
      prev.map((item) =>
        item.routeKey === routeKey
          ? { ...item, [field]: !item[field] }
          : item,
      ),
    );
  };

  const handleSelectAll = (field: UserType, value: boolean) => {
    setConfigs((prev) => prev.map((item) => ({ ...item, [field]: value })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSidebarConfig(configs);
      setToast({ open: true, message: 'Settings saved successfully', severity: 'success' });
    } catch {
      setToast({ open: true, message: 'Failed to save settings', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Sidebar Visibility Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Control which sidebar items are visible to each user type.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
          sx={{ minWidth: 120, height: 40 }}
        >
          {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Save Changes'}
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>
                Sidebar Item
              </TableCell>
              {USER_TYPE_COLUMNS.map((col) => (
                <TableCell key={col.key} align="center" sx={{ fontWeight: 700, minWidth: 140 }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                    {col.label}
                    {/* Select All / None row */}
                    <Box display="flex" gap={0.5}>
                      <Button
                        size="small"
                        variant="text"
                        sx={{ fontSize: '10px', p: '0 4px', minWidth: 'unset', color: 'primary.main' }}
                        onClick={() => handleSelectAll(col.key, true)}
                      >
                        All
                      </Button>
                      <Typography variant="caption" color="text.disabled" lineHeight="24px">|</Typography>
                      <Button
                        size="small"
                        variant="text"
                        sx={{ fontSize: '10px', p: '0 4px', minWidth: 'unset', color: 'error.main' }}
                        onClick={() => handleSelectAll(col.key, false)}
                      >
                        None
                      </Button>
                    </Box>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {configs.map((row, index) => (
              <TableRow
                key={row.routeKey}
                sx={{
                  backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa',
                  '&:hover': { backgroundColor: '#f0f4ff' },
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {row.label}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {row.routeKey}
                  </Typography>
                </TableCell>
                {USER_TYPE_COLUMNS.map((col) => (
                  <TableCell key={col.key} align="center">
                    <Checkbox
                      checked={row[col.key]}
                      onChange={() => handleToggle(row.routeKey, col.key)}
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SidebarSettings;