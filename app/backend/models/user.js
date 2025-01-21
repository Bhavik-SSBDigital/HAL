import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department", // Assuming you have a 'Branch' model
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role", // Assuming you have a 'Role' model for roles
  },
  status: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: false,
  },
  password: {
    type: String,
    required: true,
  },
  specialUser: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
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

  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
  processes: [
    {
      process: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Process",
      },
      pending: {
        type: Boolean,
        default: true,
      },
      receivedAt: {
        type: Date,
      },
      published: {
        type: Boolean,
        default: false,
      },
      // work: {
      //   type: mongoose.Schema.Types.ObjectId,
      //   ref: "Work",
      //   default: null,
      // },
      workFlowToBeFollowed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        default: null,
      },
      isToBeSentToClerk: {
        type: Boolean,
        default: false,
      },
      forMonitoring: {
        type: Boolean,
        default: false,
      },
    },
  ],
  workDone: [
    {
      log: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Log",
      },
    },
  ],
  notifications: [
    {
      processId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Process",
      },
      processName: {
        type: String,
      },
      completed: {
        type: Boolean,
      },
      receivedAt: {
        type: Date,
      },
      isPending: {
        type: Boolean,
      },
      isAlert: {
        type: Boolean,
        default: false,
      },
      work: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      workFlowToBeFollowed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        default: null,
      },
      forMonitoring: {
        type: Boolean,
        default: false,
      },
      isPublished: {
        type: Boolean,
        default: false,
      },
    },
  ],
  profilePicFileName: {
    type: String,
    required: false,
  },
  signaturePicFileName: {
    type: String,
    required: false,
  },
  isKeeperOfPhysicalDocs: {
    type: Boolean,
    default: false,
  },
});

const User = mongoose.model("user", userSchema);

export default User;
