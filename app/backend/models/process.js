import mongoose from "mongoose";

const processSchema = new mongoose.Schema({
  workFlow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  isInterBranchProcess: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    unique: true,
    required: true,
  },
  maxReceiverStepNumber: {
    type: Number,
  },
  documents: {
    type: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document",
        },
        cabinetNo: {
          type: Number,
          required: true,
        },
        workName: {
          type: String,
          required: true,
        },
        rejection: {
          type: {
            reason: {
              type: String,
            },
            step: {
              work: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Work",
                required: true,
              },
              stepNumber: {
                type: Number,
                required: true,
              },
              actorUser: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
              },
              actorRole: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Role",
                required: true,
              },
            },
          },
          required: false,
        },
        signedBy: [
          {
            signedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          },
        ],
      },
    ],
  },
  documentsPath: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
  },
  lastStepDone: {
    type: Number,
    default: 0,
  },
  currentStepNumber: {
    type: Number,
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
  },
  remarks: {
    type: String,
    required: false,
  },
  completedAt: {
    type: Date,
    required: false,
  },
  connectors: {
    type: [
      {
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Department",
          required: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        documents: {
          type: [
            {
              documentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Document",
              },
              cabinetNo: {
                type: Number,
                required: true,
              },
              workName: {
                type: String,
                required: true,
              },
              rejection: {
                type: {
                  reason: {
                    type: String,
                  },
                  step: {
                    work: {
                      type: mongoose.Schema.Types.ObjectId,
                      ref: "Work",
                      required: true,
                    },
                    stepNumber: {
                      type: Number,
                      required: true,
                    },
                    actorUser: {
                      type: mongoose.Schema.Types.ObjectId,
                      ref: "User",
                      required: true,
                    },
                    actorRole: {
                      type: mongoose.Schema.Types.ObjectId,
                      ref: "Role",
                      required: true,
                    },
                  },
                },
                required: false,
              },
              signedBy: [
                {
                  signedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                  },
                },
              ],
            },
          ],
        },
        isToBeSentToClerk: {
          type: Boolean,
          default: false,
        },
        lastStepDone: {
          type: Number,
          default: 0,
        },
        remarks: {
          type: String,
          required: false,
        },
        currentStepNumber: {
          type: Number,
        },
        currentActorUser: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
      },
    ],
    required: false,
  },
  currentActorUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
});

const Process = mongoose.model("Process", processSchema);

export default Process;
