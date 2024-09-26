import mongoose from "mongoose";

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
});

const LogWork = mongoose.model("logWork", logWork);

export default LogWork;
