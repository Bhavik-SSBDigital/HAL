import { v4 as uuidv4 } from "uuid";
import User from "../models/user.js";
import Meeting from "../models/Meeting.js";
import { userSockets } from "../api.js";
import { verifyUser } from "../utility/verifyUser.js";
import { ObjectId } from "mongodb";

export const create_meeting = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let meetingId = uuidv4(); // Generate a unique meeting link

    let duplicatedMeetId = true;

    while (!duplicatedMeetId) {
      const meet = await Meeting.findOne({ meetingId: meetingId }).select(
        "_id"
      );

      if (meet) {
        meetingId = uuidv4();
      } else {
        duplicatedMeetId = false;
      }
    }
    const newMeeting = new Meeting({
      meetingId: meetingId,
      createdBy: new ObjectId(userData._id),
    });
    await newMeeting.save();

    return res.status(200).json({
      message: "Meeting created successfully.",
      meetingId: meetingId,
    });
  } catch (error) {
    console.log("Error creating meeting", error);
    return res.status(500).json({ error: "Failed to create meeting." });
  }
};

export const add_comment_in_meeting = async (meetingId, commentor, comment) => {
  try {
    const meet = await Meeting.findOne({ _id: meetingId });

    if (meet) {
      let commentor_ = await User.findOne({ username: commentor }).select(
        "_id"
      );

      meet.comments.push(comment, {
        commentor: commentor_._id,
        comment: comment,
      });

      await meet.save();
    } else {
      console.log("Error finding meet");
    }
  } catch (error) {
    console.log("Error updating meeting details", error);
    throw new Error(error);
  }
};

export const add_participant_in_meeting = async (meetingId, participant) => {
  try {
    const meet = await Meeting.findOne({ _id: meetingId }).select(
      "participants"
    );

    if (meet) {
      let participant_ = await User.findOne({ username: participant }).select(
        "_id"
      );

      participant_ = participant_._id;

      const participants = meet.participants;

      let hasUserJoinedBeforeInMeet = false;

      for (let i = 0; i < participants.length; i++) {
        const user = participants[i];

        if (user.equals(participant_)) {
          hasUserJoinedBeforeInMeet = true;
          break;
        }
      }

      if (!hasUserJoinedBeforeInMeet) {
        meet.participants.push(participant_);
      }

      await meet.save();
    } else {
      console.log("Error finding meet");
    }
  } catch (error) {
    console.log("Error adding participant in meeting", error);
    throw new Error(error);
  }
};
