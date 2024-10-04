import { useEffect, useState } from 'react';
// import CardDataStats from '../../components/CardDataStats';
import ChartOne from './Charts/ChartOne';
import ChartThree from './Charts/ChartThree';
import ChartTwo from './Charts/ChartTwo';
import moment from 'moment';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Button, Dialog, DialogTitle, Grid, Grid2, Stack } from '@mui/material';
import ChartFour from './Charts/ChartFour';

const Overall = () => {
  // ------------------states-----------------------------

  // charts option
  const [mainChartOption, setMainChartOption] = useState({
    title: {
      text: 'Pending & Completed Processes',
      left: 'center',
      top: 20,
      textStyle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow', // Shadow for bar charts
      },
    },
    legend: {
      top: 40,
      data: ['Pending', 'Completed'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
    },
    yAxis: {
      type: 'category',
      data: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], // Categories
    },
    series: [
      {
        name: 'Pending',
        type: 'bar',
        data: [0, 0, 0, 0, 0, 0, 0], // Pending data
        itemStyle: {
          borderRadius: [0, 10, 10, 0], // Rounded bar end
        },
        barWidth: '55%',
      },
      {
        name: 'Completed',
        type: 'bar',
        data: [0, 0, 0, 0, 0, 0, 0], // Completed data
        itemStyle: {
          borderRadius: [0, 10, 10, 0], // Rounded bar end
        },
        barWidth: '55%',
      },
    ],
  });

  // const [stepWiseChartOptions, setStepWiseChartOptions] = useState({});
  const [rejectedProcessChart, setRejectedProcessChart] = useState({
    title: {
      text: 'Reject Processes Numbers',
      left: 'center',
      top: 20,
      textStyle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow', // Shadow pointer for bar chart
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], // Default categories for the initial state
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: 'Rejected',
        type: 'bar',
        data: [0, 0, 0, 0, 0, 0, 0], // Default data values for the initial state
        itemStyle: {
          borderRadius: 4, // Rounded corners for bars
        },
        barWidth: '55%',
      },
    ],
    legend: {
      top: 20,
      right: 10,
      orient: 'horizontal',
    },
    toolbox: {
      feature: {
        saveAsImage: {}, // Option to save chart as an image
      },
    },
  });

  const [documentsDetailsChart, setDocumentDetailsChart] = useState({
    title: {
      text: 'Documents Count Category Wise',
      left: 'center',
      top: 5,
      textStyle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
      },
    },
    grid: {
      borderColor: '#e7e7e7',
      containLabel: true,
      bottom: '10%',
      left: '3%',
      right: '4%',
    },
    xAxis: {
      type: 'category',
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}',
      },
    },
    series: [
      {
        name: 'Category 1',
        type: 'line',
        smooth: true,
        data: [0, 0, 0, 0, 0, 0, 0], // Initial placeholder data
        symbolSize: 6, // Marker size
        lineStyle: {
          width: 2,
        },
      },
    ],
    legend: {
      top: 'top',
      right: 'center',
      orient: 'horizontal',
    },
    dataLabels: {
      enabled: true,
    },
    stroke: {
      curve: 'smooth',
    },
  });

  const [rejectedDocCatWise, setRejectedDocCatWise] = useState({
    title: {
      text: 'Rejected Documents Category Wise',
      left: 'center', // Align center
      top: 5, // Margin from top
      textStyle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis', // Show tooltip on axis interaction
      axisPointer: {
        type: 'line', // Display a line for the tooltip
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true, // Ensure labels are contained within the grid
    },
    toolbox: {
      feature: {
        saveAsImage: {}, // Enable image saving feature
      },
    },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // Initial categories for the x-axis
      axisLabel: {
        interval: 0, // Show all labels
        rotate: 45, // Rotate labels for better visibility
      },
    },
    yAxis: {
      type: 'value', // Numeric axis
      name: 'Rejected Documents', // Add y-axis title
      axisLabel: {
        formatter: '{value}', // Format y-axis labels
      },
    },
    series: [], // Initially empty series
  });

  // inputs
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedMainChartType, setSelectedMainChartType] = useState('weekly');
  const [mainChartLoading, setMainChartLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');

  const [mainChartDateRange, setMainChartDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const yearList = Array.from(
    { length: new Date().getFullYear() - new Date().getFullYear() + 7 },
    (_, index) => new Date().getFullYear() - index,
  );

  // handlers
  const handleMainChartType = (e) => {
    setSelectedMainChartType(e.target.value);
  };
  const closeFilterDialog = () => {
    setIsFilterOpen(false);
  };
  const handleMainChartDateChange = (e) => {
    const { name, value } = e.target;
    setMainChartDateRange((prev) => ({ ...prev, [name]: value }));
  };

  // get dashboard data
  const getMainChartData = async () => {
    setMainChartLoading(true);
    // setRejectedProcessesLoading(true);
    try {
      let sendData = {};
      if (
        selectedMainChartType === 'weekly' ||
        selectedMainChartType === 'yearly'
      ) {
        sendData = {
          duration: selectedMainChartType,
        };
      } else if (mainChartDateRange.startDate && mainChartDateRange.endDate) {
        sendData = {
          duration: selectedMainChartType,
          customDuration: {
            startDate: mainChartDateRange.startDate,
            endDate: mainChartDateRange.endDate,
          },
        };
      } else if (selectedMainChartType === 'monthly') {
        if (!selectedYear) {
          toast.info('Please select a year');
          setMainChartLoading(false);
          // setRejectedProcessesLoading(false);
          return;
        }
        sendData = {
          duration: selectedMainChartType,
          year: selectedYear,
        };
      } else {
        toast.error('Invalid selection');
        setMainChartLoading(false);
        return;
      }
      const dateUrl = import.meta.env.VITE_BACKEND_URL + '/getProcessNumber';
      const res = await axios.post(
        dateUrl,
        { ...sendData },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );
      if (res.status === 200) {
        setMainChartOption({
          title: {
            text: 'Pending & Completed Processes',
            left: 'center',
            top: 20,
            textStyle: {
              fontSize: 14,
              fontWeight: 'bold',
              color: '#333',
            },
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow', // for bar chart shadow effect
            },
          },
          legend: {
            top: 40,
            data: ['Pending', 'Completed'],
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true,
          },
          xAxis: {
            type: 'value',
          },
          yAxis: {
            type: 'category',
            data: res.data?.processNumberWithDuration?.map((item) => {
              const isDate = moment(item.time, moment.ISO_8601, true).isValid();
              return isDate && selectedMainChartType !== 'yearly'
                ? moment(item.time).format('DD-MM-YYYY')
                : item.time;
            }),
          },
          series: [
            {
              name: 'Pending',
              type: 'bar',
              data: res.data?.processNumberWithDuration?.map(
                (item) => item.pendingProcessNumber,
              ),
              itemStyle: {
                borderRadius: [0, 10, 10, 0], // Rounded corners
              },
              barWidth: '55%',
            },
            {
              name: 'Completed',
              type: 'bar',
              data: res.data?.processNumberWithDuration?.map(
                (item) => item.completedProcessNumber,
              ),
              itemStyle: {
                borderRadius: [0, 10, 10, 0], // Rounded corners
              },
              barWidth: '55%',
            },
          ],
        });

        setRejectedProcessChart({
          title: {
            text: 'Reject Processes Numbers',
            left: 'center',
            top: 20,
            textStyle: {
              fontSize: 14,
              fontWeight: 'bold',
              color: '#333',
            },
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow', // For bar chart shadow effect
            },
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true,
          },
          xAxis: {
            type: 'category',
            data: res.data?.processNumberWithDuration?.map((item) => {
              const isDate = moment(item.time, moment.ISO_8601, true).isValid();
              return isDate && selectedMainChartType !== 'yearly'
                ? moment(item.time).format('DD-MM-YYYY')
                : item.time;
            }) || [],
          },
          yAxis: {
            type: 'value',
          },
          series: [
            {
              name: 'Rejected',
              type: 'bar',
              data: res.data?.processNumberWithDuration?.map(
                (item) => item.revertedProcessNumber || 0,
              ) || [],
              itemStyle: {
                borderRadius: 4, // Apply border radius to bars
              },
              barWidth: '55%',
            },
          ],
          legend: {
            top: 20,
            right: 10,
            orient: 'horizontal',
          },
          toolbox: {
            feature: {
              saveAsImage: {},
            },
          },
        });

        setDocumentDetailsChart({
          title: {
            text: 'Documents Counts Category Wise',
            left: 'center',
            top: 20,
            textStyle: {
              fontSize: 14,
              fontWeight: 'bold',
              color: '#333',
            },
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'line',
            },
          },
          grid: {
            borderColor: '#e7e7e7',
            containLabel: true,
            bottom: '10%',
            left: '3%',
            right: '4%',
          },
          xAxis: {
            type: 'category',
            data:
              res.data.processNumberWithDuration?.map((item) => {
                const isDate = moment(item.time, moment.ISO_8601, true).isValid();
                return isDate && selectedMainChartType !== 'yearly'
                  ? moment(item.time).format('DD-MM-YYYY')
                  : item.time;
              }) || [],
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: '{value}',
            },
          },
          series: Array.from(
            new Set(
              res.data.processNumberWithDuration
                .flatMap((item) => item.documentDetails.map((doc) => doc.workName))
                .filter(Boolean), // Remove falsy values
            ),
          ).map((docName) => ({
            name: docName,
            type: 'line',
            smooth: true, // Smooth curve
            data: res.data.processNumberWithDuration.map((item) => {
              return (
                item.documentDetails.find((doc) => doc.workName === docName)
                  ?.documentCount || 0
              );
            }),
            symbolSize: 6, // Marker size
            lineStyle: {
              width: 2,
            },
          })),
          legend: {
            top: 'top',
            left: 'center',
            orient: 'horizontal',
            data: Array.from(
              new Set(
                res.data.processNumberWithDuration
                  .flatMap((item) => item.documentDetails.map((doc) => doc.workName))
                  .filter(Boolean),
              ),
            ),
          },
        });

        setRejectedDocCatWise({
          title: {
            text: 'Rejected Documents Category Wise',
            left: 'center', // Align center
            top: 5, // Margin from top
            textStyle: {
              fontSize: 14,
              fontWeight: 'bold',
              color: '#333',
            },
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'line',
            },
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true,
          },
          toolbox: {
            feature: {
              saveAsImage: {},
            },
          },
          xAxis: {
            type: 'category',
            data: res.data.processNumberWithDuration.map((item) => {
              const isDate = moment(item.time, moment.ISO_8601, true).isValid();
              return isDate && selectedMainChartType !== 'yearly'
                ? moment(item.time).format('DD-MM-YYYY')
                : item.time;
            }),
            axisLabel: {
              interval: 0, // Show all labels
              rotate: 45, // Rotate labels for better visibility
            },
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: '{value}', // Format label values
            },
          },
          series: Array.from(
            new Set(
              res.data.processNumberWithDuration
                .flatMap((item) =>
                  item.documentDetails.map((doc) => doc.workName),
                )
                .filter(Boolean),
            ),
          ).map((docName) => ({
            name: docName,
            type: 'line',
            smooth: true, // Smooth line
            data: res.data.processNumberWithDuration.map((item) => {
              return (
                item.documentDetails.find((doc) => doc.workName === docName)
                  ?.noOfRejectedDocuments || 0
              );
            }),
            symbolSize: 6, // Size of the point markers
            lineStyle: {
              width: 2, // Width of the line
            },
          })),
        });

      }
    } catch (error) {
      toast.error('something is wrong');
    }
    // setSelectedMainChartType("");
    setMainChartLoading(false);
    // setRejectedProcessesLoading(false);
  };
  useEffect(() => {
    getMainChartData();
  }, []);
  return (
    <>
      <Stack alignItems="flex-end">
        <Button
          variant="contained"
          size="small"
          sx={{ marginX: 1.4, mt: 2 }}
          onClick={() => setIsFilterOpen(true)}
        >
          filter
        </Button>
      </Stack>
      <Grid2 container>
        <Grid2 item size={{ xs: 12 }}>
          <ChartOne data={mainChartOption} loading={mainChartLoading} />
        </Grid2>
        <Grid2 item size={{ xs: 12, lg: 6 }}>
          <ChartTwo data={rejectedProcessChart} loading={mainChartLoading} />
        </Grid2>
        <Grid2 item size={{ xs: 12, lg: 6 }}>
          <ChartThree data={documentsDetailsChart} loading={mainChartLoading} />
        </Grid2>
        <Grid2 item size={{ xs: 12 }}>
          <ChartFour data={rejectedDocCatWise} loading={mainChartLoading} />
        </Grid2>
      </Grid2>
      <Dialog onClose={closeFilterDialog} open={isFilterOpen}>
        <DialogTitle sx={{ textAlign: 'center' }}>Filters</DialogTitle>
        <Stack
          mx={2}
          p={1}
          justifyContent="center"
          alignItems="center"
          gap={1}
          sx={{ minWidth: '200px' }}
        >
          {/* <Typography variant="h6" sx={{ textAlign: 'center' }}>
            Apply filters
          </Typography> */}
          <select
            id="mainChartOptions"
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '8px',
              border: '1px solid',
            }}
            value={selectedMainChartType}
            onChange={handleMainChartType}
          >
            <option value="">select</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
          {selectedMainChartType === 'monthly' && (
            <select
              id="yearOptions"
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid',
              }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="" disabled>
                select
              </option>
              {yearList.map((year) => (
                <option value={year} key={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
          {selectedMainChartType === 'custom' && (
            <Stack spacing={2} alignItems="center">
              <Stack
                direction="row"
                spacing={1}
                justifyContent="space-between"
                width={300}
                alignItems="center"
              >
                <h4>Select Start Date:</h4>
                <input
                  type="date"
                  style={{
                    border: '1px solid',
                    borderRadius: '6px',
                    padding: '4px',
                  }}
                  name="startDate"
                  // className={styles.dateInputs}
                  onChange={handleMainChartDateChange}
                />
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                justifyContent="space-between"
                width={300}
                alignItems="center"
              >
                <h4>Select End Date:</h4>
                <input
                  type="date"
                  name="endDate"
                  // className={styles.dateInputs}
                  style={{
                    border: '1px solid',
                    borderRadius: '6px',
                    padding: '4px',
                  }}
                  onChange={handleMainChartDateChange}
                />
              </Stack>
            </Stack>
          )}
          <Button
            size="small"
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => {
              getMainChartData();
              setIsFilterOpen(false);
            }}
          >
            Apply
          </Button>
        </Stack>
      </Dialog>
    </>
  );
};

export default Overall;
