import { v4 as uuidv4 } from "uuid";
import User from "../models/user.js";
import Meeting from "../models/Meeting.js";
import { verifyUser } from "../utility/verifyUser.js";
import { ObjectId } from "mongodb";
import { getSocketInstance } from "../socketHandler.js";
import moment from "moment";

const checkIfRoomHasParticipants = (roomId) => {
  const io = getSocketInstance(); // Get the Socket.io instance

  const room = io.sockets.adapter.rooms.get(roomId); // Get the room by its ID

  if (room && room.size > 0) {
    // Room exists and has participants

    return true;
  } else {
    // Room is empty or doesn't exist

    return false;
  }
};

/*

[
  {
    "isRecurring": true,
    "frequency": "daily",
    "dayOfWeek": null,
    "dateOfMonth": null
  },
  {
    "isRecurring": true,
    "frequency": "weekly",
    "dayOfWeek": "Monday",
    "dateOfMonth": null
  },
  {
    "isRecurring": true,
    "frequency": "monthly",
    "dayOfWeek": null,
    "dateOfMonth": 15
  },
  {
    "isRecurring": false,
    "frequency": null,
    "dayOfWeek": null,
    "dateOfMonth": null
  }
]

*/

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

    const { isRecurring, frequency, dayOfWeek, dateOfMonth } =
      req.body.recurrence || {};

    if (isRecurring) {
      const meetings = [];
      const maxRecurrences = 12; // For example, cap the number of recurrences
      let currentStartTime = startTime;
      let currentEndTime = endTime;

      for (let i = 0; i < maxRecurrences; i++) {
        const newMeeting = {
          meetingId: uuidv4(),
          createdBy: userData._id,
          attendees,
          title: req.body.title,
          agenda: req.body.agenda,
          startTime: currentStartTime,
          endTime: currentEndTime,
          flexibleWithAttendees: req.body.flexibleWithAttendees,
          recurrence: { isRecurring, frequency, dayOfWeek, dateOfMonth },
        };

        meetings.push(newMeeting);

        // Update the next start and end times based on frequency
        if (frequency === "daily") {
          currentStartTime.setDate(currentStartTime.getDate() + 1);
          currentEndTime.setDate(currentEndTime.getDate() + 1);
        } else if (frequency === "weekly") {
          currentStartTime.setDate(currentStartTime.getDate() + 7);
          currentEndTime.setDate(currentEndTime.getDate() + 7);
        } else if (frequency === "monthly") {
          currentStartTime.setMonth(currentStartTime.getMonth() + 1);
          currentEndTime.setMonth(currentEndTime.getMonth() + 1);
        }
      }
    }
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

    const host = await User.findOne({ _id: newMeeting.createdBy }).select(
      "username"
    );

    // Format the meeting response based on `get_meetings_for_user` structure
    const meetingDate = new Date(newMeeting.startTime);
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

    const durationMs =
      new Date(newMeeting.endTime) - new Date(newMeeting.startTime);
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor(
      (durationMs % (1000 * 60 * 60)) / (1000 * 60)
    );
    const durationStr = `${
      durationHours > 0 ? durationHours + " hr " : ""
    }${durationMinutes} min`;

    const formattedMeeting = {
      meetingId: newMeeting.meetingId,
      name: newMeeting.title || "",
      host: host.username,
      agenda: newMeeting.agenda || "",
      time: timeStr,
      duration: durationStr,
      date: dateStr,
      day: dayStr,
    };

    return res.status(200).json({
      message: "Meeting created successfully.",
      meeting: formattedMeeting,
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

export const add_comment_in_meeting_after_meeting_time = async (
  req,
  res,
  next
) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const { meetingId, comment } = req.body;

    const meet = await Meeting.findOne({ meetingId: String(meetingId) });

    if (meet) {
      meet.comments.push({
        commentor: userData._id,
        comment: comment,
      });

      await meet.save();

      return res.status(200).json({
        message: "added comment successfully",
      });
    } else {
      console.log("Error finding meet");
      return res.status(500).json({
        message: "Error finding meet",
      });
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
      attendees: { $in: [new ObjectId(userData._id)] },
    })
      .select("meetingId startTime endTime title agenda createdBy recurrence")
      .lean()
      .exec();

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
      const recurrence = meeting.recurrence;
      let meetingDate = new Date(meeting.startTime);

      // Handle recurrence
      if (recurrence) {
        if (recurrence === "daily") {
          // For daily recurrence, we just add the meeting for today
          meetingDate = new Date();
        } else if (recurrence === "weekly") {
          // For weekly recurrence, find the next date of the same weekday
          const nextMeetingDate = moment(meetingDate).add(1, "weeks").toDate();
          meetingDate = nextMeetingDate;
        } else if (recurrence === "monthly") {
          // For monthly recurrence, find the next occurrence of the same day in the next month
          const nextMeetingDate = moment(meetingDate).add(1, "months").toDate();
          meetingDate = nextMeetingDate;
        }
      }

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
        meetingId: meeting.meetingId,
        name: meeting.title || "",
        host: meeting.createdBy,
        agenda: meeting.agenda || "",
        time: timeStr,
        duration: durationStr,
        anyParticipantInMeeting: checkIfRoomHasParticipants(meeting.meetingId),
        meetingEnded: meeting.recurrence ? false : meeting.endTime < Date.now(),
        recurrence: meeting.recurrence, // Add recurrence property
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

    const meet = await Meeting.findOne({
      meetingId: req.params.meetingId,
    }).select("_id");

    const meetingId = meet._id;

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

export const get_meeting_details = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const meetingId = req.params.meetingId;
    let meet = await Meeting.findOne({ meetingId: meetingId }).lean();

    // Retrieve host username
    const host = await User.findOne({ _id: meet.createdBy }).select("username");
    meet.createdBy = host.username;

    // Process attendees
    meet.attendees = await Promise.all(
      (meet.attendees || []).map(async (attendeeId) => {
        const attendee = await User.findOne({ _id: attendeeId }).select(
          "username"
        );
        return attendee ? attendee.username : null;
      })
    );

    // Process logs
    meet.logs = await Promise.all(
      (meet.logs || []).map(async (log) => {
        const actorAttendee = await User.findOne({ _id: log.attendee }).select(
          "username"
        );
        return {
          attendee: actorAttendee ? actorAttendee.username : null,
          joinedAt: log.joinedAt,
          leftAt: log.leftAt,
        };
      })
    );

    // Process comments
    meet.comments = await Promise.all(
      (meet.comments || []).map(async (item) => {
        const commentorUser = await User.findOne({
          _id: item.commentor,
        }).select("username");
        return {
          commentor: commentorUser ? commentorUser.username : null,
          comment: item.comment,
          timestamp: item.timestamp,
        };
      })
    );

    return res.status(200).json({
      meetingDetails: meet,
    });
  } catch (error) {
    console.log("Error getting meeting details", error);
    return res.status(500).json({
      message: "Error getting meeting details",
    });
  }
};

export const get_attendees_list = async (meetingId) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: meetingId })
      .select("participants")
      .lean();

    let participants = meeting.attendees;

    participants = await Promise.all(
      participants.map(async (participant) => {
        let participant_ = participant;

        participant_ = await User.findOne({ _id: participant_ }).select(
          "username"
        );

        return participant_.username;
      })
    );
  } catch (error) {
    console.log("Error getting meeting participant", error);
    return [];
  }
};
