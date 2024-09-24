import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

const PieChart = () => {
    const chartRef = useRef(null);
    const [options, setOptions] = useState({
        title: {
            text: 'Pie Chart',
            left: 'center'
        },
        series: [{
            type: 'pie',
            data: [
                { value: 1048, name: 'Search Engine' },
                { value: 735, name: 'Direct' },
                { value: 580, name: 'Email' },
                { value: 484, name: 'Union Ads' },
                { value: 300, name: 'Video Ads' }
            ],
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
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

export default PieChart;
