import ReactECharts from "echarts-for-react";

const ChartFour = ({ data, loading }) => {
  return (
    <div className="cardDesign" style={{ height: "450px", p: 2 }}>
      {!loading ? (
        <ReactECharts option={data} style={{ height: "100%" }} />
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

export default ChartFour;
