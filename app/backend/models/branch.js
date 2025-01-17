import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
  code: {
    type: Number,
    required: true,
    unique: true,
  },
  isHeadOffice: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
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
});

const Branch = mongoose.model("branch", branchSchema);

export default Branch;
