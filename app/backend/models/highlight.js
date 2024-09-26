import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema({
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
      },
    ],
  },
  //   text: String,
  remark: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const Highlight = mongoose.model("highlight", highlightSchema);

export default Highlight;
