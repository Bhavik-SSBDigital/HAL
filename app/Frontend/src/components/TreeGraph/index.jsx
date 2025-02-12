import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import styles from './TreeGraph.module.css';

const TreeGraph = ({ data, loading }) => {
  const controls = false;
  const [sequence, setSequence] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectionEnabled, setSelectionEnabled] = useState(controls);

  // Function to handle node selection
  const handleNodeSelect = (node) => {
    if (!selectionEnabled) return; // Disable selection if switch is off
    console.log(node.name);
    setSequence((prev) => {
      if (prev.includes(node.name)) {
        return prev.filter((item) => item !== node.name);
      } else {
        return [node.name, ...prev];
      }
    });
  };

  const getOption = () => ({
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
    },
    series: [
      {
        type: 'tree',
        data: data || [],
        left: '2%',
        right: '2%',
        top: '8%',
        bottom: '20%',
        symbol: 'emptyCircle',
        symbolSize: 12,
        orient: 'TB',
        expandAndCollapse: true,
        initialTreeDepth: -1,
        label: {
          position: 'top',
          rotate: 0,
          verticalAlign: 'middle',
          align: 'center',
          fontSize: 16,
          formatter: (params) => {
            if (!controls) return params.name;
            const isChecked = sequence.includes(params.name);
            return `{checkbox|${isChecked ? '☑' : '☐'}} ${params.name}`;
          },
          rich: controls
            ? {
                checkbox: {
                  fontSize: 24,
                  color: '#000',
                },
              }
            : {},
        },
        leaves: {
          label: {
            position: 'bottom',
            rotate: 0,
            verticalAlign: 'middle',
            align: 'center',
          },
        },
        animationDurationUpdate: 750,
      },
    ],
  });

  return (
    <div className={styles.container}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      ) : (
        <>
          <ReactECharts
            option={getOption()}
            style={{ height: 'calc(100vh - 240px)' }}
            onEvents={
              controls
                ? {
                    contextmenu: (params) => {
                      params.event.event.preventDefault();
                      handleNodeSelect(params.data);
                    },
                  }
                : {}
            }
          />
          {controls && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <strong>Selected Nodes Order:</strong> {sequence.join(' → ')}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TreeGraph;
