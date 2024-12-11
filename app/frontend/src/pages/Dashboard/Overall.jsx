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
  const [mainChartOption, setMainChartOption] = useState();
  const [rejectedProcessChart, setRejectedProocessChart] = useState();
  const [documentsDetailsChart, setDocumentDetailsChart] = useState();
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
  const handleView = () => {
    console.log('asd');
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
        // setRejectedProcessesLoading(false);
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
        setMainChartOption(
          res.data.processNumberWithDuration.map((item) => ({
            completed: item.completedProcessNumber || 0,
            pending: item.pendingProcessNumber || 0,
            time:
              selectedMainChartType == 'weekly'
                ? moment(item.time).format('D-M-Y')
                : item.time,
            pendingProcesses: item.pendingProcesses || [],
          })),
        );
        setRejectedProocessChart(
          res.data.processNumberWithDuration.map((item) => ({
            pending: item.revertedProcessNumber || 0,
            time:
              selectedMainChartType == 'weekly'
                ? moment(item.time).format('D-M-Y')
                : item.time,
            rejectedProcesses: item.revertedProcesses,
          })),
        );
        setDocumentDetailsChart({
          series: Array.from(
            new Set(
              res?.data?.processNumberWithDuration
                ?.flatMap((item) =>
                  item.documentDetails.map((doc) => doc.workName),
                )
                .filter(Boolean),
            ),
          ).map((docName) => ({
            name: docName,
            data: res?.data?.processNumberWithDuration?.map((item) => {
              const doc = item.documentDetails.find(
                (doc) => doc.workName === docName,
              );
              return doc ? doc.documentCount : 0; // Set to 0 if documentCount not found
            }),
            documents: res?.data?.processNumberWithDuration?.map((item) => {
              const doc = item.documentDetails.find(
                (doc) => doc.workName === docName,
              );
              return doc ? doc.documentsUploaded : []; // Return documentsUploaded or empty array
            }),
          })),
          time: res.data.processNumberWithDuration?.map((item) =>
            selectedMainChartType == 'weekly'
              ? moment(item.time).format('D-M-Y')
              : item.time,
          ),
        });

        setRejectedDocCatWise({
          series: Array.from(
            new Set(
              res?.data?.processNumberWithDuration
                ?.flatMap((item) =>
                  item.documentDetails.map((doc) => doc.workName),
                )
                .filter(Boolean),
            ),
          ).map((docName) => ({
            name: docName,
            type: 'bar',
            data: res?.data?.processNumberWithDuration?.map((item) => {
              const doc = item.documentDetails.find(
                (doc) => doc.workName === docName,
              );
              return doc ? doc.noOfRejectedDocuments : 0; // Set to 0 if documentCount not found
            }),
            documents: res?.data?.processNumberWithDuration?.map((item) => {
              const doc = item.documentDetails.find(
                (doc) => doc.workName === docName,
              );
              return doc ? doc.documentsReverted : []; // Return documentsUploaded or empty array
            }),
          })),
          time: res.data.processNumberWithDuration?.map((item) =>
            selectedMainChartType == 'weekly'
              ? moment(item.time).format('D-M-Y')
              : item.time,
          ),
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
          <ChartOne
            data={mainChartOption}
            loading={mainChartLoading}
            handleView={handleView}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, lg: 6 }}>
          <ChartTwo
            data={rejectedProcessChart}
            loading={mainChartLoading}
            handleView={handleView}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, lg: 6 }}>
          <ChartThree
            data={documentsDetailsChart}
            loading={mainChartLoading}
            handleView={handleView}
          />
        </Grid2>
        <Grid2 size={{ xs: 12 }}>
          <ChartFour
            data={rejectedDocCatWise}
            loading={mainChartLoading}
            handleView={handleView}
          />
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
