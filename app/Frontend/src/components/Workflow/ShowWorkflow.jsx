import { IconButton, Paper, Stack, Tooltip } from '@mui/material';
import React from 'react';
import styles from './ShowWorkflow.module.css';

export default function ShowWorkflow() {
  const workFlow = [
    {
      work: 'upload',
      users: [
        {
          user: 'UNI_CLERK',
          role: 'UNI_CLERK',
        },
      ],
      step: 1,
    },
    {
      work: 'e-sign',
      users: [
        {
          user: 'UNI_JO',
          role: 'UNI_JO',
        },
      ],
      step: 2,
    },
    {
      work: 'e-sign',
      users: [
        {
          user: 'VirajKalariya0123455',
          role: 'UNI_JO',
        },
      ],
      step: 3,
    },
  ];
  function formatUserNames(users) {
    if (!users || users.length === 0) {
      return 'No users';
    } else if (users.length === 1) {
      return users[0].user;
    } else {
      return users[0].user + ', ...';
    }
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
                  <strong>Work :</strong>
                </p>
                <p>{item?.work}</p>
              </div>
              <div className={styles.workFlowElements}>
                <p style={{ width: '60px' }}>
                  <strong>Users :</strong>
                </p>
                <Tooltip
                  title={
                    item?.users?.length > 1
                      ? item.users.map((user) => user.user).join(', ')
                      : null
                  }
                >
                  <p>{formatUserNames(item?.users)}</p>
                </Tooltip>
              </div>
            </div>
          </Paper>
        </>
      ))}
    </Stack>
  );
}
