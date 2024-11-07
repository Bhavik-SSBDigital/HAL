import React from 'react';
import { Box, Skeleton } from '@mui/material';

const FormSkeleton = () => (
  <Box sx={{ display: 'grid', gap: 2 }}>
    <Skeleton variant="text" width="40%" height={30} />
    <Skeleton variant="rectangular" width="100%" height={40} />
    <Skeleton variant="text" width="40%" height={30} />
    <Skeleton variant="rectangular" width="100%" height={40} />
    <Skeleton variant="text" width="40%" height={30} />
    <Skeleton variant="rectangular" width="100%" height={40} />
    <Skeleton variant="rectangular" width="30%" height={40} />
  </Box>
);

export default FormSkeleton;
