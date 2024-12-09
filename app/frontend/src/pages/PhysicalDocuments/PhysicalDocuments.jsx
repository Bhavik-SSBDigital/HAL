import { useEffect, useMemo, useState } from 'react';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Box,
  Pagination,
} from '@mui/material';
import View from '../view/View';

import axios from 'axios';
import { toast } from 'react-toastify';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import styles from './PhysicalDocuments.module.css';
import {
  IconChecklist,
  IconEye,
  IconFileExport,
  IconFileImport,
  IconFileInfo,
  IconSquareLetterX,
} from '@tabler/icons-react';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { download } from '../../components/drop-file-input/FileUploadDownload';

const PhysicalDocuments = () => {
  const [physicalDocumentsHistory, setPhysicalDocumentsHistory] = useState([]);
  const token = sessionStorage.getItem('accessToken');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [openDialog, setOpenDialog] = useState(false);
  const [advancedDetails, setAdvancedDetails] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState('');
  const [page, setPage] = useState(0);

  const handleViewClick = async (doc) => {
    setViewLoading(doc?._id);
    setSelectedDocument(doc);
    try {
      const url = backendUrl + `/getDocumentHistory/${doc._id}`;
      const res = await axios({
        method: 'get',
        url: url,
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdvancedDetails(res.data.docTrackingDetails);
      setOpenDialog(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      console.log('finally');
      setViewLoading(null);
    }
  };

  const handleClose = () => {
    setOpenDialog(false);
    setAdvancedDetails(null);
    setSelectedDocument(null);
    setViewLoading('');
  };
  const [returnDocumentLoading, setReturnDocumentLoading] = useState(false);

  const returnDocument = async (index, borrower) => {
    setReturnDocumentLoading(true);
    const url = backendUrl + '/returnDocument';
    try {
      const res = await axios.post(
        url,
        { documentId: selectedDocument?._id, borrower },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAdvancedDetails((prev) =>
        prev.map((item, i) =>
          i == index
            ? { ...item, returnedAt: Date.now(), isReturned: true }
            : item,
        ),
      );
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setReturnDocumentLoading(false);
    }
  };

  const getHistory = async () => {
    const url = backendUrl + '/getBorrowedDocuments';
    try {
      const res = await axios({
        method: 'get',
        url: url,
        headers: { Authorization: `Bearer ${token}` },
      });
      setPhysicalDocumentsHistory(res.data.documents || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocuments = useMemo(() => {
    return physicalDocumentsHistory.filter((doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm, physicalDocumentsHistory]);

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const [fileView, setFileView] = useState(null);
  const navigate = useNavigate();

  const handleView = async (name, id, url) => {
    let updatedPath = url.split('/storage')[1];
    const pathWithoutFile = updatedPath.split('/').slice(0, -1).join('/');
    const finalPath = `..${pathWithoutFile}`;
    setLoading(true);
    try {
      const fileData = await download(name, finalPath, true);
      setLoading(false);
      if (fileData) {
        setFileView({
          url: fileData.data,
          type: fileData.fileType,
          fileId: id,
        });
      } else {
        toast.error('Invalid file data.');
      }
    } catch (error) {
      toast.error('Unable to view the file.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = (url) => {
    let updatedPath = url.split('/storage')[1];

    // Remove the file name by splitting the updated path by "/" and removing the last element
    const pathWithoutFile = updatedPath.split('/').slice(0, -1).join('/');

    // Add "../" at the start
    const finalPath = `..${pathWithoutFile}`;

    sessionStorage.setItem('path', finalPath);
    // navigate(`/files/pathWithoutFile`)
  };

  const handleViewClose = () => {
    setFileView(null);
  };

  useEffect(() => {
    getHistory();
  }, []);
  return loading ? (
    <ComponentLoader />
  ) : (
    <>
      <div>
        <Stack>
          <Box>
            <TextField
              size="small"
              label="Search"
              sx={{ background: 'white', mb: 1 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>
        </Stack>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Document Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.length ? (
                filteredDocuments
                  ?.slice(page * 10, (page + 1) * 10)
                  ?.map((doc) => (
                    <TableRow key={doc._id}>
                      <TableCell className={styles.cell}>{doc.name}</TableCell>
                      <TableCell className={styles.cell}>
                        <IconButton
                          variant="contained"
                          color="primary"
                          disabled={viewLoading}
                          onClick={() => handleViewClick(doc)}
                        >
                          {viewLoading == doc._id ? (
                            <CircularProgress size={22} />
                          ) : (
                            <>
                              <IconEye style={{ marginRight: '3px' }} />{' '}
                              <Typography>View Details</Typography>
                            </>
                          )}
                        </IconButton>
                        <IconButton
                          disabled={doc?.onlyMetaData}
                          onClick={() =>
                            handleView(doc.name, doc._id, doc.path)
                          }
                          color="secondary"
                        >
                          <IconEye />
                          <Typography>View File</Typography>
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell>No Data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack
          justifyContent="flex-end"
          mt={1}
          flexDirection="row"
          alignItems="center"
        >
          <Pagination
            page={page + 1}
            onChange={(event, page) => handleChangePage(page - 1)}
            count={Math.ceil(filteredDocuments.length / 10)}
            variant="outlined"
            shape="rounded"
          />
        </Stack>

        {/* Dialog for advanced details */}
        <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="md">
          <IconButton
            onClick={handleClose}
            sx={{ position: 'absolute', right: '0px' }}
          >
            <IconSquareLetterX />
          </IconButton>
          <DialogTitle fontWeight={700}>
            {selectedDocument?.name} History
          </DialogTitle>
          <DialogContent>
            <VerticalTimeline lineColor="lightgray">
              {advancedDetails?.map((detail, index) => (
                <VerticalTimelineElement
                  key={index}
                  contentStyle={{
                    padding: '10px 20px',
                    border: '1px solid lightgray',
                    borderBottom: '4px solid #2196f3',
                    boxShadow: 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
                  }}
                  contentArrowStyle={{
                    borderRight: '8px solid  #757575',
                    height: '12px',
                  }}
                  iconStyle={{
                    background: detail?.isReturned ? 'green' : 'blue',
                    color: '#fff',
                  }}
                  style={{ boxShadow: 'none', padding: '0px' }}
                  icon={
                    detail?.isReturned ? <IconChecklist /> : <IconFileInfo />
                  }
                >
                  <Typography variant="subtitle1" textAlign="left">
                    <strong>{index == 0 ? 'Received By' : 'Borrower'}</strong> :{' '}
                    {detail.borrower}
                  </Typography>
                  <Typography variant="subtitle1" textAlign="left">
                    <strong>{index == 0 ? 'Submitter' : 'Lender'}</strong> :{' '}
                    {detail.lender}
                  </Typography>
                  <Typography variant="subtitle1" textAlign="left">
                    <strong>
                      {index == 0 ? 'Submission Date' : 'Borrow Date'}
                    </strong>{' '}
                    : {moment(detail.time).format('DD-MM-YYYY / hh:mm')}
                  </Typography>
                  {index !== 0 ? (
                    <>
                      <Typography variant="subtitle1" textAlign="left">
                        <strong>Purpose</strong> : {detail.purpose}
                      </Typography>

                      <Typography variant="subtitle1" textAlign="left">
                        <strong>Returned Date</strong> :
                        {detail.returnedAt
                          ? moment(detail.returnedAt).format('DD-MM-YYYY hh:mm')
                          : 'N/A'}
                      </Typography>
                      {detail?.isReturned ? (
                        <>
                          <Typography variant="subtitle1" textAlign="left">
                            <strong>Returned :</strong> Yes{' '}
                          </Typography>
                        </>
                      ) : (
                        <Button
                          onClick={() => returnDocument(index, detail.borrower)}
                          sx={{ marginLeft: 'auto', display: 'block' }}
                          variant="contained"
                          size="small"
                          disabled={returnDocumentLoading}
                        >
                          {returnDocumentLoading ? (
                            <CircularProgress size={22} />
                          ) : (
                            'Return'
                          )}
                        </Button>
                      )}
                    </>
                  ) : null}
                </VerticalTimelineElement>
              ))}
            </VerticalTimeline>
          </DialogContent>
        </Dialog>
      </div>
      {fileView ? (
        <View
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={handleViewClose}
        />
      ) : null}
    </>
  );
};

export default PhysicalDocuments;
