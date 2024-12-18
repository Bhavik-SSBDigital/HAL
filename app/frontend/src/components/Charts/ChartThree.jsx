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
// import ReactApexChart from 'react-apexcharts';
import ReactECharts from 'echarts-for-react';
import { useState } from 'react';
import View from '../../pages/view/View';
import { toast } from 'react-toastify';
import { download } from '../drop-file-input/FileUploadDownload';

const ChartThree = ({ data, loading }) => {
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const chartOptions = {
    title: {
      text: 'Uploaded Documents Category Wise',
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
      data: data?.time,
    },
    yAxis: {
      type: 'value',
    },
    series: data?.series,
  };
  const onChartClick = (params) => {
    const docs = data.series[params.seriesIndex].documents[params.dataIndex];
    setSelectedDocuments(docs);
    console.log(docs);
  };
  const onEvents = {
    click: onChartClick,
  };

  // view document

  const [viewFileDetails, setViewFileDetails] = useState(null);
  const handleView = async (path, name, id) => {
    try {
      const fileData = await download(name, path, true);
      setSelectedDocuments([]);
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
  const handleViewClose = () => {
    setViewFileDetails(null);
  };
  return (
    <>
      <Card sx={{ height: '450px', p: 2 }}>
        {!loading ? (
          <ReactECharts
            onEvents={onEvents}
            option={chartOptions}
            style={{ height: '400px' }}
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
        open={selectedDocuments.length}
        maxWidth="md"
        fullWidth
        onClose={() => setSelectedDocuments([])}
      >
        <DialogTitle
          sx={{
            margin: '10px',
            backgroundColor: 'var(--themeColor)',
            color: 'white',
          }}
          fontWeight={600}
        >
          Rejected Documents
        </DialogTitle>
        <DialogContent sx={{ padding: '0px', margin: '10px' }}>
          <TableContainer sx={{ border: '1px solid lightgray' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Document Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Document Path</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedDocuments?.map((document, index) => (
                  <TableRow key={index}>
                    <TableCell>{document.name}</TableCell>
                    <TableCell>{document.path}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        onClick={() =>
                          handleView(
                            document.path,
                            document.name,
                            document.documentId,
                          )
                        }
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
      {viewFileDetails ? (
        <View
          docu={viewFileDetails}
          setFileView={setViewFileDetails}
          handleViewClose={handleViewClose}
        />
      ) : null}
    </>
  );
};

export default ChartThree;
