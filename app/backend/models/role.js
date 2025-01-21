import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId, // Refers to the ID of a Branch document
    ref: "Department", // Refers to the 'Branch' model
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true, // Optional: You can set a default value
  },
  updatedAt: {
    type: Date,
    default: null, // Optional: You can set a default value or leave it as null initially
  },
  writable: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  readable: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  downloadable: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  uploadable: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  fullAccessUploadable: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  ],
  fullAccessDownloadable: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  ],
  fullAccessReadable: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  ],
});

// Define a unique compound index on 'branch' and 'role' to enforce uniqueness.
roleSchema.index({ branch: 1, role: 1 }, { unique: true });

const Role = mongoose.model("Role", roleSchema);

export default Role;
