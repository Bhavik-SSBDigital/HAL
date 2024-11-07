import React from 'react';
import { Box, Skeleton } from '@mui/material';

const TableSkeleton = () => (
  <Box>
    <Skeleton variant="rectangular" width="100%" height={30} sx={{ mb: 2 }} />
    {[...Array(4)].map((_, index) => (
      <Box
        key={index}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          mb: 1,
        }}
      >
        <Skeleton variant="rectangular" height={30} />
        <Skeleton variant="rectangular" height={30} />
        <Skeleton variant="rectangular" height={30} />
        <Skeleton variant="rectangular" height={30} />
      </Box>
    ))}
  </Box>
);

export default TableSkeleton;
