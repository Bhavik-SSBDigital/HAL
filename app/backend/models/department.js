import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["branch", "department"],
    required: true,
  },
  code: {
    type: Number,
    unique: true,
    required: function () {
      return this.type === "branch";
    },
  },
  isHeadOffice: {
    type: Boolean,
    default: false,
    required: function () {
      return this.type === "branch";
    },
  },
  name: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  head: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  steps: [
    {
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
  parentDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
  },
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: null,
  },
});

departmentSchema.index({ name: 1, branch: 1 }, { unique: true });
const Department = mongoose.model("Department", departmentSchema);

export default Department;
