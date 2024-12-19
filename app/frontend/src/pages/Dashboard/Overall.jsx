import { useEffect, useState } from 'react';
// import CardDataStats from '../../components/CardDataStats';
import ChartOne from '../../components/Charts/ChartOne';
import ChartThree from '../../components/Charts/ChartThree';
import ChartTwo from '../../components/Charts/ChartTwo';
import moment from 'moment';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogTitle,
  Divider,
  Grid2,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChartFour from '../../components/Charts/ChartFour';
import { useNavigate } from 'react-router-dom';
import {
  IconClock,
  IconClockCog,
  IconFilesOff,
  IconFileUpload,
} from '@tabler/icons-react';

const Overall = () => {
  // ------------------states-----------------------------
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const token = sessionStorage.getItem('accessToken');
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
  const handleView = (name) => {
    const url = `/dashboard/timeLine?data=${name}`;
    navigate(url);
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
      const dateUrl = backendUrl + '/getProcessNumber';
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
            type: 'line',
            smooth: true,
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
              : item?.time,
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
          time: res?.data?.processNumberWithDuration?.map((item) =>
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
  const [statistics, setStatistics] = useState({
    Tat: 0,
    PendingProcesses: 0,
    docsUploaded: 0,
    rejectionPercentage: 0,
  });
  const getStatistics = async () => {
    const url = backendUrl + '/getProcessStatistics';
    try {
      const response = await axios.post(url, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatistics({
        Tat: response.data.average_TAT_to_complete_the_process,
        PendingProcesses: response.data.total_pending_processes,
        docsUploaded: response.data.docsUploaded,
        rejectionPercentage: response.data.rejectionPercentage,
      });
    } catch (error) {
      console.log(error?.response?.data?.message || error?.message);
    }
  };
  useEffect(() => {
    getMainChartData();
    getStatistics();
  }, []);
  return (
    <>
      <Grid2 container spacing={2} my={2}>
        {/* Pending Processes Card */}
        <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: 2,
              height: '100%',
              borderRadius: '12px',
              gap: 2,
            }}
          >
            <Box>
              <IconClockCog size={48} color="#999999" />
            </Box>
            <Divider flexItem orientation="vertical" />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <Typography variant="body1" color="textSecondary">
                Pending Processes
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {statistics.PendingProcesses}
              </Typography>
            </Box>
          </Card>
        </Grid2>

        {/* Turn Around Time Card */}
        <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: 2,
              height: '100%',
              borderRadius: '12px',
              gap: 2,
            }}
          >
            <Box>
              <IconClock size={48} color="#999999" />
            </Box>
            <Divider flexItem orientation="vertical" />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <Typography variant="body1" color="textSecondary">
                Turn Around Time
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {statistics.Tat}
              </Typography>
            </Box>
          </Card>
        </Grid2>

        {/* documents count Card */}
        <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: 2,
              height: '100%',
              borderRadius: '12px',

              gap: 2,
            }}
          >
            <Box>
              <IconFileUpload size={48} color="#999999" />
            </Box>
            <Divider flexItem orientation="vertical" />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <Typography variant="body1" color="textSecondary">
                Documents Uploaded
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {statistics.docsUploaded}
              </Typography>
            </Box>
          </Card>
        </Grid2>

        {/* documents rejected percentage Card */}
        <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: 2,
              height: '100%',
              borderRadius: '12px',

              gap: 2,
            }}
          >
            <Box>
              <IconFilesOff size={48} color="#999999" />
            </Box>
            <Divider flexItem orientation="vertical" />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <Typography variant="body1" color="textSecondary">
                Documents Rejection Percentage
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {statistics.rejectionPercentage}%
              </Typography>
            </Box>
          </Card>
        </Grid2>
      </Grid2>

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
          <ChartThree data={documentsDetailsChart} loading={mainChartLoading} />
        </Grid2>
        <Grid2 size={{ xs: 12 }}>
          <ChartFour data={rejectedDocCatWise} loading={mainChartLoading} />
        </Grid2>
      </Grid2>
      <Dialog
        maxWidth="xs"
        fullWidth
        onClose={closeFilterDialog}
        open={isFilterOpen}
      >
        <DialogTitle
          sx={{
            textAlign: 'center',
            background: 'var(--themeColor)',
            margin: '10px',
            color: 'white',
          }}
        >
          Filters
        </DialogTitle>
        <Stack
          mx={2}
          // p={1}
          justifyContent="center"
          alignItems="center"
          gap={1}
          sx={{ minWidth: '200px' }}
        >
          <TextField
            select
            label="Type"
            id="mainChartOptions"
            fullWidth
            value={selectedMainChartType}
            onChange={handleMainChartType}
          >
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </TextField>
          {selectedMainChartType === 'monthly' && (
            <TextField
              select
              id="yearOptions"
              fullWidth
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {yearList.map((year) => (
                <MenuItem value={year} key={year}>
                  {year}
                </MenuItem>
              ))}
            </TextField>
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
                <TextField
                  type="date"
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
                <TextField
                  type="date"
                  name="endDate"
                  // className={styles.dateInputs}

                  onChange={handleMainChartDateChange}
                />
              </Stack>
            </Stack>
          )}
          <Button
            size="small"
            variant="contained"
            sx={{ mt: 2 }}
            disabled={mainChartLoading}
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
