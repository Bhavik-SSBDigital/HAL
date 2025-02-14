import { IconButton, Paper, Stack, Tooltip } from '@mui/material';
import React from 'react';
import styles from './ShowWorkflow.module.css';

export default function ShowWorkflow({ workFlow, handleDelete }) {
  function truncateText(text, maxLength = 12) {
    if (!text || typeof text !== 'string') return '---';
    return text.length <= maxLength
      ? text
      : `${text.substring(0, maxLength)}...`;
  }

  return (
    <Stack
      flexDirection="row"
      flexWrap="wrap"
      rowGap={3}
      columnGap={1}
      justifyContent="center"
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
            <button
              onClick={() => handleDelete(index)}
              className="text-red-500 absolute top-2 right-4"
            >
              ✖
            </button>
            <h3 className={styles.workflowIndex}>{index + 1}</h3>
            <div className={styles.workflowContent}>
              <div className={styles.workFlowElements}>
                <p>
                  <strong>Step:</strong> {item.step}
                </p>
              </div>
              <div className={styles.workFlowElements}>
                <p>
                  <strong>Role:</strong>
                </p>
                <Tooltip title={item.role.length > 12 ? item.role : ''}>
                  <span>{truncateText(item.role)}</span>
                </Tooltip>
              </div>
            </div>
          </Paper>
        </>
      ))}
    </Stack>
  );
}
