import mongoose from "mongoose";

export const signCoordinate = new mongoose.Schema({
  processId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Process",
    required: false,
  },
  docId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    required: true,
  },
  coordinates: {
    type: [
      {
        page: {
          type: Number,
        },
        x: {
          type: Number,
        },
        y: {
          type: Number,
        },
        width: {
          type: Number,
        },
        height: {
          type: Number,
        },
        stepNo: {
          type: Number,
        },
      },
    ],
    default: [],
  },
});

const SignCoordinate = mongoose.model("signCoordinate", signCoordinate);

export default SignCoordinate;
