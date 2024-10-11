// import { ApexOptions } from 'apexcharts';
// import React, { useState } from 'react';
import { Card } from '@mui/material';
import ReactApexChart from 'react-apexcharts';

const ChartTwo = ({ data, loading }) => {
  return (
    <Card sx={{ height: '450px', p: 2 }}>
      {!loading ? (
        <ReactApexChart
          options={data}
          series={data?.series}
          type="bar"
          height={'100%'}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <h3>loading....</h3>
        </div>
      )}
    </Card>
  );
};

export default ChartTwo;
