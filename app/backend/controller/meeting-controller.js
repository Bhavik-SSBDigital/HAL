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

    let attendees = await Promise.all(
      req.body.attendees.map(async (item) => {
        const user = await User.findOne({ username: item }).select("_id");

        return user._id;
      })
    );

    console.log("attendees", attendees);
    console.log("start time", req.body.startTime);
    console.log("end time", req.body.endTime);
    attendees.push(userData._id);

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
      "attendees"
    );

    if (meet) {
      const participants = meet.attendees;

      let hasUserJoinedBeforeInMeet = false;

      for (let i = 0; i < participants.length; i++) {
        const user = participants[i];

        if (user.equals(participant)) {
          hasUserJoinedBeforeInMeet = true;
          break;
        }
      }

      if (!hasUserJoinedBeforeInMeet) {
        meet.attendees.push(participant);
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

export const get_meetings_for_user = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let meetings = await Meeting.find({
      endTime: { $gt: Date.now() },
      attendees: { $in: [new ObjectId(userData._id)] },
    })
      .select("meetingId startTime endTime title agenda createdBy")
      .lean()
      // .populate("attendees", "username") // Populate participant info, e.g., name
      // .populate("createdBy", "username") // Populate creator info if needed
      .exec();

    console.log("meetings", meetings);

    meetings = await Promise.all(
      meetings.map(async (meeting) => {
        let meet_ = meeting;
        const host = await User.findOne({ _id: meeting.createdBy }).select(
          "username"
        );
        return {
          ...meet_,
          createdBy: host.username,
        };
      })
    );

    const formattedMeetings = meetings.reduce((acc, meeting) => {
      const meetingDate = new Date(meeting.startTime);
      const dateStr = meetingDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const dayStr = meetingDate.toLocaleDateString("en-US", {
        weekday: "long",
      });
      const timeStr = meetingDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      // Calculate duration in hours and minutes
      const durationMs =
        new Date(meeting.endTime) - new Date(meeting.startTime);
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
      const durationMinutes = Math.floor(
        (durationMs % (1000 * 60 * 60)) / (1000 * 60)
      );
      const durationStr = `${
        durationHours > 0 ? durationHours + " hr " : ""
      }${durationMinutes} min`;

      // Find or create the date entry
      let dateEntry = acc.find((entry) => entry.date === dateStr);
      if (!dateEntry) {
        dateEntry = { date: dateStr, day: dayStr, scheduledMeetings: [] };
        acc.push(dateEntry);
      }

      // Add the meeting to the date's scheduledMeetings
      dateEntry.scheduledMeetings.push({
        name: meeting.title,
        host: meeting.createdBy,
        time: timeStr,
        duration: durationStr,
      });

      return acc;
    }, []);

    return res.status(200).json({
      meetings: formattedMeetings,
    });
  } catch (error) {
    console.log("Error fetching meetings for user", error);
    return res.status(500).json({
      message: "Error fetching meetings for user",
    });
  }
};

export const is_user_an_attendee = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const meetingId = new ObjectId(req.params.meetingId);

    const meeting = await Meeting.findOne({
      _id: meetingId,
      attendees: { $in: [new ObjectId(userData._id)] },
    }).select("_id");

    return res.status(200).json({
      isUserAnAttendee: !!meeting,
    });
  } catch (error) {
    console.log(
      "Error checking if user is an attendee in a meet or not",
      error
    );
    return res.status(500).json({
      message: "Error checking if user is an attendee in a meet or not",
    });
  }
};
