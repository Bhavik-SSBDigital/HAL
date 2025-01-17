import mongoose from "mongoose";
import { workflowSchema } from "./log.js";

export const logWork = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  process: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Process",
    required: true,
  },
  signedDocuments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
  ],
  uploadedDocuments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
  ],
  rejectedDocuments: [
    {
      document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
        required: true,
      },
      reason: {
        type: String,
      },
    },
  ],
  workflowChanges: {
    type: {
      previous: workflowSchema, // Ensures it matches the workflowSchema
      updated: workflowSchema, // Ensures it matches the workflowSchema
    },
    default: null, // Sets the default value to null
  },
});

const LogWork = mongoose.model("logWork", logWork);

export default LogWork;
