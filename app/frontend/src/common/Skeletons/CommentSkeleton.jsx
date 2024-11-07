import React from 'react';
import { Box, Skeleton } from '@mui/material';

const CommentSkeleton = () => (
  <Box>
    {[...Array(3)].map((_, index) => (
      <Box key={index} sx={{ display: 'flex', mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
        <Box>
          <Skeleton variant="text" width="30%" height={20} />
          <Skeleton variant="text" width="90%" height={15} />
        </Box>
      </Box>
    ))}
  </Box>
);

export default CommentSkeleton;
