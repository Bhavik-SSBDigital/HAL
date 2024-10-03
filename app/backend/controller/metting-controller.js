import { v4 as uuidv4 } from "uuid";
import User from "../models/user.js";
import Meeting from "../models/Meeting.js";
import { userSockets } from "../api.js";

export const create_meeting = async (req, res, next) => {
  try {
    const meetingLink = uuidv4(); // Generate a unique meeting link
    const newMeeting = new Meeting({ meetingLink });
    await newMeeting.save();

    return res.status(200).json({
      message: "Meeting created successfully.",
    });
  } catch (error) {
    console.log("Error creating meeting", error);
    return res.status(500).json({ error: "Failed to create meeting." });
  }
};

export const join_meeting = async (req, res, next) => {
  try {
    const { link } = req.params.id;
    const { username } = req.body;

    const meeting = await Meeting.findOne({ meetingLink: link });

    if (!meeting) {
      return res.status(404).json({
        message: "No meeting found",
      });
    }

    const user = await User.find({ username: username });

    if (!user) {
      return res.status(404).json({
        message:
          "User credentials you are trying to join meet with doesn't exist",
      });
    }

    meeting.participants.push(user._id);

    await meeting.save();

    const userSocket = userSockets.get(username);
    if (userSocket) {
      userSocket.join(link); // Join the user to the meeting room
      res.status(200).json({ message: `${username} joined meeting ${link}` });
    } else {
      res.status(404).json({ error: "User not connected" });
    }

    return res.status(200).json({
      message: "Successfully joined the meeting.",
    });
  } catch (error) {
    console.log("Error joining meeting", error);
    return res.status(500).json({
      message: "Error joining meeting",
    });
  }
};

export const leave_meeting = async (weq, res, next) => {
  try {
    const { meetingId, username } = req.body;

    if (!meetingId || !username) {
      return res
        .status(400)
        .json({ error: "Meeting ID and username are required" });
    }

    const userSocket = userSockets.get(username);
    if (userSocket) {
      userSocket.leave(meetingId); // Remove the user from the meeting room
      res
        .status(200)
        .json({ message: `${username} left meeting ${meetingId}` });
    } else {
      res.status(404).json({ error: "User not connected" });
    }
  } catch (error) {
    console.log("Error leaving meeting", error);
    return res.status(500).json({
      message: "Error leaving meeting",
    });
  }
};

export const comment_in_meet = async (req, res, next) => {
  try {
    const { link } = req.params;
    const { userId, comment } = req.body;

    const meeting = await Meeting.findOne({ meetingLink: link });
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    meeting.comments.push({
      commentor: userId,
      comment: comment,
      timestamp: Date.now(),
    });

    await meeting.save();

    return res.status(200).json({
      message: "commented successfully in meet",
    });
  } catch (error) {
    console.log("Error commenting in meet", error);
    return res.status(500).json({
      message: "Error commenting in meet",
    });
  }
};

export const toggle_media = async (req, res) => {
  const { link } = req.params;
  const { videoEnabled, audioEnabled } = req.body;

  try {
    const meeting = await Meeting.findOne({ meetingLink: link });
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    meeting.videoEnabled = videoEnabled ?? meeting.videoEnabled;
    meeting.audioEnabled = audioEnabled ?? meeting.audioEnabled;

    await meeting.save();

    res.json({ message: "Media settings updated successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to update media settings." });
  }
};
