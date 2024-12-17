// import { ApexOptions } from 'apexcharts';
// import React, { useState } from 'react';
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
import { useState } from 'react';
import ReactApexChart from 'react-apexcharts';

const ChartTwo = ({ data, loading, handleView }) => {
  const [selectedProcesses, setSelectedProcesses] = useState([]);
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
      events: {
        dataPointSelection: function (chartContext, seriesIndex, opts) {
          const processes = data[opts.dataPointIndex].rejectedProcesses;
          console.log(processes);
          if (processes?.length) {
            setSelectedProcesses(processes);
          }
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      },
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
    <>
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
      <Dialog
        open={selectedProcesses.length}
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

export default ChartTwo;
