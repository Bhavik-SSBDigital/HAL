import mongoose from "mongoose";
const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // below property named type is to determine document is folder or file
  type: { type: String, required: true },
  path: { type: String, required: true, unique: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdOn: { type: Date, default: Date.now },
  lastUpdatedOn: { type: Date, default: Date.now },
  history: [{ type: mongoose.Schema.Types.ObjectId, ref: "DocHistory" }],
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  isProject: { type: Boolean },
  isInvolvedInProcess: {
    type: Boolean,
    default: false,
  },
  minimumSignsOnFirstPage: {
    type: Number,
  },
  isRejected: {
    type: Boolean,
    default: false,
  },
  highlights: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Highlight" }],
    default: [],
  },
  physicalKeeper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const Document = mongoose.model("Document", documentSchema);

export default Document;
