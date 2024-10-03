import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
  meetingLink: {
    type: String,
    required: true,
  },
  participants: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
  },
  comments: {
    type: [
      {
        commentor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        comment: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  isActive: {
    type: Boolean,
  },
  createdAt: {
    type: Date,
  },
  videoEnabled: { type: Boolean, default: true },
  audioEnabled: { type: Boolean, default: true },
});

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;
