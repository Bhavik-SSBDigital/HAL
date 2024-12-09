import { useEffect, useState } from 'react';
// import CardDataStats from '../../components/CardDataStats';
import ChartOne from '../../components/Charts/ChartOne';
import ChartThree from '../../components/Charts/ChartThree';
import ChartTwo from '../../components/Charts/ChartTwo';
import moment from 'moment';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Button, Dialog, DialogTitle, Grid2, Stack } from '@mui/material';
import ChartFour from '../../components/Charts/ChartFour';

const Overall = () => {
  // ------------------states-----------------------------

  // charts option
  const [mainChartOption, setMainChartOption] = useState({
    series: [
      {
        name: 'Pending',
        data: [0, 0, 0, 0, 0, 0, 0],
      },
      {
        name: 'Completed',
        data: [0, 0, 0, 0, 0, 0, 0],
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
      // toolbar: { show: false },
      beforeMount: (_, config) => {
        if (config?.el) {
          config.el.addEventListener('touchstart', (e) => {
            e.stopPropagation(); // Prevent touch capture
          });
        }
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
      categories: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
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
  });
  // const [stepWiseChartOptions, setStepWiseChartOptions] = useState({});
  const [rejectedProcessChart, setRejectedProocessChart] = useState({
    series: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
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
      categories: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      floating: true,
      offsetY: -25,
      offsetX: -5,
    },
  });
  const [documentsDetailsChart, setDocumentDetailsChart] = useState({
    series: [],
    chart: {
      height: 350,
      type: 'line',
      // dropShadow: {
      //   enabled: true,
      //   color: '#000',
      //   top: 18,
      //   left: 7,
      //   blur: 10,
      //   opacity: 0.2,
      // },
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: true,
    },
    stroke: {
      curve: 'smooth',
    },
    title: {
      text: 'Documents Count Category Wise',
      align: 'center',
      margin: 5,
      offsetY: 20,
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#333',
      },
    },
    grid: {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5,
      },
    },
    markers: {
      size: 1,
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    },
    yaxis: {
      title: {
        text: 'Temperature',
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      floating: true,
      offsetY: -25,
      offsetX: -5,
    },
  });
  const [rejectedDocCatWise, setRejectedDocCatWise] = useState({
    title: {
      text: 'Rejected Documents Category Wise',
      left: 'center', // align center
      top: 5, // margin from top
      textStyle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
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
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    yAxis: {
      type: 'value',
    },
    series: [],
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
      let sendData: any = {};
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
        // setRejectedProcessesLoading(false);
        return;
      }
      const dateUrl: string =
        import.meta.env.VITE_BACKEND_URL + '/getProcessNumber';
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
          series: [
            {
              name: 'Pending',
              data: res.data?.processNumberWithDuration?.map(
                (item: any) => item.pendingProcessNumber,
              ),
            },
            {
              name: 'Completed',
              data: res.data?.processNumberWithDuration?.map(
                (item: any) => item.completedProcessNumber,
              ),
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
            beforeMount: (_, config) => {
              if (config?.el) {
                config.el.addEventListener('touchstart', (e) => {
                  e.stopPropagation(); // Prevent touch capture
                });
              }
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
            categories: res.data.processNumberWithDuration?.map((item: any) => {
              const isDate = moment(item.time, moment.ISO_8601, true).isValid();
              return isDate && selectedMainChartType !== 'yearly'
                ? moment(item.time).format('DD-MM-YYYY')
                : item.time;
            }),
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
        });
        setRejectedProocessChart({
          series: [
            {
              data:
                res.data?.processNumberWithDuration?.map(
                  (item: any) => item.revertedProcessNumber || 0,
                ) || [],
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
            categories:
              res.data.processNumberWithDuration?.map((item: any) => {
                const isDate = moment(
                  item.time,
                  moment.ISO_8601,
                  true,
                ).isValid();
                return isDate && selectedMainChartType !== 'yearly'
                  ? moment(item.time).format('DD-MM-YYYY')
                  : item.time;
              }) || [],
          },
          legend: {
            position: 'top',
            horizontalAlign: 'right',
            floating: true,
            offsetY: -25,
            offsetX: -5,
          },
        });
        setDocumentDetailsChart({
          series: Array.from(
            new Set(
              res.data.processNumberWithDuration
                .flatMap((item: any) =>
                  item.documentDetails.map((doc: any) => doc.workName),
                )
                .filter(Boolean), // Remove any falsy values
            ),
          ).map((docName) => ({
            name: docName,
            data: res.data.processNumberWithDuration.map((item: any) => {
              return (
                item.documentDetails.find(
                  (doc: any) => doc.workName === docName,
                )?.documentCount || 0
              );
            }),
          })),
          chart: {
            height: 350,
            type: 'line',
            // dropShadow: {
            //   enabled: true,
            //   color: '#000',
            //   top: 18,
            //   left: 7,
            //   blur: 10,
            //   opacity: 0.2,
            // },
            toolbar: {
              show: false,
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
            categories:
              res.data.processNumberWithDuration?.map((item: any) => {
                const isDate = moment(
                  item.time,
                  moment.ISO_8601,
                  true,
                ).isValid();
                return isDate && selectedMainChartType !== 'yearly'
                  ? moment(item.time).format('DD-MM-YYYY')
                  : item.time;
              }) || [],
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
        });
        setRejectedDocCatWise({
          title: {
            text: 'Rejected Documents Category Wise',
            left: 'center', // align center
            top: 5, // margin from top
            textStyle: {
              fontSize: 14,
              fontWeight: 'bold',
              color: '#333',
            },
          },
          tooltip: {
            trigger: 'axis',
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
            data: res.data.processNumberWithDuration.map((item: any) => {
              const isDate = moment(item.time, moment.ISO_8601, true).isValid();
              return isDate && selectedMainChartType !== 'yearly'
                ? moment(item.time).format('DD-MM-YYYY')
                : item.time;
            }),
          },
          yAxis: {
            type: 'value',
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
            data: res.data.processNumberWithDuration.map((item) => {
              return (
                item.documentDetails.find((doc) => doc.workName === docName)
                  ?.noOfRejectedDocuments || 0
              );
            }),
          })),
        });
      }
    } catch (error: any) {
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
      <Stack alignItems="flex-end" my={1}>
        <Button
          variant="contained"
          size="small"
          onClick={() => setIsFilterOpen(true)}
        >
          filter
        </Button>
      </Stack>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12 }}>
          <ChartOne data={mainChartOption} loading={mainChartLoading} />
        </Grid2>
        <Grid2 size={{ xs: 12, lg: 6 }}>
          <ChartTwo data={rejectedProcessChart} loading={mainChartLoading} />
        </Grid2>
        <Grid2 size={{ xs: 12, lg: 6 }}>
          <ChartThree data={documentsDetailsChart} loading={mainChartLoading} />
        </Grid2>
        <Grid2 size={{ xs: 12 }}>
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
