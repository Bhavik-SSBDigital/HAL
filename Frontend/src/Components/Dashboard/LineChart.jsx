import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

const LineChart = () => {
    const chartRef = useRef(null);
    const [options, setOptions] = useState({
        title: {
            text: 'Line Chart'
        },
        xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            data: [150, 230, 224, 218, 135, 147, 260],
            type: 'line'
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

export default LineChart;
