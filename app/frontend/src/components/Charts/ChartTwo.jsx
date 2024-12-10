// import { ApexOptions } from 'apexcharts';
// import React, { useState } from 'react';
import { Card } from '@mui/material';
import ReactApexChart from 'react-apexcharts';

const ChartTwo = ({ data, loading }) => {
  console.log(data);
  const chartOption = {
    series: [
      {
        data: data?.map((item) => item?.pending),
      },
    ],
    title: {
      text: 'Reject Processes Numbers',
      align: 'center',
      margin: 5,
      offsetY: 20,
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#333',
      },
    },
    chart: {
      type: 'bar',
      height: 350,
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: data?.map((item) => item.time),
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      floating: true,
      offsetY: -25,
      offsetX: -5,
    },
  };
  return (
    <Card sx={{ height: '450px', p: 2 }}>
      {!loading ? (
        <ReactApexChart
          options={chartOption}
          series={chartOption?.series}
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
