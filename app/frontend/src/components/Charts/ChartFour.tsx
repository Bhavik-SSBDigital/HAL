import { Card } from '@mui/material';
// import ReactApexChart from 'react-apexcharts';
import ReactECharts from 'echarts-for-react';

const ChartFour = ({ data, loading, handleView }) => {
  const handleClick = (params) => {
    const { dataIndex, seriesIndex } = params;
    // const clickedCategory = params.name; // The category (date, work name, etc.)
    // const clickedDocumentCount = params.data; // The value for that bar (document count)
    const clickedDocuments = data?.series[seriesIndex]?.documents[dataIndex]; // Get the associated documents
    console.log(clickedDocuments);
    // Set the clicked data to display it

    if (false) {
      handleView();
    }
  };

  const chartOptions = {
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
      data: data.time,
    },
    yAxis: {
      type: 'value',
    },
    series: data.series,
    
  };
  // console.log(handleView);
  return (
    <Card sx={{ height: '450px', p: 2 }}>
      {!loading ? (
        <ReactECharts option={chartOptions} style={{ height: '400px' }} />
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
  );
};

export default ChartFour;
