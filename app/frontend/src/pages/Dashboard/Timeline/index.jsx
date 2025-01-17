import React, { useEffect, useState } from 'react';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import Typography from '@mui/material/Typography';
import styles from './index.module.css';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
} from '@mui/material';
import axios from 'axios';
import moment from 'moment';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconAlertTriangleFilled,
  IconArrowRight,
  IconDiscountCheckFilled,
} from '@tabler/icons-react';
import { Button } from '@mui/material';
import { download } from '../../../components/drop-file-input/FileUploadDownload';
import View from '../../view/View';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import ComponentLoader from '../../../common/Loader/ComponentLoader';
const accessToken = sessionStorage.getItem('accessToken');

const index = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const d = params.get('data');
  const processName = decodeURIComponent(d);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [fileView, setFileView] = useState();
  const [selectedDep, setSelectedDep] = useState('');
  const [selectedDepLastStep, setSelectedDepLastStep] = useState(null);
  const navigate = useNavigate();
  const handleGoBack = () => {
    console.log(search);
    navigate(-1);
  };
  const handleViewClose = () => {
    setFileView(null);
  };
  const handleView = async (path, name) => {
    setLoading(true);
    try {
      const fileData = await download(name, path, true);
      if (fileData) {
        setFileView({ url: fileData.data, type: fileData.fileType });
        setLoading(false);
      } else {
        console.error('Invalid fileData:', fileData);
        alert('Invalid file data.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Unable to view the file.');
      setLoading(false);
    }
  };
  useEffect(() => {
    const getProcessData = async () => {
      const url = backendUrl + '/getProcessHistory';
      try {
        const res = await axios.post(
          url,
          { processName: processName },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        setData(res.data);
      } catch (error) {
        console.error('error', error);
        setData({});
      }
      setLoading(false);
    };
    getProcessData();
  }, []);

  const uniqueDepartments = data?.historyDetails
    ?.map((item) => item.belongingDepartment)
    .filter((name, index, array) => array.indexOf(name) === index);

  const selectedDepData = data?.workflows?.find(
    (item) => item.departmentName === selectedDep,
  );
  const skipped = [1, 2];
  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid lightgray',
        borderRadius: '10px',
      }}
    >
      {loading ? (
        <ComponentLoader />
      ) : Object.keys(data).length ? (
        <Stack flexDirection="row" sx={{ p: 2 }}>
          <div
            style={{
              width: '100%',
              maxHeight: 'fit-content',
              position: 'relative',
            }}
          >
            {!loading &&
            uniqueDepartments.length === 1 &&
            !data?.isInterBranchProcess ? (
              <>
                <Box sx={{ width: '100%', my: 2 }}>
                  <Stepper activeStep={data?.lastStepDone} alternativeLabel>
                    {data?.workFlow?.map((label, index) => (
                      <Step
                        key={label?.work}
                        sx={{
                          '& span span .Mui-completed': {
                            color: 'green !important',
                          },
                          '& span span .Mui-active': {
                            color: 'gray !important',
                          },
                        }}
                        completed={
                          data?.workflows[0]?.skippedStepNumbers?.includes(
                            index + 1,
                          )
                            ? false
                            : data?.lastStepDone >= index + 1
                            ? true
                            : false
                        }
                      >
                        <StepLabel>
                          <>
                            <p>
                              {label?.work} (
                              {label?.users
                                ?.map((user) => user.user)
                                .join(', ')}
                              )
                            </p>
                            <p style={{ mt: '10px' }}>
                              {data?.workflows[0]?.skippedStepNumbers?.includes(
                                index + 1,
                              ) ? (
                                <p style={{ color: 'red' }}>Skipped</p>
                              ) : data?.lastStepDone >= index + 1 ? (
                                ''
                              ) : (
                                <p style={{ color: 'orange' }}>Pending</p>
                              )}
                            </p>
                            <p>
                              {data?.workflows[0]?.isCompleted &&
                              data?.workflows[0]?.lastStepDone === index + 1
                                ? 'Process Completed Here'
                                : ''}
                            </p>
                          </>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
                <VerticalTimeline
                  lineColor="lightgray"
                  // style={{ maxWidth: "100%", padding: "10px" }}
                >
                  {data?.historyDetails?.map((item, index) => (
                    <VerticalTimelineElement
                      key={index}
                      date={moment(item.date).format('DD-MM-YYYY hh:mm')}
                      contentStyle={{
                        padding: '8px',
                        border: '1px solid lightgray',
                        borderBottom: '4px solid #2196f3',
                        boxShadow: 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
                      }}
                      contentArrowStyle={{
                        borderRight: '8px solid  #757575',
                        height: '12px',
                      }}
                      iconStyle={{
                        background: item.isReverted ? 'red' : 'green',
                        color: '#fff',
                      }}
                      style={{ boxShadow: 'none', padding: '0px' }}
                      icon={
                        item.isReverted ? (
                          <IconAlertTriangleFilled />
                        ) : (
                          <IconDiscountCheckFilled />
                        )
                      }
                    >
                      <Typography
                        variant="h6"
                        textAlign="left"
                        color={item.isReverted ? 'coral' : 'dodgerblue'}
                      >
                        {item.description}
                      </Typography>
                      <ol className={styles.DocList}>
                        {item.documentsInvolved.map((doc, docIndex) => (
                          <div className={styles.listDiv} key={docIndex}>
                            <li className={styles.listItem}>
                              <Stack>
                                <Stack alignItems="flex-start">
                                  <Box>
                                    <b>Document Name: </b>
                                    {doc.documentName}
                                  </Box>
                                </Stack>
                                <Stack
                                  flexDirection="row"
                                  columnGap={2}
                                  flexWrap="wrap"
                                >
                                  <Box>
                                    <b>Action:</b>{' '}
                                    {doc.change ? doc.change : 'No-action'}
                                  </Box>
                                  {doc?.change == 'rejection' ? (
                                    <Box>
                                      <b>Reason:</b> {doc?.reason}
                                    </Box>
                                  ) : null}
                                </Stack>
                              </Stack>
                              <Button
                                onClick={() =>
                                  handleView(
                                    data?.documentsPath,
                                    doc.documentName,
                                  )
                                }
                              >
                                view
                              </Button>
                            </li>
                          </div>
                        ))}
                      </ol>
                      {item.publishedTo.length > 0 && (
                        <>
                          <h4
                            style={{
                              marginTop: '10px',
                              display: 'inline-block',
                              color: 'green',
                            }}
                          >
                            Published To -
                          </h4>{' '}
                          <p style={{ display: 'inline-block' }}>
                            {item.publishedTo.join(', ')}
                          </p>
                        </>
                      )}
                    </VerticalTimelineElement>
                  ))}
                </VerticalTimeline>
              </>
            ) : (
              <>
                <Typography variant="h6" sx={{ fontWeight: '700' }}>
                  Select department to see timeline :
                </Typography>
                <Stack mt={2} flexDirection="row" gap={2}>
                  {uniqueDepartments?.map((item) => {
                    return (
                      <>
                        <Stack
                          justifyContent="center"
                          alignItems="center"
                          onClick={() => setSelectedDep(item)}
                          sx={{
                            height: '200px',
                            backgroundColor: 'white',
                            minWidth: '200px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            border: '1px solid lightgray',
                            '&:hover': {
                              transform: 'translateY(-10px)', // Move the stack up 10px
                              boxShadow: '0 8px 15px rgba(0, 0, 0, 0.15)',
                              border: '1px solid lightgray',
                            },
                            transition: 'transform 0.2s, box-shadow 0.2s',
                          }}
                        >
                          <h2>{item}</h2>
                        </Stack>
                      </>
                    );
                  })}
                </Stack>
                {selectedDep && (
                  <div
                    style={{
                      position: 'fixed',
                      height: '90vh',
                      width: '90vw',
                      top: '50%',
                      right: '50%',
                      overflow: 'auto',
                      transform: 'translate(50%, -50%)',
                      zIndex: 99999,
                      borderRadius: '15px',
                      backgroundColor: 'white',
                      boxShadow:
                        'rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 2px 6px 2px',
                    }}
                  >
                    <Stack alignItems="flex-end">
                      <IconButton onClick={() => setSelectedDep('')}>
                        <CancelIcon fontSize="medium" />
                      </IconButton>
                    </Stack>
                    <Typography variant="h5" textAlign="center">
                      {selectedDep}
                    </Typography>
                    <Box sx={{ width: '100%', my: 2 }}>
                      <Stepper
                        activeStep={
                          data?.workflows.find(
                            (item) => item.departmentName === selectedDep,
                          ).lastStepDone
                        }
                        alternativeLabel
                      >
                        {data?.workflows
                          ?.find((item) => item.departmentName === selectedDep)
                          ?.workFlow?.map((label, index) => (
                            <Step
                              key={label?.work}
                              sx={{
                                '& span span .Mui-completed': {
                                  color: 'green !important',
                                },
                                '& span span .Mui-active': {
                                  color: 'gray !important',
                                },
                              }}
                              completed={
                                selectedDepData?.skippedStepNumbers?.includes(
                                  index + 1,
                                )
                                  ? false
                                  : selectedDepData?.lastStepDone >= index + 1
                                  ? true
                                  : false
                              }
                            >
                              <StepLabel>
                                <p>
                                  {label?.work} (
                                  {label?.users
                                    ?.map((user) => user.user)
                                    .join(', ')}
                                  )
                                </p>
                                <p style={{ mt: '10px' }}>
                                  {selectedDepData?.skippedStepNumbers?.includes(
                                    index + 1,
                                  ) ? (
                                    <p style={{ color: 'red' }}>Skipped</p>
                                  ) : selectedDepData?.lastStepDone >=
                                    index + 1 ? (
                                    ''
                                  ) : (
                                    <p style={{ color: 'orange' }}>Pending</p>
                                  )}
                                </p>
                                <p>
                                  {selectedDepData?.isCompleted &&
                                  selectedDepData?.lastStepDone === index + 1
                                    ? 'Process Completed Here'
                                    : ''}
                                </p>
                              </StepLabel>
                            </Step>
                          ))}
                      </Stepper>
                    </Box>
                    <VerticalTimeline
                      lineColor="lightgray"
                      // style={{ maxWidth: "100%", padding: "10px" }}
                    >
                      {data?.historyDetails
                        ?.filter(
                          (item) => item.belongingDepartment === selectedDep,
                        )
                        ?.map((item, index) => (
                          <VerticalTimelineElement
                            key={index}
                            date={moment(item.Date).format('DD-MM-YYYY hh:mm')}
                            contentStyle={{
                              padding: '8px',
                              border: '1px solid lightgray',
                              borderBottom: '4px solid #2196f3',
                              boxShadow:
                                'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
                            }}
                            contentArrowStyle={{
                              borderRight: '8px solid  #757575',
                              height: '12px',
                            }}
                            iconStyle={{
                              background: item.isReverted ? 'red' : 'green',
                              color: '#fff',
                            }}
                            style={{ boxShadow: 'none', padding: '0px' }}
                            icon={
                              item.isReverted ? (
                                <IconAlertTriangleFilled />
                              ) : (
                                <IconDiscountCheckFilled />
                              )
                            }
                          >
                            <Typography
                              variant="h6"
                              textAlign="left"
                              color={item.isReverted ? 'coral' : 'dodgerblue'}
                            >
                              {item.description}
                            </Typography>
                            <ol className={styles.DocList}>
                              {item.documentsInvolved.map((doc, docIndex) => (
                                <div className={styles.listDiv} key={docIndex}>
                                  <li className={styles.listItem}>
                                    <Stack>
                                      <Stack alignItems="flex-start">
                                        <Box>
                                          <b>Document Name: </b>
                                          {doc.documentName}
                                        </Box>
                                      </Stack>
                                      <Stack
                                        flexDirection="row"
                                        columnGap={2}
                                        flexWrap="wrap"
                                      >
                                        <Box>
                                          <b>Action:</b>{' '}
                                          {doc.change
                                            ? doc.change
                                            : 'No-action'}
                                        </Box>
                                        {doc?.change == 'rejection' ? (
                                          <Box>
                                            <b>Reason:</b> {doc?.reason}
                                          </Box>
                                        ) : null}
                                      </Stack>
                                    </Stack>
                                    <Button
                                      onClick={() =>
                                        handleView(
                                          data?.documentsPath,
                                          doc.documentName,
                                        )
                                      }
                                    >
                                      view
                                    </Button>
                                  </li>
                                </div>
                              ))}
                            </ol>
                            {item.publishedTo.length > 0 && (
                              <>
                                <h4
                                  style={{
                                    marginTop: '10px',
                                    display: 'inline-block',
                                    color: 'green',
                                  }}
                                >
                                  Published To -
                                </h4>{' '}
                                <p style={{ display: 'inline-block' }}>
                                  {item.publishedTo.join(', ')}
                                </p>
                              </>
                            )}
                          </VerticalTimelineElement>
                        ))}
                    </VerticalTimeline>
                  </div>
                )}
              </>
            )}
          </div>
          {fileView && (
            <View
              docu={fileView}
              setFileView={setFileView}
              handleViewClose={handleViewClose}
            />
          )}
        </Stack>
      ) : (
        <Stack flexDirection="row" justifyContent="center">
          <Typography sx={{ p: 2, my: 'auto' }} textAlign="center">
            Error Getting History
          </Typography>{' '}
          <Button onClick={handleGoBack}>Go Back</Button>
        </Stack>
      )}
    </div>
  );
};

export default index;
