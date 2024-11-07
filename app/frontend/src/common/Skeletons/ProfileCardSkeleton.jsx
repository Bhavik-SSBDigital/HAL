import React from 'react';
import { Box, Skeleton } from '@mui/material';

const ProfileCardSkeleton = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Skeleton variant="circular" width={60} height={60} />
    <Box sx={{ flexGrow: 1 }}>
      <Skeleton variant="text" width="50%" height={30} />
      <Skeleton variant="text" width="30%" height={20} />
      <Skeleton variant="text" width="70%" height={15} />
    </Box>
  </Box>
);

export default ProfileCardSkeleton;
