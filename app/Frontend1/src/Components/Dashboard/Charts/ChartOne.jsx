// import { ApexOptions } from 'apexcharts';
// import { useState } from 'react';
import ReactECharts from "echarts-for-react";

const ChartOne = ({ data, loading }) => {
  return (
    <div className="cardDesign" style={{ height: "450px", p: 2 }}>
      {!loading ? (
        <ReactECharts
          option={data}
          type="area"
          style={{ height: '100%' }}
          height={"100%"}
        />
      ) : (
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h3>loading....</h3>
        </div>
      )}
    </div>
  );
};

export default ChartOne;
