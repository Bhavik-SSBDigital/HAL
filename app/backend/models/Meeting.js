import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  flexibleWithAttendees: {
    type: Boolean,
  },
  title: {
    type: String,
  },
  agenda: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true,
    },
  ],
  comments: [
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
