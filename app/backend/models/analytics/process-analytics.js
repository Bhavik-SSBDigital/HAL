import mongoose from "mongoose";

const processAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    set: (val) => val.setHours(0, 0, 0, 0), // Set time to midnight for stored dates
    get: (val) => val.toISOString().split("T")[0],
    required: true,
  },
  pendingProcesses: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Process" }],
  },
  revertedProcesses: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Process" }],
  },
  departmentsPendingProcess: [
    {
      department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
      },
      pendingProcesses: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Process" }],
      },
      revertedProcesses: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Process" }],
      },
      documentDetails: [
        {
          workName: {
            type: String,
          },
          documentsUploaded: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
          },
          documentsReverted: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
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
      documentsUploaded: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
      },
      documentsReverted: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
      },
    },
  ],
});

const ProcessAnalytics = mongoose.model(
  "ProcessAnalytics",
  processAnalyticsSchema
);

export default ProcessAnalytics;
