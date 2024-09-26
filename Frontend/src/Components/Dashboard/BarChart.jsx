import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

const BarChart = () => {
    const chartRef = useRef(null);
    const [options, setOptions] = useState({
        title: {
            text: 'Bar Chart'
        },
        xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            data: [120, 200, 150, 80, 70, 110, 130],
            type: 'bar'
        }]
    });

    useEffect(() => {
        const chartInstance = echarts.init(chartRef.current);
        chartInstance.setOption(options);

        return () => {
            chartInstance.dispose();
        };
    }, [options]);

    return <div className='cardDesign' ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

export default BarChart;
