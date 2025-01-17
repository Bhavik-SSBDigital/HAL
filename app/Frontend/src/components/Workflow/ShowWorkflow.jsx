import { IconButton, Paper, Stack, Tooltip } from '@mui/material';
import React from 'react';
import styles from './ShowWorkflow.module.css';

export default function ShowWorkflow({ workFlow }) {
  function truncateUsername(username, maxLength = 12) {
    if (!username || typeof username !== 'string') return '';

    // Check if truncation is needed
    if (username.length <= maxLength) {
      return username;
    }

    // Truncate and append "..."
    return `${username.substring(0, maxLength)}...`;
  }
  return (
    <Stack
      flexDirection="row"
      flexWrap="wrap"
      rowGap={3}
      columnGap={1}
      justifyContent="center"
      sx={{ marginBottom: '20px', marginTop: '40px' }}
    >
      {workFlow?.map((item, index) => (
        <>
          <Paper
            key={index + 1}
            elevation={3}
            sx={{
              position: 'relative',
              width: { xs: 230, sm: 250, md: 280 },
              border: '1px solid purple',
              borderRadius: '15px',
              backgroundColor: 'white',
            }}
          >
            <h3 className={styles.workflowIndex}>{index + 1}</h3>
            <div className={styles.workflowContent}>
              <div className={styles.workFlowElements}>
                <p style={{ width: '60px' }}>
                  <strong>Step :</strong>
                </p>
                <p>{index + 1}</p>
              </div>
              <div className={styles.workFlowElements}>
                <p style={{ width: '60px' }}>
                  <strong>Users :</strong>
                </p>
                <p style={{ whiteSpace: 'pre-line' }}>
                  {item?.users?.length
                    ? item.users.map((user, index) => (
                        <Tooltip
                          key={index}
                          title={user.user.length > 12 ? user.user : ''}
                        >
                          <span>{truncateUsername(user.user)}</span>
                        </Tooltip>
                      ))
                    : '---'}
                </p>
              </div>
            </div>
          </Paper>
        </>
      ))}
    </Stack>
  );
}
