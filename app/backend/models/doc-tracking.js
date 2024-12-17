import mongoose from "mongoose";

const docTrackingSchema = new mongoose.Schema({
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  lender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  time: {
    type: Date,
    required: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    reference: "Document",
    required: true,
  },
  purpose: {
    type: String,
    required: false,
  },
  isReturned: {
    type: Boolean,
    default: false,
  },
  returnedAt: {
    type: Date,
  },
});

const DocHistory = mongoose.model("DocHistory", docTrackingSchema);

export default DocHistory;
