import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
// import errorImage from './error404.png'; // Import your error image

const NotFoundPage = () => {
  const navigate = useNavigate();
  const navigateToHome = () => {
    navigate('/')
  }
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
    >
      {/* <img
        // src={errorImage}
        alt="Error 404"
        style={{ width: '200px', marginBottom: '20px' }}
      /> */}
      <Typography variant="h5" align="center" gutterBottom>
        Oops! Page not found.
      </Typography>
      <Typography variant="body1" align="center" gutterBottom>
        The page you are looking for might have been removed, had its name
        changed, or is temporarily unavailable.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        // component={RouterLink}
        // to="/"
        onClick={navigateToHome}
        style={{ marginTop: '20px' }}
      >
        Go to Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;
