import { Box, Button, Stack, Tooltip } from '@mui/material';
import React, { useEffect } from 'react';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { backButtonPath, onReload } from '../../Slices/PathSlice';
import folderIcon from '../../assets/images/folder.png';
import { useNavigate } from 'react-router-dom';

export default function PathBar({ pathValue, setCurrentPath, state }) {
  const navigate = useNavigate();
  if (!pathValue) {
    return;
  }
  const handlePathClick = (index) => {
    const pathSegments = pathValue.split('/');
    if (index >= 0 && index < pathSegments.length) {
      const newPathSegments = pathSegments.slice(0, index + 1);
      const newPath = newPathSegments.join('/');
      sessionStorage.setItem(state, newPath);
      setCurrentPath(newPath);
    } else {
      console.error('Invalid index:', index);
    }
  };
  function truncateFileName(fileName, maxLength = 10) {
    if (fileName.length <= maxLength) {
      return fileName;
    } else {
      const truncatedName = fileName.substring(0, maxLength - 3);
      return truncatedName + '...';
    }
  }
  return (
    <Stack
      padding="4px"
      sx={{
        backgroundColor: 'white',
        borderRadius: '8px',
        // boxShadow: "0 2px 3px rgba(0, 0, 0, 0.2)",
        border: '1px solid lightgray',
      }}
      overflow="auto"
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Stack flexDirection="row" gap={1} ml={1}>
          <img width={25} src={folderIcon} alt="" /> :
        </Stack>
        {pathValue.split('/').map((item, index) => (
          <React.Fragment key={item}>
            {index > 0 && (
              <NavigateNextIcon fontSize="small" style={{ margin: '0 5px' }} />
            )}
            <Tooltip
              title={item.length >= 10 ? (item === '..' ? '/' : item) : null}
            >
              <Button
                variant="text"
                sx={{
                  textTransform: 'none',
                  minWidth: { xs: '110px' },
                }}
                onClick={() => handlePathClick(index)}
              >
                {item === '..' ? '/' : truncateFileName(item)}
              </Button>
            </Tooltip>
          </React.Fragment>
        ))}
      </Box>
    </Stack>
  );
}
