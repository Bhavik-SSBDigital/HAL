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
    if (!controls) return;

    setSelectedHierarchy((prevHierarchy) => {
      const existingIndex = prevHierarchy.findIndex(
        (dept) => dept.department === departmentId,
      );
      let updatedHierarchy;

      if (existingIndex !== -1) {
        // Check if the node is already selected
        const updatedRoles = prevHierarchy[existingIndex].roles.some(
          (role) => role.id === node.id,
        )
          ? prevHierarchy[existingIndex].roles.filter(
              (role) => role.id !== node.id,
            ) // Remove
          : [...prevHierarchy[existingIndex].roles, node]; // Add full node

        updatedHierarchy = [...prevHierarchy];
        updatedHierarchy[existingIndex] = {
          department: departmentId,
          roles: updatedRoles,
        };
      } else {
        // New department, add it with the selected full node object
        updatedHierarchy = [
          ...prevHierarchy,
          { department: departmentId, roles: [node] },
        ];
      }

      // Notify parent component with updated hierarchy
      onHierarchyUpdate(updatedHierarchy);
      return updatedHierarchy;
    });
  };

  const findRoleName = (nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node.name;
      if (node.children) {
        const found = findRoleName(node.children, id);
        if (found) return found;
      }
    }
    return null;
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
              ?.roles?.find((role) => role.id == params.data.id);
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

  // select all nodes
  const selectAllNodes = () => {
    const allNodes = getAllNodes(data); // Get all node objects

    setSelectedHierarchy((prevHierarchy) => {
      const updatedHierarchy = [...prevHierarchy];
      const departmentIndex = updatedHierarchy.findIndex(
        (dept) => dept.department === departmentId,
      );

      if (departmentIndex !== -1) {
        // Update existing department selection with full objects
        updatedHierarchy[departmentIndex] = {
          department: departmentId,
          roles: allNodes,
        };
      } else {
        // Add new department selection
        updatedHierarchy.push({
          department: departmentId,
          roles: allNodes,
        });
      }

      onHierarchyUpdate(updatedHierarchy); // Notify parent
      return updatedHierarchy;
    });
  };

  // Function to get all node objects recursively
  const getAllNodes = (nodes) => {
    let allNodes = [];
    nodes.forEach((node) => {
      allNodes.push(node); // Store full object
      if (node.children) {
        allNodes = allNodes.concat(getAllNodes(node.children));
      }
    });
    return allNodes;
  };

  const deselectAllNodes = () => {
    setSelectedHierarchy((prevHierarchy) => {
      const updatedHierarchy = prevHierarchy.filter(
        (dept) => dept.department !== departmentId, // Remove the department entry
      );

      onHierarchyUpdate(updatedHierarchy); // Notify parent
      return updatedHierarchy;
    });
  };

  return (
    <div className={styles.container}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      ) : (
        <>
          {controls && (
            <div className="ml-auto flex w-full justify-end">
              <button
                className="bg-purple-600 hover:bg-purple-700 px-3 m-1 py-2 rounded-md text-white"
                onClick={selectAllNodes}
              >
                Select All
              </button>
              <button
                className="bg-red-500 px-3 m-1 py-2 rounded-md text-white"
                onClick={deselectAllNodes}
              >
                Deselect All
              </button>
            </div>
          )}
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
                .filter((dept) => dept.department === departmentId)
                .map(
                  (dept) => dept.roles.map((role) => role.name).join(' → '), // Use `role.name` instead of finding it from `id`
                )
                .join('')}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TreeGraph;
