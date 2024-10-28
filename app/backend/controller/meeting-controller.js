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

    let attendees = Promise.all(
      req.body.attendees.map(async (item) => {
        const user = await User.findOne({ username: item }).select("_id");

        return user._id;
      })
    );

    const newMeeting = new Meeting({
      meetingId: meetingId,
      createdBy: new ObjectId(userData._id),
      attendees: attendees,
      title: req.body.title,
      agenda: req.body.agenda,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      flexibleWithAttendees: req.body.flexibleWithAttendees,
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
    const meet = await Meeting.findOne({ meetingId: String(meetingId) });

    if (meet) {
      meet.comments.push({
        commentor: commentor,
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
    const meet = await Meeting.findOne({ meetingId: String(meetingId) }).select(
      "participants"
    );

    if (meet) {
      const participants = meet.participants;

      let hasUserJoinedBeforeInMeet = false;

      for (let i = 0; i < participants.length; i++) {
        const user = participants[i];

        if (user.equals(participant)) {
          hasUserJoinedBeforeInMeet = true;
          break;
        }
      }

      if (!hasUserJoinedBeforeInMeet) {
        meet.participants.push(participant);
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
