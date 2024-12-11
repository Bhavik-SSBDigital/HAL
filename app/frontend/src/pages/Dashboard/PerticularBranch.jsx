import React, { useEffect, useState } from 'react';
// import CardDataStats from '../../components/CardDataStats';
import ChartOne from '../../components/Charts/ChartOne';
import ChartThree from '../../components/Charts/ChartThree';
import ChartTwo from '../../components/Charts/ChartTwo';
import moment from 'moment';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid2,
  IconButton,
  Stack,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ChartFive from '../../components/Charts/ChartFive';
import { useNavigate } from 'react-router-dom';
import ChartFour from '../../components/Charts/ChartFour';
import sessionData from '../../Store';
import { IconX } from '@tabler/icons-react';
const PerticularBranch = () => {
  const {
    dashBranch,
    setDashBranch,
    dashDepartment,
    setDashDepartment,
    dashId,
    setDashId,
  } = sessionData();
  console.log(dashId);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const accessToken = sessionStorage.getItem('accessToken');
  // ------------------states-----------------------------
  const [branches, setBranches] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  // const [mainChartLoading, setMainChartLoading] = useState(false);
  const [processNameList, setProcessNameList] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  // charts option
  const [mainChartOption, setMainChartOption] = useState({});
  const [stepWiseChartOptions, setStepWiseChartOptions] = useState({});
  const [rejectedProcessChart, setRejectedProocessChart] = useState();
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
  const [mainChartLoading, setMainChartLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const token = sessionStorage.getItem('accessToken');

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
  const handleSelectProcess = (_event, newValue) => {
    setSelectedProcess(newValue);
  };
  const closeFilterDialog = () => {
    setIsFilterOpen(false);
  };
  const handleMainChartDateChange = (e) => {
    const { name, value } = e.target;
    setMainChartDateRange((prev) => ({ ...prev, [name]: value }));
  };
  const [fileListOpen, setFileListOpen] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [fileListLoading, setFileListLoading] = useState(false);
  const getProcessFileNames = async (processName) => {
    setFileListLoading(true);
    const url = backendUrl + '/getDocNamesInProcess';
    try {
      const res = await axios.post(
        url,
        { processName },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setFileList(res.data.files || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setFileListLoading(false);
    }
  };
  const handleView = () => {
    console.log('data');
  };

  // show timeline
  const navigate = useNavigate();
  const showPerticularProcessData = (process) => {
    if (selectedProcess === null || selectedProcess === '') {
      toast.info('please select process');
      return;
    } else {
      navigate(`/dashboard/timeLine?data=${encodeURIComponent(process)}`);
    }
  };
  // get dashboard data
  const fetchBranches = async () => {
    const url = backendUrl + '/getBranchesWithDepartments';
    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setBranches(data.branches);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  const [stepWiseChartLoading, setStepWiseChartLoading] = useState(false);
  const getStepWisePendingProcesses = async () => {
    setStepWiseChartLoading(true);
    if (
      !selectedBranch ||
      (selectedBranch.toLowerCase() === 'headoffice' && !selectedDepartment)
    ) {
      return;
    } else {
      setDashBranch(selectedBranch);
      setDashDepartment(selectedDepartment);
      let id;
      if (selectedBranch.toLowerCase() === 'headoffice') {
        const branch = branches.find(
          (item) => item.name.toLowerCase() === selectedBranch.toLowerCase(),
        );
        const department = branch.departments.find(
          (item) => item.name === selectedDepartment,
        );
        id = department._id;
      } else {
        const branch = branches.find(
          (item) => item.name.toLowerCase() === selectedBranch.toLowerCase(),
        );
        id = branch.departments[0]._id;
      }
      // setStepWiseLoading(true);
      console.log('step 1');
      try {
        const url = backendUrl + '/getPendingProcessCountPerStepInDepartment';
        const res = await axios.post(
          url,
          {
            department: id,
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        console.log('step asas');
        if (res.status === 200) {
          setStepWiseChartOptions({
            title: {
              text: 'Step wise pending processes',
              left: 'center',
            },
            toolbox: {
              feature: {
                saveAsImage: {},
              },
            },
            tooltip: {
              trigger: 'item',
              formatter: function (params) {
                const dataIndex = params.dataIndex;
                const detail = res.data.processesPerStep[dataIndex];
                return `${params.seriesName} <br/>
                    <b>Work:</b> ${detail.step.work} <br/>
                    <b>User:</b> ${detail.step.users
                      .map((user) => user.user)
                      .join(', ')} <br/>
                    (${params.percent}%)`;
              },
            },
            legend: {
              orient: 'horizontal', // Set the orientation to horizontal
              bottom: 10, // Adjust the bottom position
            },
            series: [
              {
                name: 'Pending processes deatils',
                type: 'pie',
                radius: '50%',
                center: ['50%', '50%'],
                data: res.data.processesPerStep.map((item) => ({
                  value: item.noOfPendingProcesses,
                  step: item.step,
                  name: `${item.step.work} - ${item.step.users
                    .map((user) => user.user)
                    .join(', ')}`,
                  processes: item?.pendingProcesses,
                })),
                emphasis: {
                  itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)',
                  },
                },
                label: {
                  show: true,
                  position: 'outside',
                  formatter: '{b}: {c}', // Display name and value in the label
                  minShowLabelAngle: 5,
                  forceToShow: true,
                },
              },
            ],
          });
          setProcessNameList(res?.data?.pendingProcessNames);
          console.log('step 2');
        }
        console.log('step 3');
      } catch (error) {
        console.error(error, 'error');
      } finally {
        console.log('step 4');
        setStepWiseChartLoading(false);
      }
      console.log('step last');
      // setStepWiseLoading(false);
      console.log(id + ' id');
      setDashId(id);
    }
  };
  const getPerticularBranchData = async () => {
    if (!selectedBranch) {
      toast.info('Please select a branch.');
      return;
    }

    if (selectedBranch === 'headOffice' && !selectedDepartment) {
      toast.info('Please select a department.');
      return;
    }
    setMainChartLoading(true);
    let id;
    let sendData;
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
        return;
      }
      sendData = {
        duration: selectedMainChartType,
        year: selectedYear,
      };
    } else {
      toast.error('Invalid selection');
      return;
    }
    if (selectedBranch?.toLowerCase() === 'headoffice') {
      const branch = branches.find(
        (item) => item.name.toLowerCase() === selectedBranch?.toLowerCase(),
      );
      const department = branch.departments.find(
        (item) => item.name === selectedDepartment,
      );
      id = department._id;
    } else {
      const branch = branches.find(
        (item) => item.name.toLowerCase() === selectedBranch?.toLowerCase(),
      );
      id = branch.departments[0]._id;
    }
    try {
      const url = backendUrl + `/getProcessNumber`;
      const res = await axios.post(
        url,
        {
          department: id,
          ...sendData,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );
      if (res.status === 200) {
        setMainChartOption(
          res?.data?.processNumberWithDuration.map((item) => ({
            completed: item.completedProcessNumber || 0,
            pending: item.pendingProcessNumber || 0,
            time: moment(item.time).format('DD-MM-YYY'),
            pendingProcesses: item.pendingProcesses || [],
          })),
        );
        setRejectedProocessChart(
          res.data?.processNumberWithDuration?.map((item) => ({
            pending: item?.revertedProcessNumber || 0,
            time: moment(item.time).format('DD-MM-YYYY'),
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
            item.time ? moment(item.time).format('DD-MM-YYYY') : 0,
          ),
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
            data: res.data.processNumberWithDuration.map((item) => {
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
    } catch (error) {
      toast.error('unable to fetch perticular branch data!!!');
    }
    setMainChartLoading(false);
  };
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const getBranchList = async () => {
      await fetchBranches();
      if (dashId) {
        setSelectedDepartment(dashDepartment);
        setSelectedBranch(dashBranch);
        setLoaded(true);
      }
    };
    getBranchList();
  }, []);
  useEffect(() => {
    if (loaded) {
      getPerticularBranchData();
      getStepWisePendingProcesses();
    }
  }, [loaded]);
  return (
    <>
      <Stack
        m={2}
        p={1}
        justifyContent="center"
        alignItems="center"
        gap={1}
        sx={{ minWidth: '200px', minHeight: '200px' }}
      >
        <label htmlFor="selectBranch">
          <b>Select any branch to show perticular data :</b>
        </label>
        <select
          id="selectBranch"
          style={{
            width: '100%',
            height: '50px',
            borderRadius: '8px',
            padding: '5px',
          }}
          value={selectedBranch}
          disabled={mainChartLoading}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <option value="" disabled selected>
            Select Branch
          </option>
          {branches
            .filter((item) => item.departments.length > 0)
            .map((item) => {
              return <option value={item.name}>{item.name}</option>;
            })}
        </select>
        {selectedBranch?.toLowerCase() === 'headoffice' && (
          <select
            id="selectDepartments"
            style={{
              width: '100%',
              height: '50px',
              borderRadius: '8px',
              padding: '5px',
            }}
            value={selectedDepartment}
            disabled={mainChartLoading}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="" disabled selected>
              Select Department
            </option>
            {branches
              .find((item) => item.name === selectedBranch)
              ?.departments.map((item) => {
                return <option value={item.name}>{item.name}</option>;
              })}
          </select>
        )}
        <Button
          variant="contained"
          sx={{ mt: 1 }}
          disabled={mainChartLoading}
          onClick={() => {
            getPerticularBranchData();
            getStepWisePendingProcesses();
          }}
        >
          {mainChartLoading ? <CircularProgress size={30} /> : 'Get'}
        </Button>
      </Stack>
      <>
        {Object.keys(mainChartOption)?.length ? (
          <Stack alignItems="flex-end">
            <Button
              variant="contained"
              size="small"
              sx={{ mb: 1 }}
              onClick={() => setIsFilterOpen(true)}
            >
              filter
            </Button>
          </Stack>
        ) : null}

        {Object.keys(mainChartOption).length ? (
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
            <Grid2 size={{ xs: 12 }}>
              <ChartFive
                data={stepWiseChartOptions}
                loading={stepWiseChartLoading}
              />
            </Grid2>
          </Grid2>
        ) : null}
        <Dialog onClose={closeFilterDialog} open={isFilterOpen}>
          <Stack
            mx={2}
            p={1}
            justifyContent="center"
            alignItems="center"
            gap={1}
            sx={{ minWidth: '200px', minHeight: '200px' }}
          >
            <Typography variant="h6" sx={{ textAlign: 'center' }}>
              Apply filters
            </Typography>
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
                    name="startDate"
                    // className={styles.dateInputs}
                    style={{
                      border: '1px solid',
                      borderRadius: '6px',
                      padding: '4px',
                    }}
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
                    style={{
                      border: '1px solid',
                      borderRadius: '6px',
                      padding: '4px',
                    }}
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
              onClick={() => {
                getPerticularBranchData();
                getStepWisePendingProcesses();
                setIsFilterOpen(false);
              }}
            >
              Get
            </Button>
          </Stack>
        </Dialog>

        <Dialog
          open={fileListOpen}
          sx={{
            '& .MuiPaper-root': { maxWidth: '600px', width: '100%' },
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
          }}
          onClose={() => (fileListLoading ? null : setFileListOpen(false))}
        >
          <DialogTitle
            fontWeight={700}
            sx={{ background: '#4E327E', color: 'white' }}
          >
            Files List
            <IconButton
              aria-label="close"
              onClick={() => (fileListLoading ? null : setFileListOpen(false))}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                '&:hover': {
                  transform: 'rotate(90deg)',
                  transition: '1s ease',
                },
              }}
            >
              <IconX color="white" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ width: '100%' }}>
            {fileListLoading ? (
              <div
                style={{
                  height: '150px',
                  width: '250px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <CircularProgress size={30} />
              </div>
            ) : (
              <TableContainer
                sx={{
                  maxHeight: '350px',
                  width: '100%',
                  border: '1px solid lightgray',
                  borderRadius: '7px',
                }}
              >
                <Table sx={{ width: '100%' }}>
                  <TableHead
                    sx={{ position: 'sticky', top: '0px', background: 'white' }}
                  >
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '16px' }}>
                        SR_NO
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '16px' }}>
                        File
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  {fileList?.length ? (
                    fileList.map((file, index) => (
                      <TableRow>
                        <React.Fragment key={index}>
                          <TableCell>{index}</TableCell>
                          <TableCell>{file}</TableCell>
                        </React.Fragment>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2}>No files available</TableCell>
                    </TableRow>
                  )}
                </Table>
              </TableContainer>
            )}
          </DialogContent>
        </Dialog>
      </>
      {processNameList?.length && !mainChartLoading ? (
        <Stack justifyContent="center" flexDirection="row" gap={1} mt={1}>
          <Autocomplete
            id="selectBranch"
            options={processNameList}
            value={selectedProcess}
            renderOption={(props, option) => {
              return (
                <Stack
                  flexDirection="row"
                  alignItems="space-between"
                  component="li"
                  {...props}
                >
                  <span>{option}</span>
                  <Button
                    onClick={() => {
                      getProcessFileNames(option);
                      setFileListOpen(true);
                    }}
                  >
                    View Files
                  </Button>
                </Stack>
              );
            }}
            fullWidth
            // size='small'
            sx={{ background: 'white' }}
            onChange={handleSelectProcess}
            disabled={stepWiseChartLoading}
            renderInput={(params) => (
              <>
                <TextField
                  {...params}
                  label="Select an option"
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: <>{params.InputProps.endAdornment}</>,
                  }}
                />
              </>
            )}
          />
          <Button
            variant="contained"
            size="small"
            sx={{ height: '55px' }}
            disabled={stepWiseChartLoading}
            onClick={() => showPerticularProcessData(selectedProcess)}
          >
            Show Timeline
          </Button>
        </Stack>
      ) : null}
    </>
  );
};

export default PerticularBranch;
