import mongoose from "mongoose";

// Define the workflow schema
const workflowSchema = new mongoose.Schema({
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

// Define the edition schema
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
    previous: workflowSchema, // Ensures it matches the workflowSchema
    updated: workflowSchema, // Ensures it matches the workflowSchema
  },
});

// Create the Edition model
const Edition = mongoose.model("Edition", editionSchema);

export default Edition;
