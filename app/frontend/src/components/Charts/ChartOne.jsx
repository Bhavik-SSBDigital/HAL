// import { ApexOptions } from 'apexcharts';
// import { useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import moment from 'moment';
import { useState } from 'react';
import ReactApexChart from 'react-apexcharts';

const ChartOne = ({ data, loading, handleView }) => {
  // console.log(data);
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const chartData = {
    series: [
      {
        name: 'Pending',
        data: data?.map((item) => item.pending),
      },
      {
        name: 'Completed',
        data: data?.map((item) => item.completed),
      },
    ],
    title: {
      text: 'Pending & Completed Processes',
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
      zoom: { enabled: false },
      animations: { enabled: false },
      events: {
        markerClick: function (chartContext, seriesIndex, opts) {
          const processes = data[opts.dataPointIndex].pendingProcesses;
          if (processes?.length) {
            setSelectedProcesses(processes);
          }
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        columnWidth: '55%',
        endingShape: 'rounded',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
    },
    xaxis: {
      categories: data?.map((item) => item.time),
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val;
        },
      },
    },
  };
  return (
    <>
      <Card sx={{ height: '450px', p: 2 }}>
        {!loading ? (
          <ReactApexChart
            options={chartData}
            series={chartData.series}
            type="area"
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
      <Dialog
        open={selectedProcesses.length}
        maxWidth="md"
        fullWidth
        onClose={() => setSelectedProcesses([])}
      >
        <DialogTitle
          sx={{
            margin: '10px',
            backgroundColor: 'var(--themeColor)',
            color: 'white',
          }}
          fontWeight={600}
        >
          Pending Processes
        </DialogTitle>
        <DialogContent sx={{ padding: '0px', margin: '10px' }}>
          <TableContainer sx={{ border: '1px solid lightgray' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Process Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>View Process</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedProcesses?.map((process, index) => (
                  <TableRow key={index}>
                    <TableCell>{process.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        onClick={() => handleView(process.name)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChartOne;
