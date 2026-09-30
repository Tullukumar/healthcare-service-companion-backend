const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
   origin: [
  "http://localhost:5173",
  "https://healthcare-service-companion.vercel.app",
],

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ],

    credentials: true,
  })
);

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);


// ==========================================
// STATIC FILES
//
// Support attachments are stored in:
// server/uploads/support
//
// They can be accessed through:
// http://localhost:5000/uploads/support/<filename>
// ==========================================

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "../uploads")
  )
);


// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
  cors: {
    origin: [
  "http://localhost:5173",
  "https://healthcare-service-companion.vercel.app",
],

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ],

    credentials: true,
  },

  transports: [
    "polling",
    "websocket",
  ],

  allowUpgrades: true,

  pingTimeout: 60000,
  pingInterval: 25000,
});


// ==========================================
// SOCKET BOOKKEEPING
// ==========================================

/*
 * A user can accidentally create more than one
 * Socket.IO connection because of:
 *
 * - React StrictMode
 * - reconnects
 * - multiple tabs
 * - hot reload
 *
 * For ambulance chat we keep only the latest
 * socket for each patient / driver.
 */

const patientSockets = new Map();
const driverSockets = new Map();

const removeSocketFromMap = (
  map,
  userId,
  socket
) => {
  if (!userId) {
    return;
  }

  const existingSocket =
    map.get(String(userId));

  if (
    existingSocket &&
    existingSocket.id === socket.id
  ) {
    map.delete(String(userId));
  }
};


// ==========================================
// SOCKET CONNECTION
// ==========================================

io.on(
  "connection",
  (socket) => {
    console.log(
      "🔌 Socket connected:",
      socket.id
    );


    // ========================================
    // PATIENT ROOM
    // ========================================

    socket.on(
      "join-patient-room",
      (patientId) => {
        try {
          if (!patientId) {
            console.log(
              "❌ Patient ID missing"
            );
            return;
          }

          const id =
            String(patientId);

          const room =
            `patient:${id}`;

          socket.join(room);

          socket.data.patientId =
            id;

          const previousSocket =
            patientSockets.get(id);

          if (
            previousSocket &&
            previousSocket.id !== socket.id
          ) {
            try {
              previousSocket.leave(room);
            } catch (error) {
              console.log(
                "⚠️ Previous patient socket cleanup failed:",
                error.message
              );
            }
          }

          patientSockets.set(
            id,
            socket
          );

          console.log(
            `👤 Patient joined room: ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Patient room error:",
            error
          );
        }
      }
    );


    // ========================================
    // DRIVER ROOM
    // ========================================

    socket.on(
      "join-driver-room",
      (driverId) => {
        try {
          if (!driverId) {
            console.log(
              "❌ Driver ID missing"
            );
            return;
          }

          const id =
            String(driverId);

          const room =
            `driver:${id}`;

          socket.join(room);

          socket.data.driverId =
            id;

          const previousSocket =
            driverSockets.get(id);

          if (
            previousSocket &&
            previousSocket.id !== socket.id
          ) {
            try {
              previousSocket.leave(room);
            } catch (error) {
              console.log(
                "⚠️ Previous driver socket cleanup failed:",
                error.message
              );
            }
          }

          driverSockets.set(
            id,
            socket
          );

          console.log(
            `🚑 Driver joined room: ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Driver room error:",
            error
          );
        }
      }
    );


    // ========================================
    // PATIENT ROOM ALIAS
    // ========================================

    socket.on(
      "patient:join",
      (patientId) => {
        try {
          if (!patientId) {
            return;
          }

          const id =
            String(patientId);

          const room =
            `patient:${id}`;

          socket.join(room);

          socket.data.patientId =
            id;

          patientSockets.set(
            id,
            socket
          );

          console.log(
            `👤 Patient joined room: ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Patient join error:",
            error
          );
        }
      }
    );


    // ========================================
    // DRIVER ROOM ALIAS
    // ========================================

    socket.on(
      "driver:join",
      (driverId) => {
        try {
          if (!driverId) {
            return;
          }

          const id =
            String(driverId);

          const room =
            `driver:${id}`;

          socket.join(room);

          socket.data.driverId =
            id;

          driverSockets.set(
            id,
            socket
          );

          console.log(
            `🚑 Driver joined room: ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Driver join error:",
            error
          );
        }
      }
    );


    // ========================================
    // APPOINTMENT ROOM
    // ========================================

    socket.on(
      "appointment:join",
      (data) => {
        try {
          const appointmentId =
            typeof data === "string"
              ? data
              : data?.appointmentId;

          if (!appointmentId) {
            console.log(
              "❌ Appointment ID missing"
            );
            return;
          }

          const id =
            String(appointmentId);

          const room =
            `appointment:${id}`;

          socket.join(room);

          socket.data.appointmentId =
            id;

          console.log(
            `📅 Socket ${socket.id} joined room: ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Appointment join error:",
            error
          );
        }
      }
    );


    // ========================================
    // LEAVE APPOINTMENT ROOM
    // ========================================

    socket.on(
      "appointment:leave",
      (data) => {
        try {
          const appointmentId =
            typeof data === "string"
              ? data
              : data?.appointmentId;

          if (!appointmentId) {
            return;
          }

          const id =
            String(appointmentId);

          const room =
            `appointment:${id}`;

          socket.leave(room);

          if (
            socket.data?.appointmentId ===
            id
          ) {
            socket.data.appointmentId =
              null;
          }

          console.log(
            `📅 Socket ${socket.id} left room: ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Appointment leave error:",
            error
          );
        }
      }
    );


    // ========================================
    // APPOINTMENT CHAT
    // ========================================

    socket.on(
      "appointment:chat-message",
      (message) => {
        try {
          const {
            messageId,
            appointmentId,
            senderId,
            senderRole,
            text,
          } = message || {};

          if (!appointmentId) {
            console.log(
              "❌ appointmentId missing"
            );
            return;
          }

          if (!senderId) {
            console.log(
              "❌ senderId missing"
            );
            return;
          }

          if (
            !text ||
            !String(text).trim()
          ) {
            console.log(
              "❌ Message text missing"
            );
            return;
          }

          const allowedRoles = [
            "doctor",
            "patient",
            "admin",
          ];

          if (
            !allowedRoles.includes(
              senderRole
            )
          ) {
            console.log(
              "❌ Invalid sender role:",
              senderRole
            );
            return;
          }

          const now =
            new Date().toISOString();

          const chatMessage = {
            messageId:
              messageId ||
              `${appointmentId}-${senderId}-${Date.now()}`,

            appointmentId:
              String(appointmentId),

            senderId:
              String(senderId),

            senderRole,

            text:
              String(text).trim(),

            createdAt: now,
            timestamp: now,
          };

          const room =
            `appointment:${String(
              appointmentId
            )}`;

          socket
            .to(room)
            .emit(
              "appointment:chat-message",
              chatMessage
            );

          console.log(
            `💬 ${senderRole} → ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Appointment chat error:",
            error
          );

          socket.emit(
            "appointment:communication-error",
            {
              message:
                "Unable to send appointment message.",
            }
          );
        }
      }
    );


    // ========================================
    // CALL OFFER
    // ========================================

    socket.on(
      "appointment:call-offer",
      (data) => {
        try {
          const {
            appointmentId,
            callType,
            offer,
          } = data || {};

          if (!appointmentId) {
            return;
          }

          if (!offer) {
            return;
          }

          if (
            callType !== "audio" &&
            callType !== "video"
          ) {
            return;
          }

          const room =
            `appointment:${String(
              appointmentId
            )}`;

          socket
            .to(room)
            .emit(
              "appointment:call-offer",
              {
                appointmentId:
                  String(
                    appointmentId
                  ),

                callType,
                offer,
              }
            );

          console.log(
            `📞 ${callType} call offer sent to ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Call offer error:",
            error
          );
        }
      }
    );


    // ========================================
    // CALL ANSWER
    // ========================================

    socket.on(
      "appointment:call-answer",
      (data) => {
        try {
          const {
            appointmentId,
            answer,
          } = data || {};

          if (!appointmentId) {
            return;
          }

          if (!answer) {
            return;
          }

          const room =
            `appointment:${String(
              appointmentId
            )}`;

          socket
            .to(room)
            .emit(
              "appointment:call-answer",
              {
                appointmentId:
                  String(
                    appointmentId
                  ),

                answer,
              }
            );

          console.log(
            `📞 Call answer sent to ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Call answer error:",
            error
          );
        }
      }
    );


    // ========================================
    // ICE CANDIDATE
    // ========================================

    socket.on(
      "appointment:ice-candidate",
      (data) => {
        try {
          const {
            appointmentId,
            candidate,
          } = data || {};

          if (
            !appointmentId ||
            !candidate
          ) {
            return;
          }

          const room =
            `appointment:${String(
              appointmentId
            )}`;

          socket
            .to(room)
            .emit(
              "appointment:ice-candidate",
              {
                appointmentId:
                  String(
                    appointmentId
                  ),

                candidate,
              }
            );
        } catch (error) {
          console.error(
            "❌ ICE candidate error:",
            error
          );
        }
      }
    );


    // ========================================
    // CALL ENDED
    // ========================================

    socket.on(
      "appointment:call-ended",
      (data) => {
        try {
          const {
            appointmentId,
          } = data || {};

          if (!appointmentId) {
            return;
          }

          const room =
            `appointment:${String(
              appointmentId
            )}`;

          socket
            .to(room)
            .emit(
              "appointment:call-ended",
              {
                appointmentId:
                  String(
                    appointmentId
                  ),
              }
            );

          console.log(
            `📴 Call ended in ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Call end error:",
            error
          );
        }
      }
    );


    // ========================================
    // AMBULANCE CHAT
    // ========================================

    socket.on(
      "ambulance:chat-message",
      (message) => {
        try {
          const {
            requestId,
            senderId,
            receiverId,
            senderRole,
            text,
          } = message || {};

          if (!requestId) {
            console.log(
              "❌ requestId missing"
            );
            return;
          }

          if (!senderId) {
            console.log(
              "❌ senderId missing"
            );
            return;
          }

          if (!receiverId) {
            console.log(
              "❌ receiverId missing"
            );
            return;
          }

          if (
            !text ||
            !String(text).trim()
          ) {
            console.log(
              "❌ Message text missing"
            );
            return;
          }

          const allowedRoles = [
            "patient",
            "ambulance",
            "driver",
          ];

          if (
            !allowedRoles.includes(
              senderRole
            )
          ) {
            console.log(
              "❌ Invalid ambulance sender role:",
              senderRole
            );
            return;
          }

          const now =
            new Date().toISOString();

          const chatMessage = {
            messageId:
              message.messageId ||
              `${requestId}-${senderId}-${Date.now()}`,

            requestId:
              String(requestId),

            senderId:
              String(senderId),

            receiverId:
              String(receiverId),

            senderRole,

            text:
              String(text).trim(),

            createdAt: now,
            timestamp: now,
          };

          if (
            senderRole ===
            "patient"
          ) {
            const driverRoom =
              `driver:${String(
                receiverId
              )}`;

            io
              .to(driverRoom)
              .emit(
                "ambulance:chat-message",
                chatMessage
              );

            console.log(
              `📤 Patient → Driver: ${driverRoom}`
            );
          } else {
            const patientRoom =
              `patient:${String(
                receiverId
              )}`;

            io
              .to(patientRoom)
              .emit(
                "ambulance:chat-message",
                chatMessage
              );

            console.log(
              `📤 Driver → Patient: ${patientRoom}`
            );
          }

          socket.emit(
            "ambulance:chat-message-sent",
            chatMessage
          );
        } catch (error) {
          console.error(
            "❌ Ambulance chat error:",
            error
          );

          socket.emit(
            "ambulance:chat-error",
            {
              message:
                "Unable to send message.",
            }
          );
        }
      }
    );


    // ========================================
    // AMBULANCE REQUEST ROOM
    // ========================================

    socket.on(
      "ambulance:join-request",
      (requestId) => {
        try {
          if (!requestId) {
            return;
          }

          const id =
            String(requestId);

          const room =
            `ambulance-request:${id}`;

          socket.join(room);

          socket.data.ambulanceRequestId =
            id;

          console.log(
            `🚑 Socket ${socket.id} joined ambulance request room: ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Ambulance request room error:",
            error
          );
        }
      }
    );

// ========================================
// AMBULANCE VOICE CALL - CALL OFFER
// ========================================

socket.on(
  "ambulance:call-offer",
  (data) => {
    try {
      const {
        requestId,
        receiverId,
        callType,
        offer,
      } = data || {};

      if (!requestId) {
        console.log(
          "❌ Ambulance call requestId missing"
        );
        return;
      }

      if (!receiverId) {
        console.log(
          "❌ Ambulance call receiverId missing"
        );
        return;
      }

      if (!offer) {
        console.log(
          "❌ Ambulance call offer missing"
        );
        return;
      }

      if (callType !== "audio") {
        console.log(
          "❌ Only audio ambulance calls are supported"
        );
        return;
      }

      // ----------------------------------------
      // Identify caller from the existing
      // socket bookkeeping already used by
      // this server.
      // ----------------------------------------

      let callerId = null;
      let callerRole = null;

      if (socket.data?.patientId) {
        callerId =
          String(socket.data.patientId);

        callerRole = "patient";
      } else if (
        socket.data?.driverId
      ) {
        callerId =
          String(socket.data.driverId);

        callerRole = "driver";
      }

      if (!callerId || !callerRole) {
        socket.emit(
          "ambulance:call-error",
          {
            requestId:
              String(requestId),

            message:
              "Unable to identify caller.",
          }
        );

        return;
      }

      // ----------------------------------------
      // Find receiver using the EXISTING maps.
      // ----------------------------------------

      let receiverSocket = null;

      if (callerRole === "patient") {
        receiverSocket =
          driverSockets.get(
            String(receiverId)
          );
      } else if (
        callerRole === "driver"
      ) {
        receiverSocket =
          patientSockets.get(
            String(receiverId)
          );
      }

      if (!receiverSocket) {
        socket.emit(
          "ambulance:call-error",
          {
            requestId:
              String(requestId),

            message:
              "The other person is currently offline.",
          }
        );

        console.log(
          `📵 Ambulance call receiver offline: ${receiverId}`
        );

        return;
      }

      // ----------------------------------------
      // Forward offer
      // ----------------------------------------

      receiverSocket.emit(
        "ambulance:call-offer",
        {
          requestId:
            String(requestId),

          callerId,

          callerRole,

          callType: "audio",

          offer,
        }
      );

      console.log(
        `📞 Ambulance audio call offer: ${callerRole} ${callerId} → ${receiverId}`
      );
    } catch (error) {
      console.error(
        "❌ Ambulance call offer error:",
        error
      );

      socket.emit(
        "ambulance:call-error",
        {
          requestId:
            data?.requestId
              ? String(data.requestId)
              : null,

          message:
            "Unable to start ambulance call.",
        }
      );
    }
  }
);


// ========================================
// AMBULANCE VOICE CALL - CALL ANSWER
// ========================================

socket.on(
  "ambulance:call-answer",
  (data) => {
    try {
      const {
        requestId,
        receiverId,
        answer,
      } = data || {};

      if (!requestId) {
        console.log(
          "❌ Ambulance answer requestId missing"
        );
        return;
      }

      if (!receiverId) {
        console.log(
          "❌ Ambulance answer receiverId missing"
        );
        return;
      }

      if (!answer) {
        console.log(
          "❌ Ambulance answer missing"
        );
        return;
      }

      // ----------------------------------------
      // Identify answering user
      // ----------------------------------------

      let callerId = null;
      let callerRole = null;

      if (socket.data?.patientId) {
        callerId =
          String(socket.data.patientId);

        callerRole = "patient";
      } else if (
        socket.data?.driverId
      ) {
        callerId =
          String(socket.data.driverId);

        callerRole = "driver";
      }

      if (!callerId || !callerRole) {
        return;
      }

      // ----------------------------------------
      // Find original caller
      // ----------------------------------------

      let receiverSocket = null;

      if (callerRole === "patient") {
        receiverSocket =
          driverSockets.get(
            String(receiverId)
          );
      } else if (
        callerRole === "driver"
      ) {
        receiverSocket =
          patientSockets.get(
            String(receiverId)
          );
      }

      if (!receiverSocket) {
        socket.emit(
          "ambulance:call-error",
          {
            requestId:
              String(requestId),

            message:
              "The caller is no longer connected.",
          }
        );

        return;
      }

      receiverSocket.emit(
        "ambulance:call-answer",
        {
          requestId:
            String(requestId),

          answer,
        }
      );

      console.log(
        `📞 Ambulance call answer: ${callerRole} ${callerId} → ${receiverId}`
      );
    } catch (error) {
      console.error(
        "❌ Ambulance call answer error:",
        error
      );
    }
  }
);


// ========================================
// AMBULANCE VOICE CALL - ICE CANDIDATE
// ========================================

socket.on(
  "ambulance:ice-candidate",
  (data) => {
    try {
      const {
        requestId,
        receiverId,
        candidate,
      } = data || {};

      if (!requestId) {
        return;
      }

      if (!receiverId) {
        return;
      }

      if (!candidate) {
        return;
      }

      // ----------------------------------------
      // Identify sender
      // ----------------------------------------

      let senderRole = null;

      if (socket.data?.patientId) {
        senderRole = "patient";
      } else if (
        socket.data?.driverId
      ) {
        senderRole = "driver";
      }

      if (!senderRole) {
        return;
      }

      // ----------------------------------------
      // Find other side
      // ----------------------------------------

      let receiverSocket = null;

      if (senderRole === "patient") {
        receiverSocket =
          driverSockets.get(
            String(receiverId)
          );
      } else if (
        senderRole === "driver"
      ) {
        receiverSocket =
          patientSockets.get(
            String(receiverId)
          );
      }

      if (!receiverSocket) {
        return;
      }

      receiverSocket.emit(
        "ambulance:ice-candidate",
        {
          requestId:
            String(requestId),

          candidate,
        }
      );
    } catch (error) {
      console.error(
        "❌ Ambulance ICE candidate error:",
        error
      );
    }
  }
);


// ========================================
// AMBULANCE VOICE CALL - END CALL
// ========================================

socket.on(
  "ambulance:call-ended",
  (data) => {
    try {
      const {
        requestId,
        receiverId,
      } = data || {};

      if (!requestId) {
        return;
      }

      if (!receiverId) {
        return;
      }

      // ----------------------------------------
      // Identify sender
      // ----------------------------------------

      let senderRole = null;

      if (socket.data?.patientId) {
        senderRole = "patient";
      } else if (
        socket.data?.driverId
      ) {
        senderRole = "driver";
      }

      if (!senderRole) {
        return;
      }

      // ----------------------------------------
      // Find receiver
      // ----------------------------------------

      let receiverSocket = null;

      if (senderRole === "patient") {
        receiverSocket =
          driverSockets.get(
            String(receiverId)
          );
      } else if (
        senderRole === "driver"
      ) {
        receiverSocket =
          patientSockets.get(
            String(receiverId)
          );
      }

      if (!receiverSocket) {
        return;
      }

      receiverSocket.emit(
        "ambulance:call-ended",
        {
          requestId:
            String(requestId),
        }
      );

      console.log(
        `📴 Ambulance call ended: ${requestId}`
      );
    } catch (error) {
      console.error(
        "❌ Ambulance call ended error:",
        error
      );
    }
  }
);


// ========================================
// AMBULANCE VOICE CALL - REJECT
// ========================================

socket.on(
  "ambulance:call-rejected",
  (data) => {
    try {
      const {
        requestId,
        receiverId,
      } = data || {};

      if (!requestId) {
        return;
      }

      if (!receiverId) {
        return;
      }

      let senderRole = null;

      if (socket.data?.patientId) {
        senderRole = "patient";
      } else if (
        socket.data?.driverId
      ) {
        senderRole = "driver";
      }

      if (!senderRole) {
        return;
      }

      let receiverSocket = null;

      if (senderRole === "patient") {
        receiverSocket =
          driverSockets.get(
            String(receiverId)
          );
      } else if (
        senderRole === "driver"
      ) {
        receiverSocket =
          patientSockets.get(
            String(receiverId)
          );
      }

      if (!receiverSocket) {
        return;
      }

      receiverSocket.emit(
        "ambulance:call-rejected",
        {
          requestId:
            String(requestId),
        }
      );

      console.log(
        `📵 Ambulance call rejected: ${requestId}`
      );
    } catch (error) {
      console.error(
        "❌ Ambulance call rejection error:",
        error
      );
    }
  }
);


// ========================================
// AMBULANCE VOICE CALL - BUSY
// ========================================

socket.on(
  "ambulance:call-busy",
  (data) => {
    try {
      const {
        requestId,
        receiverId,
      } = data || {};

      if (!requestId) {
        return;
      }

      if (!receiverId) {
        return;
      }

      let senderRole = null;

      if (socket.data?.patientId) {
        senderRole = "patient";
      } else if (
        socket.data?.driverId
      ) {
        senderRole = "driver";
      }

      if (!senderRole) {
        return;
      }

      let receiverSocket = null;

      if (senderRole === "patient") {
        receiverSocket =
          driverSockets.get(
            String(receiverId)
          );
      } else if (
        senderRole === "driver"
      ) {
        receiverSocket =
          patientSockets.get(
            String(receiverId)
          );
      }

      if (!receiverSocket) {
        return;
      }

      receiverSocket.emit(
        "ambulance:call-busy",
        {
          requestId:
            String(requestId),
        }
      );
    } catch (error) {
      console.error(
        "❌ Ambulance call busy error:",
        error
      );
    }
  }
);



    // ========================================
    // DISCONNECT
    // ========================================

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "🔌 Socket disconnected:",
          socket.id,
          reason
        );

        if (
          socket.data?.patientId
        ) {
          removeSocketFromMap(
            patientSockets,
            socket.data.patientId,
            socket
          );
        }

        if (
          socket.data?.driverId
        ) {
          removeSocketFromMap(
            driverSockets,
            socket.data.driverId,
            socket
          );
        }

        if (socket.data) {
          socket.data.patientId =
            null;

          socket.data.driverId =
            null;

          socket.data.appointmentId =
            null;

          socket.data.ambulanceRequestId =
            null;

          socket.data.userRole =
            null;
        }

        console.log(
          `🧹 Socket cleanup completed: ${socket.id}`
        );
      }
    );
  }
);


// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
  "/",
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "HealthCompanion backend is running.",
    });
  }
);


// ==========================================
// API HEALTH CHECK
// ==========================================

app.get(
  "/api/health",
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "HealthCompanion API is healthy.",
      timestamp:
        new Date().toISOString(),
    });
  }
);


// ==========================================
// ROUTES
// ==========================================

// ------------------------------------------
// AUTH ROUTES
// ------------------------------------------

try {
  const authRoutes =
    require("./routes/authRoutes");

  app.use(
    "/api/auth",
    authRoutes
  );
} catch (error) {
  console.log(
    "⚠️ authRoutes not loaded:",
    error.message
  );
}

// ------------------------------------------
// OTP ROUTES
// ------------------------------------------

try {
  const otpRoutes =
    require("./routes/otpRoutes");

  app.use(
    "/api/auth/otp",
    otpRoutes
  );

  console.log("✅ otpRoutes loaded");
} catch (error) {
  console.log(
    "⚠️ otpRoutes not loaded:",
    error.message
  );
}



//==============================

const medicalRecordRoutes = require("./routes/medicalRecordRoutes");
app.use(
  "/api/medical-records",
  medicalRecordRoutes
);


// ------------------------------------------
// USER ROUTES
// ------------------------------------------

try {
  const userRoutes =
    require("./routes/userRoutes");

  app.use(
    "/api/users",
    userRoutes
  );
} catch (error) {
  console.log(
    "⚠️ userRoutes not loaded:",
    error.message
  );
}


// ------------------------------------------
// DOCTOR ROUTES
// ------------------------------------------

try {
  const doctorRoutes =
    require("./routes/doctorRoutes");

  app.use(
    "/api/doctors",
    doctorRoutes
  );
} catch (error) {
  console.log(
    "⚠️ doctorRoutes not loaded:",
    error.message
  );
}


// ------------------------------------------
// APPOINTMENT ROUTES
// ------------------------------------------

try {
  const appointmentRoutes =
    require(
      "./routes/appointmentRoutes"
    );

  app.use(
    "/api/appointments",
    appointmentRoutes
  );
} catch (error) {
  console.log(
    "⚠️ appointmentRoutes not loaded:",
    error.message
  );
}


// ------------------------------------------
// AMBULANCE ROUTES
// ------------------------------------------

try {
  const ambulanceRoutes =
    require(
      "./routes/ambulanceRoutes"
    );

  app.use(
    "/api/ambulances",
    ambulanceRoutes
  );
} catch (error) {
  console.log(
    "⚠️ ambulanceRoutes not loaded:",
    error.message
  );
}


// ------------------------------------------
// AMBULANCE REQUEST ROUTES
// ------------------------------------------

try {
  const ambulanceRequestRoutes =
    require(
      "./routes/ambulanceRequestRoutes"
    );

  app.use(
    "/api/ambulance-requests",
    ambulanceRequestRoutes
  );

  console.log(
    "✅ ambulanceRequestRoutes loaded"
  );
} catch (error) {
  console.log(
    "⚠️ ambulanceRequestRoutes not loaded:",
    error.message
  );
}


// ------------------------------------------
// DRIVER ROUTES
// ------------------------------------------

try {
  const driverRoutes =
    require("./routes/driverRoutes");

  app.use(
    "/api/drivers",
    driverRoutes
  );
} catch (error) {
  console.log(
    "⚠️ driverRoutes not loaded:",
    error.message
  );
}


// ------------------------------------------
// HOSPITAL ROUTES
// ------------------------------------------

try {
  const hospitalRoutes =
    require(
      "./routes/hospitalRoutes"
    );

  app.use(
    "/api/hospitals",
    hospitalRoutes
  );
} catch (error) {
  console.log(
    "⚠️ hospitalRoutes not loaded:",
    error.message
  );
}


// ------------------------------------------
// ADMIN ROUTES
// ------------------------------------------

try {
  const adminRoutes =
    require("./routes/adminRoutes");

  app.use(
    "/api/admin",
    adminRoutes
  );
} catch (error) {
  console.log(
    "⚠️ adminRoutes not loaded:",
    error.message
  );
}


// ------------------------------------------
// PAYMENT ROUTES
// ------------------------------------------

try {
  const paymentRoutes =
    require("./routes/paymentRoutes");

  app.use(
    "/api/payment",
    paymentRoutes
  );
} catch (error) {
  console.log(
    "⚠️ paymentRoutes not loaded:",
    error.message
  );
}


// ------------------------------------------
// SUPPORT ROUTES
// ------------------------------------------

try {
  const supportRoutes =
    require("./routes/supportRoutes");

  app.use(
    "/api/support",
    supportRoutes
  );
} catch (error) {
  console.log(
    "⚠️ supportRoutes not loaded:",
    error.message
  );
}


// ==========================================
// AI HEALTH COMPANION
// /api/ai
// ==========================================

const aiRoutes =
  require("./routes/aiRoutes");

app.use(
  "/api/ai",
  aiRoutes
);


// ==========================================
// 404 HANDLER
// ==========================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API endpoint not found.",
      path: req.originalUrl,
    });
  }
);


// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "❌ Global server error:",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    res.status(
      error.statusCode ||
      error.status ||
      500
    ).json({
      success: false,
      message:
        error.message ||
        "Internal server error.",
    });
  }
);


// ==========================================
// MONGODB CONNECTION
// ==========================================

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error(
    "❌ MongoDB URI is missing in .env"
  );
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log(
        "✅ MongoDB connected successfully"
      );
    })
    .catch((error) => {
      console.error(
        "❌ MongoDB connection failed:",
        error.message
      );
    });
}


// ==========================================
// MONGOOSE EVENTS
// ==========================================

mongoose.connection.on(
  "connected",
  () => {
    console.log(
      "🟢 Mongoose connected to MongoDB"
    );
  }
);

mongoose.connection.on(
  "error",
  (error) => {
    console.error(
      "🔴 Mongoose connection error:",
      error.message
    );
  }
);

mongoose.connection.on(
  "disconnected",
  () => {
    console.log(
      "🟡 Mongoose disconnected"
    );
  }
);


// ==========================================
// START SERVER
// ==========================================

server.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      "🚀 Healthcare Service Companion Backend"
    );

    console.log(
      "=========================================="
    );

    console.log(
      `📡 Server running on http://localhost:${PORT}`
    );

    console.log(
      `❤️ Health check: http://localhost:${PORT}/api/health`
    );

    console.log(
      `🔌 Socket.IO running on http://localhost:${PORT}`
    );

    console.log(
      "=========================================="
    );

    console.log(
      "✅ Routes loaded:"
    );

    console.log(
      "   /api/auth"
    );

    console.log(
      "   /api/users"
    );

    console.log(
      "   /api/doctors"
    );

    console.log(
      "   /api/appointments"
    );

    console.log(
      "   /api/ambulances"
    );

    console.log(
      "   /api/ambulance-requests"
    );

    console.log(
      "   /api/drivers"
    );

    console.log(
      "   /api/hospitals"
    );

    console.log(
      "   /api/admin"
    );

    console.log(
      "   /api/payment"
    );

    console.log(
      "   /api/support"
    );

    console.log(
      "   /api/ai"
    );

    console.log(
      "=========================================="
    );
    console.log("");
  }
);


// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const gracefulShutdown =
  async (signal) => {
    console.log(
      `\n🛑 ${signal} received. Shutting down...`
    );

    server.close(
      async () => {
        console.log(
          "🔌 HTTP server closed"
        );

        try {
          await mongoose.connection.close();

          console.log(
            "🗄️ MongoDB connection closed"
          );
        } catch (error) {
          console.error(
            "❌ MongoDB shutdown error:",
            error.message
          );
        }

        process.exit(0);
      }
    );

    setTimeout(
      () => {
        console.error(
          "⚠️ Forced shutdown"
        );

        process.exit(1);
      },
      10000
    );
  };


process.on(
  "SIGINT",
  () => {
    gracefulShutdown("SIGINT");
  }
);

process.on(
  "SIGTERM",
  () => {
    gracefulShutdown("SIGTERM");
  }
);


// ==========================================
// UNHANDLED PROMISE REJECTION
// ==========================================

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "❌ Unhandled Promise Rejection:",
      reason
    );
  }
);


// ==========================================
// UNCAUGHT EXCEPTION
// ==========================================

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  app,
  server,
  io,
};