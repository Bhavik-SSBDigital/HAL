import mongoose from "mongoose";

const processAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    set: (val) => val.setHours(0, 0, 0, 0), // Set time to midnight for stored dates
    get: (val) => val.toISOString().split("T")[0],
    required: true,
  },
  noOfPendingProcess: {
    type: Number,
  },
  noOfRevertedProcess: {
    type: Number,
  },
  departmentsPendingProcess: [
    {
      department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
      },
      noOfPendingProcess: {
        type: Number,
      },
      noOfRevertedProcess: {
        type: Number,
      },
      documentDetails: [
        {
          workName: {
            type: String,
          },
          documentCount: {
            type: Number,
          },
          noOfRejectedDocuments: {
            type: Number,
          },
        },
      ],
    },
  ],
  documentDetails: [
    {
      workName: {
        type: String,
      },
      documentCount: {
        type: Number,
      },
      noOfRejectedDocuments: {
        type: Number,
      },
    },
  ],
});

const ProcessAnalytics = mongoose.model(
  "ProcessAnalytics",
  processAnalyticsSchema
);

export default ProcessAnalytics;
