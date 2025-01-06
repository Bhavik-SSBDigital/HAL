import mongoose from "mongoose";

const workflowSchema = new mongoose.Schema({
  workflow: {
    type: [
      {
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
    ],
  },
});

export const editionSchema = new mongoose.Schema({
  processId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Process",
    required: true,
  },
  time: {
    type: Date,
    required: true,
  },
  actorUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  workflowChanges: {
    previous: { type: workflowSchema },
    updated: { type: workflowSchema },
  },
});

const Edition = mongoose.model("Edition", editionSchema);

export default Edition;
