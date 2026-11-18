import mongoose from "mongoose";
import * as Y from "yjs";
import Document from "../models/document.model.js";
import DocumentShare from "../models/documentShare.model.js";
import { socketAuthentication } from "../middlewares/socketAuth.middleware.js";

const documentSessions = new Map();
const MAX_UPDATE_SIZE = 1_000_000;
const SAVE_DEBOUNCE_MS = 800;

const decodeYjsUpdate = (encoded) => {
  if (typeof encoded !== "string" || encoded.length > Math.ceil(MAX_UPDATE_SIZE * 4 / 3) + 8) {
    return null;
  }

  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length === 0 || bytes.length > MAX_UPDATE_SIZE || bytes.toString("base64") !== encoded) {
    return null;
  }

  return new Uint8Array(bytes);
};

const encodeYjsUpdate = (update) => Buffer.from(update).toString("base64");

const flushSession = async (documentId, session) => {
  if (session.saveTimer) {
    clearTimeout(session.saveTimer);
    session.saveTimer = null;
  }

  if (session.pendingContent === null) return;

  const content = session.pendingContent;
  session.pendingContent = null;

  try {
    await Document.updateOne({ _id: documentId }, { $set: { content } });
  } catch (error) {
    // Keep the latest content for a later retry if a transient DB error occurs.
    session.pendingContent = content;
    console.error("Collaborative document save failed:", error.message);
  }
};

const queueSessionSave = (documentId, session, content) => {
  if (typeof content !== "string") return;

  session.pendingContent = content;
  if (session.saveTimer) clearTimeout(session.saveTimer);

  session.saveTimer = setTimeout(() => {
    session.saveTimer = null;
    void flushSession(documentId, session);
  }, SAVE_DEBOUNCE_MS);
};

const canEdit = async (documentId, socket) => {
  const document = await Document.findById(documentId).select("user");
  if (!document) return false;

  if (document.user.toString() === socket.userId.toString()) return true;

  const share = await DocumentShare.findOne({
    document: documentId,
    invitedUser: socket.userId,
    status: "accepted",
  }).select("role");

  return share?.role === "editor";
};

const removeSocketFromSessions = async (socket) => {
  for (const [documentId, session] of documentSessions) {
    if (!session.sockets.delete(socket.id)) continue;

    if (session.seedSocketId === socket.id && !session.seeded) {
      session.seedSocketId = null;
    }

    if (session.sockets.size === 0) {
      await flushSession(documentId, session);
      session.ydoc.destroy();
      documentSessions.delete(documentId);
    }
  }
};

const initializeSocket = (io) => {
  io.use(socketAuthentication);

  io.on("connection", (socket) => {
    console.log("Authenticated user connected:", socket.userId);

    socket.on("join-document", async (documentId, callback) => {
      const respond = typeof callback === "function" ? callback : () => {};

      try {
        if (!mongoose.isValidObjectId(documentId)) {
          return respond({ success: false, message: "Invalid document ID" });
        }

        const document = await Document.findById(documentId).select("user content");
        if (!document) {
          return respond({ success: false, message: "Document not found" });
        }

        let role = "owner";
        if (document.user.toString() !== socket.userId.toString()) {
          const share = await DocumentShare.findOne({
            document: documentId,
            invitedUser: socket.userId,
            status: "accepted",
          }).select("role");

          if (!share) {
            return respond({
              success: false,
              message: "You do not have access to this document",
            });
          }
          role = share.role;
        }

        const room = `document:${documentId}`;
        let session = documentSessions.get(documentId);

        if (!session) {
          session = {
            ydoc: new Y.Doc(),
            sockets: new Set(),
            saveTimer: null,
            pendingContent: null,
            seeded: false,
            seedSocketId: role === "viewer" ? null : socket.id,
            initialContent: document.content || "",
          };
          documentSessions.set(documentId, session);
        } else if (!session.seeded && !session.seedSocketId && role !== "viewer") {
          session.seedSocketId = socket.id;
        }

        session.sockets.add(socket.id);
        await socket.join(room);

        socket.data.documentRoles ??= {};
        socket.data.documentRoles[documentId] = role;

        respond({
          success: true,
          message: "Joined document successfully",
          documentId,
          role,
          seeded: session.seeded,
          shouldSeed: !session.seeded && session.seedSocketId === socket.id,
          initialContent: session.initialContent,
          state: encodeYjsUpdate(Y.encodeStateAsUpdate(session.ydoc)),
        });
      } catch (error) {
        console.error("Join Document Error:", error);
        respond({ success: false, message: "Failed to join document" });
      }
    });

    socket.on("seed-document", async (data, callback) => {
      const respond = typeof callback === "function" ? callback : () => {};

      try {
        const { documentId, update, content } = data || {};
        const session = documentSessions.get(documentId);
        const updateBytes = decodeYjsUpdate(update);

        if (
          !session ||
          !socket.rooms.has(`document:${documentId}`) ||
          session.seedSocketId !== socket.id ||
          session.seeded ||
          !updateBytes ||
          typeof content !== "string" ||
          content.length > MAX_UPDATE_SIZE
        ) {
          return respond({ success: false, message: "Invalid document initialization" });
        }

        if (!(await canEdit(documentId, socket))) {
          return respond({ success: false, message: "You do not have permission to edit" });
        }

        Y.applyUpdate(session.ydoc, updateBytes, socket.id);
        session.seeded = true;
        session.initialContent = null;
        queueSessionSave(documentId, session, content);

        io.to(`document:${documentId}`).emit("document-sync", {
          documentId,
          state: encodeYjsUpdate(Y.encodeStateAsUpdate(session.ydoc)),
        });

        respond({ success: true });
      } catch (error) {
        console.error("Seed Document Error:", error);
        respond({ success: false, message: "Failed to initialize document" });
      }
    });

    socket.on("yjs-update", async (data, callback) => {
      const respond = typeof callback === "function" ? callback : () => {};

      try {
        const { documentId, update, content } = data || {};
        const session = documentSessions.get(documentId);
        const updateBytes = decodeYjsUpdate(update);

        if (!mongoose.isValidObjectId(documentId)) {
          return respond({ success: false, message: "Invalid document ID" });
        }

        if (
          !session ||
          !session.seeded ||
          !socket.rooms.has(`document:${documentId}`) ||
          !updateBytes ||
          typeof content !== "string" ||
          content.length > MAX_UPDATE_SIZE
        ) {
          return respond({ success: false, message: "Invalid document update" });
        }

        if (!(await canEdit(documentId, socket))) {
          return respond({ success: false, message: "You do not have permission to edit" });
        }

        Y.applyUpdate(session.ydoc, updateBytes, socket.id);
        queueSessionSave(documentId, session, content);

        socket.to(`document:${documentId}`).emit("yjs-update", {
          documentId,
          update,
        });

        respond({ success: true });
      } catch (error) {
        console.error("Yjs Update Error:", error);
        respond({ success: false, message: "Failed to apply document update" });
      }
    });

    socket.on("document-content", async (data) => {
      try {
        const { documentId, content } = data || {};
        const session = documentSessions.get(documentId);

        if (
          !session ||
          !session.seeded ||
          !socket.rooms.has(`document:${documentId}`) ||
          typeof content !== "string" ||
          content.length > MAX_UPDATE_SIZE
        ) {
          return;
        }

        if (!(await canEdit(documentId, socket))) return;
        queueSessionSave(documentId, session, content);
      } catch (error) {
        console.error("Collaborative content save failed:", error.message);
      }
    });

    socket.on("disconnect", async () => {
      await removeSocketFromSessions(socket);
      console.log("User disconnected:", socket.userId);
    });
  });
};

export default initializeSocket;
