import mongoose from "mongoose";

export const workflowSchema = new mongoose.Schema({
  workflow: {
    type: [
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
    required: true,
  },
});

export const logSchema = new mongoose.Schema({
  processId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Process",
    required: true,
  },
  time: {
    type: Date,
    required: true,
  },
  currentStep: {
    work: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Work",
    },
    stepNumber: {
      type: Number,
    },
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
  },
  nextStep: {
    work: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Work",
    },
    stepNumber: {
      type: Number,
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
  reverted: {
    type: Boolean,
    required: true,
  },
  documents: {
    type: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document",
        },
        isSigned: {
          type: Boolean,
          default: false,
        },
        isRejected: {
          type: Boolean,
          default: false,
        },
        isUploaded: {
          type: Boolean,
          default: false,
        },
        reason: {
          type: String,
        },
      },
    ],
  },
  publishedTo: {
    type: [
      {
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Department",
        },
      },
    ],
    default: [],
  },
  belongingDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: false,
  },
  workflowChanges: {
    type: {
      previous: workflowSchema, // Ensures it matches the workflowSchema
      updated: workflowSchema, // Ensures it matches the workflowSchema}
    },
    default: null,
  },
});

const Log = mongoose.model("Log", logSchema);

export default Log;
