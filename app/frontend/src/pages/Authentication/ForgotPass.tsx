import React from 'react';
import { Link } from 'react-router-dom';
import { Stack, Typography, Button } from '@mui/material';
import { IconLock } from '@tabler/icons-react';

const ForgotPass: React.FC = () => {
  return (
    <Stack alignItems="center" justifyContent="center" height="100vh" width="100vw">
      <div
        style={{ padding: '40px', width: '80vw', maxWidth: '480px', textAlign: 'center' }}
        className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark"
      >
        <IconLock size={48} style={{ margin: '0 auto 16px', color: '#3056D3' }} />
        <Typography variant="h5" fontWeight={700} mb={2} color="text.primary">
          Forgot your password?
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          Password resets are managed by your system administrator.
          Please contact your admin directly to have your password changed.
        </Typography>
        <Link to="/auth/signin">
          <Button variant="contained" color="primary" fullWidth>
            Back to Sign In
          </Button>
        </Link>
      </div>
    </Stack>
  );
};

export default ForgotPass;