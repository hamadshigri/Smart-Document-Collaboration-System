import mongoose from "mongoose";
import Document from "../models/document.model.js";
import DocumentShare from "../models/documentShare.model.js";
import User from "../models/user.model.js";

export const getDocumentAbout = async (req, res) => {
    try {
        const { id: documentId } = req.params;
        const userId = req.user;

        if(!mongoose.isValidObjectId(documentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            })
        }

        const document = await Document.findById(documentId).select("title user createdAt updatedAt");

        if(!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            })
        }

        if(document.user.toString() === userId.toString()) {
            const owner = await User.findById(document.user).select("name");
            const shares = await DocumentShare.find({ document: documentId })
                .populate("invitedUser", "name")
                .sort({ createdAt: -1 });

            return res.json({
                success: true,
                about: {
                    role: "owner",
                    owner: owner ? { name: owner.name } : null,
                    sharedWith: shares.map((share) => ({
                        name: share.invitedUser?.name || share.inviteeEmail,
                        email: share.inviteeEmail,
                        role: share.role,
                        status: share.status,
                    })),
                    createdAt: document.createdAt,
                    updatedAt: document.updatedAt,
                }
            })
        }

        const user = await User.findById(userId).select("email");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        const share = await DocumentShare.findOne({
            document: documentId,
            status: "accepted",
            $or: [
                { invitedUser: userId },
                { inviteeEmail: user.email.toLowerCase() },
            ],
        }).populate("owner", "name email");

        if(!share) {
            return res.status(403).json({
                success: false,
                message: "You do not have access to this document"
            })
        }

        return res.json({
            success: true,
            about: {
                role: share.role,
                owner: share.owner ? {
                    name: share.owner.name,
                } : null,
                sharedWith: share.owner ? [{
                    name: share.owner.name,
                    email: share.owner.email,
                    role: "owner",
                    status: "owner",
                }] : [],
                createdAt: document.createdAt,
                updatedAt: document.updatedAt,
            }
        })
    } catch (error) {
        console.error("Get Document About Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load document sharing details"
        })
    }
}
