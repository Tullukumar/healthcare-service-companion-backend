// ==========================================
// HEALTHCOMPANION SERVER
// ==========================================

// ==========================================
// IMPORTS
// ==========================================

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================

dotenv.config();

// ==========================================
// EMAIL SERVICE
// ==========================================

const {
  verifyEmailConnection,
} = require("./utils/email");

// ==========================================
// APP INITIALIZATION
// ==========================================

const app = express();

const server = http.createServer(app);

// ==========================================
// PORT
// ==========================================

const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================

// ==========================================
// CORS
// ==========================================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ==========================================
// JSON
// ==========================================

app.use(express.json());

// ==========================================
// URL ENCODED DATA
// ==========================================

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ==========================================
// STATIC UPLOADS
// ==========================================
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
    origin: "http://localhost:5173",

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ],

    credentials: true,
  },
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

  const key = String(userId);

  const currentSocket =
    map.get(key);

  if (
    currentSocket &&
    currentSocket.id === socket.id
  ) {
    map.delete(key);
  }
};

const getUserSocket = (
  map,
  userId
) => {
  if (!userId) {
    return null;
  }

  return (
    map.get(
      String(userId)
    ) || null
  );
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
    // PATIENT PERSONAL ROOM
    // ========================================

    socket.on(
      "join-patient-room",
      (patientId) => {
        if (!patientId) {
          return;
        }

        const id =
          String(patientId);

        const previousSocket =
          patientSockets.get(id);

        if (
          previousSocket &&
          previousSocket.id !==
            socket.id
        ) {
          previousSocket.leave(
            `patient:${id}`
          );
        }

        patientSockets.set(
          id,
          socket
        );

        socket.data =
          socket.data || {};

        socket.data.patientId =
          id;

        socket.data.userRole =
          "patient";

        socket.join(
          `patient:${id}`
        );

        console.log(
          `👤 Patient ${id} joined room patient:${id}`
        );
      }
    );

    // ========================================
    // DRIVER PERSONAL ROOM
    // ========================================

    socket.on(
      "join-driver-room",
      (driverId) => {
        if (!driverId) {
          return;
        }

        const id =
          String(driverId);

        const previousSocket =
          driverSockets.get(id);

        if (
          previousSocket &&
          previousSocket.id !==
            socket.id
        ) {
          previousSocket.leave(
            `driver:${id}`
          );
        }

        driverSockets.set(
          id,
          socket
        );

        socket.data =
          socket.data || {};

        socket.data.driverId =
          id;

        socket.data.userRole =
          "driver";

        socket.join(
          `driver:${id}`
        );

        console.log(
          `🚑 Driver ${id} joined room driver:${id}`
        );
      }
    );

    // ========================================
    // APPOINTMENT ROOM
    // DOCTOR ↔ PATIENT
    // ========================================

    socket.on(
      "appointment:join",
      async (data) => {
        try {
          const appointmentId =
            typeof data === "string"
              ? data
              : data?.appointmentId;

          if (!appointmentId) {
            socket.emit(
              "appointment:communication-error",
              {
                message:
                  "Appointment information is missing.",
              }
            );

            return;
          }

          const room =
            `appointment:${String(
              appointmentId
            )}`;

          await socket.join(
            room
          );

          socket.data =
            socket.data || {};

          socket.data.appointmentId =
            String(
              appointmentId
            );

          console.log(
            `📅 Socket ${socket.id} joined ${room}`
          );

          socket.emit(
            "appointment:joined",
            {
              appointmentId:
                String(
                  appointmentId
                ),
            }
          );
        } catch (error) {
          console.error(
            "❌ Appointment join error:",
            error
          );

          socket.emit(
            "appointment:communication-error",
            {
              message:
                "Unable to join appointment communication.",
            }
          );
        }
      }
    );

    // ========================================
    // APPOINTMENT LEAVE
    // ========================================

    socket.on(
      "appointment:leave",
      async (data) => {
        try {
          const appointmentId =
            typeof data === "string"
              ? data
              : data?.appointmentId;

          if (!appointmentId) {
            return;
          }

          const room =
            `appointment:${String(
              appointmentId
            )}`;

          await socket.leave(
            room
          );

          if (
            socket.data
              ?.appointmentId ===
            String(
              appointmentId
            )
          ) {
            socket.data.appointmentId =
              null;
          }

          console.log(
            `📅 Socket ${socket.id} left ${room}`
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
    // DOCTOR ↔ PATIENT
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
            createdAt,
          } = message || {};

          if (
            !appointmentId ||
            !senderId ||
            !text
          ) {
            return;
          }

          if (
            senderRole !==
              "doctor" &&
            senderRole !==
              "patient"
          ) {
            return;
          }

          const room =
            `appointment:${String(
              appointmentId
            )}`;

          if (
            !socket.rooms.has(
              room
            )
          ) {
            socket.emit(
              "appointment:communication-error",
              {
                message:
                  "You are not connected to this appointment.",
              }
            );

            return;
          }

          const timestamp =
            createdAt ||
            new Date().toISOString();

          const chatMessage = {
            messageId:
              messageId ||
              `${appointmentId}-${senderId}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

            appointmentId:
              String(
                appointmentId
              ),

            senderId:
              String(senderId),

            senderRole,

            text:
              String(text).trim(),

            createdAt:
              timestamp,

            timestamp,
          };

          /*
           * IMPORTANT:
           *
           * socket.to(room)
           *
           * sends the message ONLY to
           * the other participant.
           *
           * The sender does NOT receive
           * another copy.
           */

          socket
            .to(room)
            .emit(
              "appointment:chat-message",
              chatMessage
            );

          console.log(
            `💬 ${senderRole} → appointment ${appointmentId}`
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
    // AUDIO / VIDEO
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

          if (
            !appointmentId ||
            !offer
          ) {
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

          if (
            !socket.rooms.has(
              room
            )
          ) {
            console.log(
              "🚫 Call offer rejected:",
              room
            );

            return;
          }

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
            `📞 ${callType} call offer sent: ${room}`
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

          if (
            !appointmentId ||
            !answer
          ) {
            return;
          }

          const room =
            `appointment:${String(
              appointmentId
            )}`;

          if (
            !socket.rooms.has(
              room
            )
          ) {
            return;
          }

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
            `📞 Call answer sent: ${room}`
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

          if (
            !socket.rooms.has(
              room
            )
          ) {
            console.log(
              "🚫 ICE candidate rejected:",
              room
            );

            return;
          }

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

          if (
            !socket.rooms.has(
              room
            )
          ) {
            return;
          }

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
            `📴 Call ended: ${room}`
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
    // AMBULANCE REQUEST ROOM
    // ========================================

    socket.on(
      "join-ambulance-request",
      (requestId) => {
        if (!requestId) {
          return;
        }

        const room =
          `ambulance-request:${String(
            requestId
          )}`;

        socket.join(room);

        socket.data =
          socket.data || {};

        socket.data.ambulanceRequestId =
          String(requestId);

        console.log(
          `🚑 Socket ${socket.id} joined ${room}`
        );
      }
    );

    // ========================================
    // AMBULANCE REQUEST STATUS
    // ========================================

    socket.on(
      "ambulance:request-status",
      (data) => {
        try {
          const {
            requestId,
            status,
          } = data || {};

          if (
            !requestId ||
            !status
          ) {
            return;
          }

          const room =
            `ambulance-request:${String(
              requestId
            )}`;

          socket
            .to(room)
            .emit(
              "ambulance:request-status",
              {
                requestId:
                  String(
                    requestId
                  ),

                status,
              }
            );

          console.log(
            `🚑 Ambulance status ${status} → ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Ambulance status error:",
            error
          );
        }
      }
    );

    // ========================================
    // AMBULANCE REQUEST ACCEPTED
    // ========================================

    socket.on(
      "ambulance:request-accepted",
      (data) => {
        try {
          const {
            requestId,
            driverId,
          } = data || {};

          if (!requestId) {
            return;
          }

          const room =
            `ambulance-request:${String(
              requestId
            )}`;

          socket
            .to(room)
            .emit(
              "ambulance:request-accepted",
              {
                requestId:
                  String(
                    requestId
                  ),

                driverId:
                  driverId
                    ? String(
                        driverId
                      )
                    : null,
              }
            );

          console.log(
            `🚑 Ambulance request accepted → ${room}`
          );
        } catch (error) {
          console.error(
            "❌ Ambulance request accepted error:",
            error
          );
        }
      }
    );
    // ========================================
    // AMBULANCE CHAT MESSAGE
    // DRIVER ↔ PATIENT
    // ========================================

    socket.on(
      "ambulance:chat-message",
      (message) => {
        try {
          const {
            messageId,
            requestId,
            senderId,
            receiverId,
            senderRole,
            text,
            createdAt,
          } = message || {};

          // ------------------------------------
          // BASIC VALIDATION
          // ------------------------------------

          if (!requestId) {
            console.log(
              "❌ Ambulance chat: requestId missing"
            );

            return;
          }

          if (!senderId) {
            console.log(
              "❌ Ambulance chat: senderId missing"
            );

            return;
          }

          if (!receiverId) {
            console.log(
              "❌ Ambulance chat: receiverId missing"
            );

            return;
          }

          if (!text || !String(text).trim()) {
            return;
          }

          if (
            senderRole !== "patient" &&
            senderRole !== "driver"
          ) {
            console.log(
              "❌ Ambulance chat: invalid sender role:",
              senderRole
            );

            return;
          }

          // ------------------------------------
          // REQUEST ROOM
          // ------------------------------------

          const requestRoom =
            `ambulance-request:${String(
              requestId
            )}`;

          // ------------------------------------
          // CHECK THAT SENDER JOINED REQUEST
          // ------------------------------------

          if (
            !socket.rooms.has(
              requestRoom
            )
          ) {
            console.log(
              "🚫 Ambulance chat rejected - sender not in request room:",
              {
                socketId: socket.id,
                requestId:
                  String(requestId),
              }
            );

            socket.emit(
              "ambulance:chat-error",
              {
                requestId:
                  String(requestId),

                message:
                  "You are not connected to this ambulance request.",
              }
            );

            return;
          }

          // ------------------------------------
          // NORMALIZE IDs
          // ------------------------------------

          const normalizedSenderId =
            String(senderId);

          const normalizedReceiverId =
            String(receiverId);

          const normalizedRequestId =
            String(requestId);

          // ------------------------------------
          // GENERATE UNIQUE MESSAGE ID
          // ------------------------------------

          const finalMessageId =
            messageId ||
            `${normalizedRequestId}-${normalizedSenderId}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 10)}`;

          // ------------------------------------
          // TIMESTAMP
          // ------------------------------------

          const timestamp =
            createdAt ||
            new Date().toISOString();

          // ------------------------------------
          // FINAL MESSAGE
          // ------------------------------------

          const outgoingMessage = {
            messageId:
              String(finalMessageId),

            requestId:
              normalizedRequestId,

            senderId:
              normalizedSenderId,

            receiverId:
              normalizedReceiverId,

            senderRole,

            text:
              String(text).trim(),

            createdAt:
              timestamp,

            timestamp,
          };

          // ------------------------------------
          // FIND RECEIVER SOCKET
          // ------------------------------------

          let receiverSocket = null;

          if (
            senderRole === "patient"
          ) {
            /*
             * Patient → Driver
             */

            receiverSocket =
              getUserSocket(
                driverSockets,
                normalizedReceiverId
              );
          } else if (
            senderRole === "driver"
          ) {
            /*
             * Driver → Patient
             */

            receiverSocket =
              getUserSocket(
                patientSockets,
                normalizedReceiverId
              );
          }

          // ------------------------------------
          // RECEIVER NOT CONNECTED
          // ------------------------------------

          if (!receiverSocket) {
            console.log(
              "⚠️ Ambulance chat receiver is offline:",
              {
                senderRole,
                senderId:
                  normalizedSenderId,
                receiverId:
                  normalizedReceiverId,
                requestId:
                  normalizedRequestId,
              }
            );

            /*
             * Do NOT broadcast through the request room.
             *
             * This is important.
             *
             * If we send through:
             *
             * io.to(requestRoom)
             *
             * the sender can receive another copy
             * of their own message.
             *
             * It can also create duplicates when
             * the same user has multiple connections.
             */

            socket.emit(
              "ambulance:chat-delivery-status",
              {
                requestId:
                  normalizedRequestId,

                messageId:
                  String(
                    finalMessageId
                  ),

                delivered: false,

                reason:
                  "receiver-offline",
              }
            );

            return;
          }

          // ------------------------------------
          // DON'T SEND MESSAGE TO SAME SOCKET
          // ------------------------------------

          if (
            receiverSocket.id ===
            socket.id
          ) {
            console.log(
              "⚠️ Sender and receiver socket are identical."
            );

            return;
          }

          // ------------------------------------
          // SEND ONLY TO RECEIVER
          // ------------------------------------

          receiverSocket.emit(
            "ambulance:chat-message",
            outgoingMessage
          );

          // ------------------------------------
          // DELIVERY CONFIRMATION
          // ------------------------------------

          socket.emit(
            "ambulance:chat-delivery-status",
            {
              requestId:
                normalizedRequestId,

              messageId:
                String(
                  finalMessageId
                ),

              delivered: true,
            }
          );

          console.log(
            `💬 ${senderRole} → ${normalizedReceiverId} | request ${normalizedRequestId}`
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
                "Unable to send ambulance message.",
            }
          );
        }
      }
    );


    // ========================================
    // AMBULANCE CHAT TYPING
    // ========================================

    socket.on(
      "ambulance:typing",
      (data) => {
        try {
          const {
            requestId,
            receiverId,
            senderId,
            senderRole,
            isTyping,
          } = data || {};

          if (
            !requestId ||
            !receiverId ||
            !senderId
          ) {
            return;
          }

          if (
            senderRole !== "patient" &&
            senderRole !== "driver"
          ) {
            return;
          }

          const receiverSocket =
            senderRole === "patient"
              ? getUserSocket(
                  driverSockets,
                  receiverId
                )
              : getUserSocket(
                  patientSockets,
                  receiverId
                );

          if (!receiverSocket) {
            return;
          }

          receiverSocket.emit(
            "ambulance:typing",
            {
              requestId:
                String(requestId),

              senderId:
                String(senderId),

              senderRole,

              isTyping:
                Boolean(isTyping),
            }
          );
        } catch (error) {
          console.error(
            "❌ Ambulance typing error:",
            error
          );
        }
      }
    );


    // ========================================
    // AMBULANCE MESSAGE READ
    // ========================================

    socket.on(
      "ambulance:message-read",
      (data) => {
        try {
          const {
            requestId,
            messageId,
            senderId,
            receiverId,
            receiverRole,
          } = data || {};

          if (
            !requestId ||
            !messageId ||
            !senderId ||
            !receiverId
          ) {
            return;
          }

          let senderSocket = null;

          if (
            receiverRole === "patient"
          ) {
            senderSocket =
              getUserSocket(
                patientSockets,
                senderId
              );
          } else if (
            receiverRole === "driver"
          ) {
            senderSocket =
              getUserSocket(
                driverSockets,
                senderId
              );
          }

          if (!senderSocket) {
            return;
          }

          senderSocket.emit(
            "ambulance:message-read",
            {
              requestId:
                String(requestId),

              messageId:
                String(messageId),

              receiverId:
                String(receiverId),
            }
          );
        } catch (error) {
          console.error(
            "❌ Ambulance message-read error:",
            error
          );
        }
      }
    );


    // ========================================
    // DRIVER LOCATION UPDATE
    // ========================================

    socket.on(
      "ambulance:driver-location",
      (data) => {
        try {
          const {
            requestId,
            driverId,
            latitude,
            longitude,
          } = data || {};

          if (
            !requestId ||
            !driverId ||
            latitude === undefined ||
            longitude === undefined
          ) {
            return;
          }

          const room =
            `ambulance-request:${String(
              requestId
            )}`;

          /*
           * Send location to everyone else
           * in this ambulance request.
           *
           * Sender does not receive another copy.
           */

          socket
            .to(room)
            .emit(
              "ambulance:driver-location",
              {
                requestId:
                  String(
                    requestId
                  ),

                driverId:
                  String(driverId),

                latitude:
                  Number(latitude),

                longitude:
                  Number(longitude),
              }
            );
        } catch (error) {
          console.error(
            "❌ Driver location error:",
            error
          );
        }
      }
    );


    // ========================================
    // AMBULANCE STATUS UPDATE
    // ========================================

    socket.on(
      "ambulance:update-status",
      (data) => {
        try {
          const {
            requestId,
            status,
          } = data || {};

          if (
            !requestId ||
            !status
          ) {
            return;
          }

          const room =
            `ambulance-request:${String(
              requestId
            )}`;

          socket
            .to(room)
            .emit(
              "ambulance:request-status",
              {
                requestId:
                  String(
                    requestId
                  ),

                status,
              }
            );

          console.log(
            `🚑 Ambulance status updated: ${status}`
          );
        } catch (error) {
          console.error(
            "❌ Ambulance status update error:",
            error
          );
        }
      }
    );


    // ========================================
    // DRIVER ACCEPTS AMBULANCE REQUEST
    // ========================================

    socket.on(
      "ambulance:accept-request",
      (data) => {
        try {
          const {
            requestId,
            driverId,
          } = data || {};

          if (!requestId) {
            return;
          }

          const room =
            `ambulance-request:${String(
              requestId
            )}`;

          socket
            .to(room)
            .emit(
              "ambulance:request-accepted",
              {
                requestId:
                  String(
                    requestId
                  ),

                driverId:
                  driverId
                    ? String(
                        driverId
                      )
                    : null,
              }
            );

          console.log(
            `🚑 Request accepted: ${requestId}`
          );
        } catch (error) {
          console.error(
            "❌ Ambulance accept error:",
            error
          );
        }
      }
    );


    // ========================================
    // AMBULANCE CALL OFFER
    // ========================================

    socket.on(
      "ambulance:call-offer",
      (data) => {
        try {
          const {
            requestId,
            offer,
            callType,
            receiverId,
          } = data || {};

          if (
            !requestId ||
            !offer ||
            !receiverId
          ) {
            return;
          }

          if (
            callType !== "audio" &&
            callType !== "video"
          ) {
            return;
          }

          let receiverSocket =
            null;

          /*
           * Determine receiver based on
           * the sender's role.
           */

          if (
            socket.data?.userRole ===
            "patient"
          ) {
            receiverSocket =
              getUserSocket(
                driverSockets,
                receiverId
              );
          } else if (
            socket.data?.userRole ===
            "driver"
          ) {
            receiverSocket =
              getUserSocket(
                patientSockets,
                receiverId
              );
          }

          if (!receiverSocket) {
            console.log(
              "⚠️ Ambulance call receiver offline"
            );

            return;
          }

          if (
            receiverSocket.id ===
            socket.id
          ) {
            return;
          }

          receiverSocket.emit(
            "ambulance:call-offer",
            {
              requestId:
                String(requestId),

              callType,

              offer,
            }
          );

          console.log(
            `📞 Ambulance ${callType} offer sent`
          );
        } catch (error) {
          console.error(
            "❌ Ambulance call offer error:",
            error
          );
        }
      }
    );


    // ========================================
    // AMBULANCE CALL ANSWER
    // ========================================

    socket.on(
      "ambulance:call-answer",
      (data) => {
        try {
          const {
            requestId,
            answer,
            receiverId,
          } = data || {};

          if (
            !requestId ||
            !answer ||
            !receiverId
          ) {
            return;
          }

          let receiverSocket =
            null;

          if (
            socket.data?.userRole ===
            "patient"
          ) {
            receiverSocket =
              getUserSocket(
                driverSockets,
                receiverId
              );
          } else if (
            socket.data?.userRole ===
            "driver"
          ) {
            receiverSocket =
              getUserSocket(
                patientSockets,
                receiverId
              );
          }

          if (!receiverSocket) {
            return;
          }

          if (
            receiverSocket.id ===
            socket.id
          ) {
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
            `📞 Ambulance call answer sent`
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
    // AMBULANCE ICE CANDIDATE
    // ========================================

    socket.on(
      "ambulance:ice-candidate",
      (data) => {
        try {
          const {
            requestId,
            candidate,
            receiverId,
          } = data || {};

          if (
            !requestId ||
            !candidate ||
            !receiverId
          ) {
            return;
          }

          let receiverSocket =
            null;

          if (
            socket.data?.userRole ===
            "patient"
          ) {
            receiverSocket =
              getUserSocket(
                driverSockets,
                receiverId
              );
          } else if (
            socket.data?.userRole ===
            "driver"
          ) {
            receiverSocket =
              getUserSocket(
                patientSockets,
                receiverId
              );
          }

          if (!receiverSocket) {
            return;
          }

          if (
            receiverSocket.id ===
            socket.id
          ) {
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
            "❌ Ambulance ICE error:",
            error
          );
        }
      }
    );


    // ========================================
    // AMBULANCE CALL ENDED
    // ========================================

    socket.on(
      "ambulance:call-ended",
      (data) => {
        try {
          const {
            requestId,
            receiverId,
          } = data || {};

          if (
            !requestId ||
            !receiverId
          ) {
            return;
          }

          let receiverSocket =
            null;

          if (
            socket.data?.userRole ===
            "patient"
          ) {
            receiverSocket =
              getUserSocket(
                driverSockets,
                receiverId
              );
          } else if (
            socket.data?.userRole ===
            "driver"
          ) {
            receiverSocket =
              getUserSocket(
                patientSockets,
                receiverId
              );
          }

          if (!receiverSocket) {
            return;
          }

          if (
            receiverSocket.id ===
            socket.id
          ) {
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
    // SOCKET DISCONNECT
    // ========================================

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "🔌 Socket disconnected:",
          socket.id,
          "| reason:",
          reason
        );

        // ------------------------------------
        // REMOVE PATIENT SOCKET
        // ------------------------------------

        if (
          socket.data?.patientId
        ) {
          removeSocketFromMap(
            patientSockets,
            socket.data.patientId,
            socket
          );
        }

        // ------------------------------------
        // REMOVE DRIVER SOCKET
        // ------------------------------------

        if (
          socket.data?.driverId
        ) {
          removeSocketFromMap(
            driverSockets,
            socket.data.driverId,
            socket
          );
        }

        // ------------------------------------
        // CLEAN SOCKET DATA
        // ------------------------------------

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
      error.status || 500
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

const connectDatabase =
  async () => {
    try {
      const mongoUri =
        process.env.MONGO_URI;

      if (!mongoUri) {
        throw new Error(
          "MONGO_URI is not defined in .env"
        );
      }

      await mongoose.connect(
        mongoUri
      );

      console.log(
        "✅ MongoDB connected successfully"
      );
    } catch (error) {
      console.error(
        "❌ MongoDB connection failed:",
        error.message
      );

      process.exit(1);
    }
  };


// ==========================================
// MONGOOSE EVENTS
// ==========================================

mongoose.connection.on(
  "connected",
  () => {
    console.log(
      "🟢 Mongoose connection established"
    );
  }
);

mongoose.connection.on(
  "error",
  (error) => {
    console.error(
      "❌ Mongoose error:",
      error
    );
  }
);

mongoose.connection.on(
  "disconnected",
  () => {
    console.log(
      "🟡 MongoDB disconnected"
    );
  }
);


// ==========================================
// START SERVER
// ==========================================

const startServer =
  async () => {
    try {
      await connectDatabase();

      // ------------------------------------
      // EMAIL SERVICE
      // ------------------------------------

      try {
        await verifyEmailConnection();

        console.log(
          "📧 Email service connected"
        );
      } catch (emailError) {
        console.warn(
          "⚠️ Email service unavailable:",
          emailError.message
        );

        /*
         * Do not stop the entire server
         * if email service is unavailable.
         */
      }

      // ------------------------------------
      // START HTTP + SOCKET SERVER
      // ------------------------------------

      server.listen(
        PORT,
        () => {
          console.log("");
          console.log(
            "=========================================="
          );
          console.log(
            "🚀 HealthCompanion Server Started"
          );
          console.log(
            "=========================================="
          );
          console.log(
            `🌐 Server: http://localhost:${PORT}`
          );
          console.log(
            `🔌 Socket.IO: http://localhost:${PORT}`
          );
          console.log(
            `💚 Health: http://localhost:${PORT}/api/health`
          );
          console.log(
            "=========================================="
          );
          console.log("");
        }
      );
    } catch (error) {
      console.error(
        "❌ Server startup failed:",
        error
      );

      process.exit(1);
    }
  };


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
// GRACEFUL SHUTDOWN
// ==========================================

const gracefulShutdown =
  async (signal) => {
    console.log(
      `\n🛑 ${signal} received. Shutting down...`
    );

    try {
      // ------------------------------------
      // CLOSE SOCKET CONNECTIONS
      // ------------------------------------

      io.close(() => {
        console.log(
          "🔌 Socket.IO closed"
        );
      });

      // ------------------------------------
      // CLOSE HTTP SERVER
      // ------------------------------------

      server.close(
        async () => {
          console.log(
            "🌐 HTTP server closed"
          );

          // ------------------------------
          // CLOSE MONGODB
          // ------------------------------

          try {
            await mongoose.connection.close();

            console.log(
              "🗄️ MongoDB connection closed"
            );
          } catch (mongoError) {
            console.error(
              "❌ MongoDB shutdown error:",
              mongoError
            );
          }

          process.exit(0);
        }
      );
    } catch (error) {
      console.error(
        "❌ Graceful shutdown error:",
        error
      );

      process.exit(1);
    }
  };


// ==========================================
// PROCESS SIGNALS
// ==========================================

process.on(
  "SIGINT",
  () => {
    gracefulShutdown(
      "SIGINT"
    );
  }
);

process.on(
  "SIGTERM",
  () => {
    gracefulShutdown(
      "SIGTERM"
    );
  }
);


// ==========================================
// START
// ==========================================

startServer();