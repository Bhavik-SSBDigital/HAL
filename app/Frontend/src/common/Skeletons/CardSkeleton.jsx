import React from 'react';
import { Box, Skeleton } from '@mui/material';

const CardSkeleton = () => (
  <Box>
    {/* Text placeholders */}
    <Box sx={{ flexGrow: 1 }}>
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" width="40%" height={32} />
    </Box>
  </Box>
);

export default CardSkeleton;
