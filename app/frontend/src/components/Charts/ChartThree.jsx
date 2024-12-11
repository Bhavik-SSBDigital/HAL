import { Card } from '@mui/material';
import ReactApexChart from 'react-apexcharts';

const ChartThree = ({ data, loading, handleView }) => {
  const chartOption = {
    series: data?.series,
    chart: {
      height: 350,
      type: 'line',
      toolbar: {
        show: false,
      },
      events: {
        markerClick: function (chartContext, seriesIndex, opts) {
          const processes = data[opts.dataPointIndex];
          console.log(opts);
          // if (processes?.length) {
          //   setSelectedProcesses(processes);
          //   console.log(processes);
          // }
        },
      },
    },
    dataLabels: {
      enabled: true,
    },
    stroke: {
      curve: 'smooth',
    },
    title: {
      text: 'Documents Counts Category Wise',
      align: 'center',
      margin: 5,
      offsetY: -3,
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#333',
      },
    },
    grid: {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
        opacity: 0.5,
      },
    },
    markers: {
      size: 1,
    },
    xaxis: {
      categories: data?.time,
    },
    yaxis: {
      title: {
        text: 'Documents Count',
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      floating: true,
      offsetY: -15,
      offsetX: -5,
    },
  };
  return (
    <Card sx={{ height: '450px', p: 2 }}>
      {!loading ? (
        <ReactApexChart
          options={chartOption}
          series={chartOption?.series}
          type="line"
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

export default ChartThree;
