import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Button,
  TextField,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Container,
  Stack,
  CardContent,
  CircularProgress,
  Box,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import styles from './SearchDocument.module.css';
import { toast } from 'react-toastify';
import { IconDownload, IconEye } from '@tabler/icons-react';
import { download } from '../../components/drop-file-input/FileUploadDownload';
import View from '../view/View';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import DocumentVersioning from '../DocumentVersioning';

const SearchDocument = () => {
  const token = sessionStorage.getItem('accessToken');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      branchName: '',
      departmentName: '',
      cabinetNumber: '',
      processName: '',
      year: '',
    },
  });

  const [searchByProcess, setSearchByProcess] = useState(true);
  const [workRemain, setWorkRemain] = useState(false);
  const [processNames, setProcessNames] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [viewFileDetails, setViewFileDetails] = useState(null);

  const fetchBranches = async () => {
    const url = backendUrl + '/getBranchesWithDepartments';
    try {
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setBranches(data.branches);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getProcessNames = async () => {
    const url = backendUrl + '/getProcessNames';
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProcessNames(res.data.processNames);
    } catch (error) {
      console.log(error?.response?.data?.message || error?.message);
    }
  };

  useEffect(() => {
    getProcessNames();
    fetchBranches();
  }, []);

  // document comparision
  const [documentsToCompare, setDocumentsToCompare] = useState([]);
  const [observations, setObservation] = useState([]);
  const [filesData, setFilesData] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);
  console.log(filesData);

  const selectDocumentToCompare = (id, name, path, e) => {
    if (e.target.checked) {
      if (documentsToCompare?.length == 2) {
        toast.info('Only 2 documents can be compared');
        return;
      }
      setDocumentsToCompare((prev) => [...prev, { id, name, path }]);
    } else {
      const updatedDocuments = documentsToCompare.filter(
        (item) => item.id !== id,
      );
      setDocumentsToCompare(updatedDocuments);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    let requestBody = { ...data, searchByProcess };
    console.log(data);
    if (searchByProcess) {
      // name, branchName, departmentName, processName
      delete requestBody.cabinetNumber;
      delete requestBody.year;
    } else {
      // name, cabinetNumber, year, departmentName
      delete requestBody.branchName;
      delete requestBody.processName;
    }
    console.log(requestBody);
    const isNotEmpty = Object.values(data).some(
      (value) => value !== '' && value !== undefined,
    );
    if (!isNotEmpty) {
      toast.info('At least one property must be provided.');
      setLoading(false);
      return;
    }

    const url = backendUrl + '/searchDocument';
    try {
      const res = await axios.post(url, requestBody, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data.documents);
      setWorkRemain(res.data.workRemaining);

      toast.info(res.data.documents.length + ' Search Results');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (path, name, id) => {
    try {
      const fileData = await download(name, path, true);
      if (fileData) {
        setViewFileDetails({
          url: fileData.data,
          type: fileData.fileType,
          fileId: id,
        });
      } else {
        toast.error('Invalid file data.');
      }
    } catch (error) {
      toast.error('Unable to view the file.');
    }
  };
  const handleCompare = async () => {
    setCompareLoading(true);
    const url = backendUrl + '/compareDocuments';
    try {
      const res = await axios({
        method: 'post',
        url: url,
        data: {
          document1: documentsToCompare[0]?.id,
          document2: documentsToCompare[1].id,
        },
      });
      setObservation(res?.data?.observations || []);
      documentsToCompare.map(async (item) => {
        const fileData = await download(item.name, item.path, true);
        if (fileData) {
          setFilesData((prev) => [
            ...prev,
            {
              url: fileData.data,
              type: fileData.fileType,
              fileId: item.id,
            },
          ]);
        } else {
          toast.error('Invalid file data.');
        }
      });
    } catch (error) {
      toast.error('Unable to view the file.');
    } finally {
      setCompareLoading(false);
    }
  };
  const handleViewClose = () => {
    setViewFileDetails(null);
  };
  const handleViewProcess = (id) => {
    const { _id, workFlowToBeFollowed } = processNames.find(
      (item) => item.name === watch('processName'),
    );
    navigate(
      `/processes/work/view?data=${encodeURIComponent(
        _id,
      )}&workflow=${encodeURIComponent(workFlowToBeFollowed)}`,
    );
  };

  const enableViewButton =
    watch('processName') &&
    searchByProcess &&
    results.length &&
    workRemain &&
    processNames.find((item) => item.name === watch('processName'))
      ?.workFlowToBeFollowed;

  const handleClear = () => {
    reset({
      name: '',
      branchName: '',
      departmentName: '',
      cabinetNumber: '',
      processName: '',
      year: '',
    });
  };
  const handleDownload = (path, name) => {
    try {
      download(name, path);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('An error occurred while downloading the file.');
    }
  };
  return (
    <Container className={styles.container}>
      <Typography
        textAlign="center"
        sx={{ fontWeight: 500, fontSize: 22 }}
        gutterBottom
      >
        Search Documents
      </Typography>
      <FormGroup>
        <Stack gap={2}>
          <Stack flexDirection="row" gap={1} justifyContent="space-between">
            <FormControlLabel
              control={
                <Checkbox
                  checked={searchByProcess}
                  onChange={() => {
                    setSearchByProcess(!searchByProcess);
                    reset({
                      name: '',
                      branchName: '',
                      departmentName: '',
                      cabinetNumber: '',
                      year: '',
                    });
                  }}
                />
              }
              label="Search By Process"
            />
            <Button onClick={handleClear}>Clear Filters</Button>
          </Stack>
          <Controller
            name="name"
            control={control}
            // disabled={searchByProcess}
            disabled={!!watch('processName')}
            render={({ field }) => (
              <TextField
                {...field}
                label="Document Name"
                className={styles.textField}
                // disabled={!!watch('processName')}
                fullWidth
              />
            )}
          />
          {searchByProcess ? (
            <>
              <Controller
                name="processName"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    value={
                      watch('processName')
                        ? processNames.find(
                            (item) => item.name === watch('processName'),
                          )
                        : {}
                    }
                    options={processNames}
                    getOptionLabel={(option) => option.name || ''} // Adjust to the correct property for your process names
                    onChange={(e, value) => {
                      field.onChange(value?.name || '');
                      reset({
                        name: '',
                        branchName: '',
                        departmentName: '',
                        cabinetNumber: '',
                        year: '',
                        processName: value?.name || '',
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Process Name"
                        className={styles.select}
                      />
                    )}
                  />
                )}
              />

              <Controller
                name="branchName"
                control={control}
                // disabled={searchByProcess}
                disabled={!!watch('processName')}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Branch Name"
                    className={styles.select}

                    // disabled={!!watch('processName')}
                  >
                    <MenuItem value="">Select Branch</MenuItem>
                    {branches.map((branch) => (
                      <MenuItem key={branch._id} value={branch.name}>
                        {branch.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="departmentName"
                control={control}
                // disabled={searchByProcess}
                disabled={!!watch('processName')}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Department Name"
                    className={styles.select}
                    // disabled={!!watch('processName')}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {branches.flatMap((branch) =>
                      branch.departments.map((department) => (
                        <MenuItem key={department._id} value={department.name}>
                          {department.name}
                        </MenuItem>
                      )),
                    )}
                  </TextField>
                )}
              />
            </>
          ) : (
            <>
              <Controller
                name="cabinetNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    className={styles.textField}
                    label="Cabinet Number"
                    fullWidth
                  />
                )}
              />
              <Controller
                name="year"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    className={styles.textField}
                    label="Year"
                    fullWidth
                  />
                )}
              />
              <Controller
                name="departmentName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Department Name"
                    className={styles.select}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {branches.flatMap((branch) =>
                      branch.departments.map((department) => (
                        <MenuItem key={department._id} value={department.name}>
                          {department.name}
                        </MenuItem>
                      )),
                    )}
                  </TextField>
                )}
              />
            </>
          )}
          <Button
            variant="contained"
            className={styles.button}
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? <CircularProgress size={22} /> : 'Search'}
          </Button>
          {!!enableViewButton && (
            <Button variant="contained" onClick={handleViewProcess}>
              View Process
            </Button>
          )}
        </Stack>
      </FormGroup>
      {results.length > 0 ? (
        <Stack spacing={2} mt={4}>
          <Stack flexDirection={'row'} justifyContent={'space-between'}>
            {documentsToCompare?.length ? (
              <div className={styles.documentsCompareContainer}>
                {documentsToCompare.map((document) => {
                  return <div className={styles.document}>{document.name}</div>;
                })}
                <Button
                  variant="outlined"
                  disabled={compareLoading}
                  onClick={() =>
                    documentsToCompare.length == 1
                      ? toast.info('Please add document to compare')
                      : handleCompare()
                  }
                >
                  {compareLoading ? <CircularProgress size={22} /> : 'Compare'}
                </Button>
              </div>
            ) : null}

            <Typography variant="h6" fontWeight={600}>
              Results: {results.length}
            </Typography>
          </Stack>
          {results.map((result, index) => (
            <div key={result._id} className={styles.resultCard}>
              <CardContent>
                <Stack
                  flexDirection="row"
                  justifyContent="space-between"
                  flexWrap="wrap"
                >
                  <Stack flexDirection="row" alignItems="center">
                    <Checkbox
                      checked={documentsToCompare[index]?.name === result.name}
                      onChange={(e) =>
                        selectDocumentToCompare(
                          result.documentId,
                          result.name,
                          result.path,
                          e,
                        )
                      }
                    ></Checkbox>
                    <Box>
                      <Typography variant="h6">{result.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {result.path}
                      </Typography>
                    </Box>
                  </Stack>
                  {result.type === 'file' && (
                    <Stack alignItems="flex-start">
                      <Button
                        onClick={() =>
                          handleView(
                            result.path,
                            result.name,
                            result.documentId,
                          )
                        }
                        startIcon={<IconEye />}
                      >
                        View File
                      </Button>
                      <Button
                        color="secondary"
                        onClick={() => handleDownload(result.path, result.name)}
                        startIcon={<IconDownload />}
                      >
                        Download
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </div>
          ))}
        </Stack>
      ) : null}
      {viewFileDetails ? (
        <View
          docu={viewFileDetails}
          setFileView={setViewFileDetails}
          handleViewClose={handleViewClose}
        />
      ) : null}
      <Dialog
        open={filesData.length == 2}
        maxWidth="xl"
        onClose={() => setFilesData([])}
      >
        <DialogTitle>Document Versioning</DialogTitle>
        <Button
          onClick={() => setFilesData([])}
          sx={{ position: 'absolute', top: '10px', right: '10px' }}
        >
          CLose
        </Button>
        <DialogContent>
          <DocumentVersioning
            file1={filesData[0]?.url}
            file2={filesData[1]?.url}
            observations={observations}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default SearchDocument;
