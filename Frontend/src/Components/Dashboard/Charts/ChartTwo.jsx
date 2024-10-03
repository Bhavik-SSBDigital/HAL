import ReactECharts from "echarts-for-react";

const ChartTwo = ({ data, loading }) => {
  return (
    <div className="cardDesign" style={{ height: "450px" }}>
      {!loading ? (
        <ReactECharts
          option={data}
          type="bar"
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

export default ChartTwo;
