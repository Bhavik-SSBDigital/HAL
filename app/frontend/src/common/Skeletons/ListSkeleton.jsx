import React from 'react';
import { Box, Skeleton } from '@mui/material';

const ListSkeleton = () => (
  <Box>
    {[...Array(5)].map((_, index) => (
      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="80%" height={15} />
        </Box>
      </Box>
    ))}
  </Box>
);

export default ListSkeleton;
