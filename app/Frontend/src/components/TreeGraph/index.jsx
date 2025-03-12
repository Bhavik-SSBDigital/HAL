import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import styles from './TreeGraph.module.css';

const TreeGraph = ({
  data,
  loading,
  controls,
  departmentId,
  onHierarchyUpdate,
  selectedNodes,
}) => {
  const [selectedHierarchy, setSelectedHierarchy] = useState([]);
  console.log(selectedHierarchy);
  // Function to handle node selection
  const handleNodeSelect = (node) => {
    console.log(node);
    if (!controls) return;

    setSelectedHierarchy((prevHierarchy) => {
      // Find existing department object
      const existingIndex = prevHierarchy.findIndex(
        (dept) => dept.department === departmentId,
      );
      let updatedHierarchy;

      if (existingIndex !== -1) {
        // Department exists, update its roles
        const updatedRoles = prevHierarchy[existingIndex].roles.includes(
          node.name,
        )
          ? prevHierarchy[existingIndex].roles.filter(
              (role) => role !== node.name,
            ) // Remove role
          : [...prevHierarchy[existingIndex].roles, node.name]; // Add role

        updatedHierarchy = [...prevHierarchy];
        updatedHierarchy[existingIndex] = {
          department: departmentId,
          roles: updatedRoles,
        };
      } else {
        // New department, add it with the selected role
        updatedHierarchy = [
          ...prevHierarchy,
          { department: departmentId, roles: [node.name] },
        ];
      }

      // Notify parent component with updated hierarchy
      onHierarchyUpdate(updatedHierarchy);
      return updatedHierarchy;
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
            const isChecked = selectedHierarchy
              .find((dept) => dept.department === departmentId)
              ?.roles.includes(params.name);
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

  useEffect(() => {
    const departmentData = selectedHierarchy.find(
      (dept) => dept.department === departmentId,
    );
  }, [selectedHierarchy, departmentId]);

  useEffect(() => {
    if (selectedNodes.length !== 0) {
      setSelectedHierarchy(selectedNodes);
    }
  }, [selectedNodes]);
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
              <strong>Selected Roles Order:</strong>{' '}
              {selectedHierarchy
                .filter((dept) => dept.department === departmentId) // ✅ Show only current department
                .map((dept) => dept.roles.join(' → ')) // ✅ Display selected roles
                .join('')}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TreeGraph;
