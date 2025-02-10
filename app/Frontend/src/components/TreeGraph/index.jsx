import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import styles from './TreeGraph.module.css';
import { getDepartmentsHierarchy } from '../../common/Apis';

const TreeGraph = ({ data, loading }) => {
  const getOption = () => ({
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
    },
    series: [
      {
        type: 'tree',
        data: data ? data : [],
        left: '2%',
        right: '2%',
        top: '8%',
        bottom: '20%',
        symbol: 'emptyCircle',
        symbolSize: 12,
        orient: 'TB', // Changed to vertical layout (Top to Bottom)
        expandAndCollapse: true,
        label: {
          position: 'top',
          rotate: 0, // Ensuring readability
          verticalAlign: 'middle',
          align: 'center',
          fontSize: 16,
        },
        leaves: {
          label: {
            position: 'bottom',
            rotate: 0,
            verticalAlign: 'middle',
            align: 'center',
          },
        },
        animationDurationUpdate: 750,
      },
    ],
  });

  return (
    <div className={styles.container}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      ) : (
        <ReactECharts option={getOption()} />
      )}
    </div>
  );
};

export default TreeGraph;
