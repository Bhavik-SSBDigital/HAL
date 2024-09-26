import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  steps: [
    {
      work: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Work",
        required: true,
      },
      stepNumber: {
        type: Number,
        required: true,
      },
      users: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
            required: true,
          },
        },
      ],
    },
  ],
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
  },
  head: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

departmentSchema.index({ branch: 1, name: 1 }, { unique: true });
const Department = mongoose.model("Department", departmentSchema);

export default Department;
