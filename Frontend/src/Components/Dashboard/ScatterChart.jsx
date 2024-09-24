import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

const ScatterChart = () => {
    const chartRef = useRef(null);
    const [options, setOptions] = useState({
        title: {
            text: 'Scatter Chart'
        },
        xAxis: {},
        yAxis: {},
        series: [{
            symbolSize: 20,
            data: [
                [10, 20],
                [20, 30],
                [30, 40],
                [40, 50],
                [50, 60]
            ],
            type: 'scatter'
        }]
    });

    useEffect(() => {
        const chartInstance = echarts.init(chartRef.current);
        chartInstance.setOption(options);

        return () => {
            chartInstance.dispose();
        };
    }, [options]);

    return <div className='border rounded-lg p-2' ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

export default ScatterChart;
