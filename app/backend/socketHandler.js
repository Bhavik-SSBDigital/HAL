import { Server } from "socket.io";
import {
  add_comment_in_meeting,
  add_participant_in_meeting,
} from "./controller/meeting-controller.js";
import User from "./models/user.js";
import { ObjectId } from "mongodb";
import Meeting from "./models/Meeting.js";
import { get_attendees_list } from "./controller/meeting-controller.js";

let io;
export let userSockets = new Map(); // Changed to Map

export const initializeSocket = (server) => {
  io = new Server(server, {
    transports: ["websocket"],
    path: "/socket.io/",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["my-custom-header"],
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    socket.on("login", async (username) => {
      socket.username = username; // Set the username on the socket object
      console.log(`Username set for socket ${socket.id}: ${username}`);

      // Now add the user to the Map with socketId as the key
      userSockets.set(socket.id, { socket, username });
    });

    socket.on("join-room", async ({ roomId, username }) => {
      socket.join(roomId);

      const participant = await User.findOne({ username: username }).select(
        "_id"
      );

      await add_participant_in_meeting(roomId, participant._id);

      const meet = await Meeting.findOne({ meetingId: roomId }).select("logs");

      meet.logs.push({
        attendee: participant._id,
        joinedAt: Date.now(),
      });

      await meet.save();

      // Notify other users in the room about the new user
      socket.to(roomId).emit("user-joined", { socketId: socket.id, username });

      // Send the list of users in the room to the newly joined user
      const usersInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        .map((id) => ({
          socketId: id,
          username: userSockets.get(id)?.username, // Retrieve username from the Map
        }))
        .filter((user) => user.socketId !== socket.id);

      if (usersInRoom.length === 0) {
        const attendees = await get_attendees_list(roomId);
        const users = Array.from(userSockets.values()).filter(
          (item) =>
            item.username !== username && attendees.includes(item.username)
        );

        users.forEach((user) => {
          console.log("user", user.username);
          user.socket.emit("meeting-started", {
            message: `${username} has started the meeting`,
          });
        });
      }

      // Check if the startTime has arrived and notify participants
      if (meet.startTime <= Date.now()) {
        const attendees = await get_attendees_list(roomId);
        const users = Array.from(userSockets.values());

        users.forEach((user) => {
          console.log("user", user.username);
          user.socket.emit("meeting-start-time", {
            message: meet.agenda
              ? `It's time for meeting with ID ${meet.meetingId} having agenda ${meet.agenda}`
              : `It's time for meeting with ID ${meet.meetingId}`,
          });
        });
      }

      // Check if the endTime has passed and notify participants
      if (meet.endTime <= Date.now()) {
        socket.to(roomId).emit("meeting-end-time", {
          message: "The meeting time is over!",
        });
      }

      socket.emit("room-users", usersInRoom);

      // Handle sending messages to the room
      socket.on("sendMessage", async ({ meetingId, message, username }) => {
        io.to(meetingId).emit("message", { user: username, text: message });

        const commentor = await User.findOne({ username: username }).select(
          "_id"
        );

        await add_comment_in_meeting(meetingId, commentor._id, message.text);

        const room = io.sockets.adapter.rooms.get(meetingId);
        if (!room) {
          console.log(`Room with meetingId ${meetingId} does not exist`);
          return;
        }

        const usersInRoom = Array.from(room)
          .map((id) => ({
            socketId: id,
            username: userSockets.get(id)?.username, // Retrieve username from the Map
          }))
          .filter((user) => user.socketId !== socket.id);
      });

      // Handle offers, answers, and ICE candidates
      socket.on("offer", (data) => {
        const { target, offer } = data;
        io.to(target).emit("offer", {
          from: socket.id,
          offer,
          name: username,
        });
      });

      socket.on("answer", (data) => {
        const { target, answer } = data;
        io.to(target).emit("answer", {
          from: socket.id,
          answer,
          name: username,
        });
      });

      socket.on("ice-candidate", (data) => {
        const { target, candidate } = data;
        io.to(target).emit("ice-candidate", {
          from: socket.id,
          candidate,
        });
      });

      // Handle leaving the room
      socket.on("leave-room", async ({ roomId, username }) => {
        socket.leave(roomId);

        const meet = await Meeting.findOne({ meetingId: roomId }).select(
          "logs"
        );

        let logIndexWhereAttendeeYetToLeave = meet.logs.findIndex(
          (item) => !item.leftAt
        );

        let logWhereAttendeeYetToLeave =
          meet.logs[logIndexWhereAttendeeYetToLeave];

        meet.logs[logIndexWhereAttendeeYetToLeave] = {
          attendee: logWhereAttendeeYetToLeave.attendee,
          joinedAt: logWhereAttendeeYetToLeave.joinedAt,
          leftAt: Date.now(),
        };

        await meet.save();

        socket.removeAllListeners("sendMessage");
        socket.removeAllListeners("offer");
        socket.removeAllListeners("answer");
        socket.removeAllListeners("ice-candidate");
        socket.removeAllListeners("leave-room");
        userSockets.delete(socket.id); // Remove from the Map

        socket.to(roomId).emit("user-left", { socketId: socket.id, username });
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        userSockets.delete(socket.id); // Remove from the Map

        const rooms = Array.from(socket.rooms);
        rooms.forEach((roomId) => {
          socket
            .to(roomId)
            .emit("user-left", { socketId: socket.id, username });
        });
      });
    });
  });
};

export const getSocketInstance = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
