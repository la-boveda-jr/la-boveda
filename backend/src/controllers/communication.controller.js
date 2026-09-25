import Communication from "../models/communication.model.js";
import Auction from "../models/auction.model.js";
import User from "../models/user.model.js";
import { uploadDocumentToCloudinary } from "../utils/cloudinary.js";
import { newMessageNotificationEmail, shippingUpdatedEmail } from "../utils/nodemailer.js";
import mongoose from "mongoose";

// ----- Helper -----
const getOrCreateCommunication = async (auctionId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
        throw new Error("Invalid auction ID");
    }

    const auction = await Auction.findById(auctionId)
        .populate("seller", "_id")
        .populate("winner", "_id");
    if (!auction) throw new Error("Auction not found");

    // Only allow for sold auctions
    if (auction.status !== "sold" && auction.status !== "sold_buy_now") {
        throw new Error("Communication is only available for sold auctions");
    }

    // Authorization
    const isSeller = auction.seller._id.toString() === userId.toString();
    const isBidder = auction.winner && auction.winner._id.toString() === userId.toString();
    const user = await User.findById(userId);
    const isAdmin = user?.userType === "admin";
    if (!isSeller && !isBidder && !isAdmin) {
        throw new Error("You do not have access to this communication");
    }

    if (!auction.winner) {
        throw new Error("Auction has no winner yet");
    }

    let comm = await Communication.findOne({ auction: auctionId });
    if (!comm) {
        comm = new Communication({
            auction: auctionId,
            seller: auction.seller._id,
            winningBidder: auction.winner._id,
            messages: [],
            shippingInfo: {},
            lastMessageAt: new Date(),
        });
        await comm.save();
    }
    return comm;
};

// ----- GET communication -----
export const getCommunication = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const userId = req.user._id;

        // Validate auctionId format
        if (!mongoose.Types.ObjectId.isValid(auctionId)) {
            return res.status(400).json({ success: false, message: "Invalid auction ID format" });
        }

        // Get or create communication
        const comm = await getOrCreateCommunication(auctionId, userId);

        // Populate all needed fields
        await comm.populate("messages.sender", "username firstName lastName userType");
        await comm.populate("shippingInfo.updatedBy", "username firstName lastName");
        await comm.populate("seller", "username firstName lastName email");
        await comm.populate("winningBidder", "username firstName lastName email");
        await comm.populate("auction", "title category finalPrice status");

        // Determine user role
        const user = await User.findById(userId);
        const isAdmin = user?.userType === "admin";
        const isSeller = comm.seller._id.toString() === userId.toString();
        const isBidder = comm.winningBidder._id.toString() === userId.toString();

        let filteredMessages = comm.messages;

        if (isAdmin) {
            // Admin sees all messages
            filteredMessages = comm.messages;
        } else if (isSeller) {
            // Seller sees: own messages + admin messages where recipient is seller or null (public)
            filteredMessages = comm.messages.filter(msg => {
                const senderId = msg.sender._id.toString();
                const isOwn = senderId === userId.toString();
                const isAdminMsg = msg.senderRole === "admin";
                const recipient = msg.recipient ? msg.recipient.toString() : null;
                return isOwn || (isAdminMsg && (recipient === null || recipient === userId.toString()));
            });
        } else if (isBidder) {
            // Bidder sees: own messages + admin messages where recipient is bidder or null
            filteredMessages = comm.messages.filter(msg => {
                const senderId = msg.sender._id.toString();
                const isOwn = senderId === userId.toString();
                const isAdminMsg = msg.senderRole === "admin";
                const recipient = msg.recipient ? msg.recipient.toString() : null;
                return isOwn || (isAdminMsg && (recipient === null || recipient === userId.toString()));
            });
        } else {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // Replace messages with filtered array
        comm.messages = filteredMessages;

        res.status(200).json({
            success: true,
            data: comm,
        });
    } catch (error) {
        console.error("Get communication error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ----- POST send message (with file attachments) -----
export const sendMessage = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const { content, recipientId } = req.body; // recipientId only for admin
        const userId = req.user._id;

        // Get auction and validate
        const auction = await Auction.findById(auctionId)
            .populate("seller", "_id")
            .populate("winner", "_id");
        if (!auction) return res.status(404).json({ success: false, message: "Auction not found" });
        if (!auction.winner) return res.status(400).json({ success: false, message: "Auction has no winner" });
        if (auction.status !== "sold" && auction.status !== "sold_buy_now") {
            return res.status(400).json({ success: false, message: "Communication only for sold auctions" });
        }

        const user = await User.findById(userId);
        const isAdmin = user?.userType === "admin";
        const isSeller = auction.seller._id.toString() === userId.toString();
        const isBidder = auction.winner._id.toString() === userId.toString();

        let role = "bidder";
        let recipient = null;

        if (isAdmin) {
            role = "admin";
            // Admin must specify a recipient (seller or winner)
            if (!recipientId) {
                return res.status(400).json({ success: false, message: "Recipient ID required for admin" });
            }
            const recipientUser = await User.findById(recipientId);
            if (!recipientUser) {
                return res.status(400).json({ success: false, message: "Recipient not found" });
            }
            const isRecipientSeller = recipientUser._id.toString() === auction.seller._id.toString();
            const isRecipientBidder = recipientUser._id.toString() === auction.winner._id.toString();
            if (!isRecipientSeller && !isRecipientBidder) {
                return res.status(400).json({ success: false, message: "Recipient must be seller or winning bidder" });
            }
            recipient = recipientUser._id;
        } else if (isSeller) {
            role = "seller";
            // Send to admin
            const admin = await getAdminUser();
            recipient = admin._id;
        } else if (isBidder) {
            role = "bidder";
            const admin = await getAdminUser();
            recipient = admin._id;
        } else {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // Get or create communication
        let comm = await Communication.findOne({ auction: auctionId });
        if (!comm) {
            comm = new Communication({
                auction: auctionId,
                seller: auction.seller._id,
                winningBidder: auction.winner._id,
                messages: [],
                shippingInfo: {},
                lastMessageAt: new Date(),
            });
        }

        // Upload attachments
        const attachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const result = await uploadDocumentToCloudinary(
                        file.buffer,
                        file.originalname,
                        "communication-attachments"
                    );
                    attachments.push({
                        url: result.secure_url,
                        publicId: result.public_id,
                        filename: result.originalname || file.originalname,
                        originalName: file.originalname,
                        uploadedAt: new Date(),
                    });
                } catch (uploadError) {
                    console.error("Attachment upload error:", uploadError);
                    return res.status(400).json({
                        success: false,
                        message: `Failed to upload attachment: ${file.originalname}`,
                    });
                }
            }
        }

        // Build message with recipient
        const message = {
            sender: userId,
            senderRole: role,
            recipient: recipient, // may be null for public (but we don't use)
            content: content || "",
            attachments,
            readBy: [userId],
        };

        comm.messages.push(message);
        comm.lastMessageAt = new Date();
        await comm.save();

        // Populate for response
        await comm.populate("messages.sender", "username firstName lastName userType");
        await comm.populate("seller", "username firstName lastName");
        await comm.populate("winningBidder", "username firstName lastName");
        await comm.populate("auction", "title category finalPrice status");

        // --- Send email notification (background) ---
        // Determine the recipient for email
        let emailRecipient = null;
        if (isAdmin) {
            // Admin sent to either seller or buyer
            emailRecipient = await User.findById(recipient);
        } else {
            // Seller or buyer sent to admin
            emailRecipient = await User.findById(recipient); // recipient is admin
        }

        if (emailRecipient && emailRecipient.email) {
            // Send in background
            newMessageNotificationEmail(
                emailRecipient,
                user, // sender
                auction,
                content || 'No text content (attachment(s) sent)',
                comm._id
            ).catch(err => console.error("Background email error:", err));
        }

        res.status(201).json({
            success: true,
            message: "Message sent",
            data: comm,
        });
    } catch (error) {
        console.error("Send message error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ----- PUT update shipping info (seller or admin only) -----
export const updateShipping = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const { company, trackingNumber, estimatedDelivery, notes } = req.body;
        const userId = req.user._id;

        // Fetch auction with full details
        const auction = await Auction.findById(auctionId)
            .populate("seller", "_id")
            .populate("winner", "_id");
        if (!auction) return res.status(404).json({ success: false, message: "Auction not found" });

        // Authorization: seller or admin
        const isSeller = auction.seller._id.toString() === userId.toString();
        const user = await User.findById(userId);
        const isAdmin = user?.userType === "admin";
        if (!isSeller && !isAdmin) {
            return res.status(403).json({ success: false, message: "Only seller or admin can update shipping" });
        }

        // Get or create communication
        let comm = await Communication.findOne({ auction: auctionId });
        if (!comm) {
            comm = new Communication({
                auction: auctionId,
                seller: auction.seller._id,
                winningBidder: auction.winner._id,
                messages: [],
                shippingInfo: {},
                lastMessageAt: new Date(),
            });
        }

        // Prepare shipping info
        const shippingInfo = {
            company: company || comm.shippingInfo.company,
            trackingNumber: trackingNumber || comm.shippingInfo.trackingNumber,
            estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : comm.shippingInfo.estimatedDelivery,
            notes: notes || comm.shippingInfo.notes,
            updatedBy: userId,
            updatedAt: new Date(),
        };

        comm.shippingInfo = shippingInfo;

        // Add a system message about shipping update
        const systemMessage = {
            sender: userId,
            senderRole: isAdmin ? "admin" : "seller",
            content: `Shipping information updated${isAdmin ? " by admin" : ""}.`,
            attachments: [],
            readBy: [userId],
        };
        if (isAdmin) {
            // Admin update → winner should see it
            systemMessage.recipient = auction.winner._id;
        } else {
            // Seller update → admin should see it
            const admin = await getAdminUser();
            systemMessage.recipient = admin._id;
        }
        comm.messages.push(systemMessage);
        comm.lastMessageAt = new Date();

        await comm.save();

        // Populate for response
        await comm.populate("messages.sender", "username firstName lastName userType");
        await comm.populate("seller", "username firstName lastName");
        await comm.populate("winningBidder", "username firstName lastName");
        await comm.populate("auction", "title category finalPrice status");

        // --- Send email notification to the winning bidder (always) ---
        const winningBidder = await User.findById(auction.winner._id).select("email firstName lastName username");
        if (winningBidder && winningBidder.email) {
            // Determine who updated (for the email subject/body)
            const updaterRole = isAdmin ? "Admin" : "Seller";
            shippingUpdatedEmail(
                winningBidder,          // recipient
                auction,
                shippingInfo,
                user,                   // updater
                updaterRole
            ).catch(err => console.error("Background email error:", err));
        }

        // Optionally, if seller updates, also notify the admin (optional)
        // You can uncomment the following block if you want admin to receive a copy:
        /*
        if (!isAdmin) {
            const admin = await getAdminUser();
            if (admin && admin.email) {
                shippingUpdatedEmail(
                    admin,
                    auction,
                    shippingInfo,
                    user,
                    "Seller (copy to admin)"
                ).catch(err => console.error("Background email to admin error:", err));
            }
        }
        */

        res.status(200).json({
            success: true,
            message: "Shipping info updated",
            data: comm,
        });
    } catch (error) {
        console.error("Update shipping error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ----- POST mark all messages as read -----
export const markRead = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const userId = req.user._id;

        const comm = await Communication.findOne({ auction: auctionId });
        if (!comm) return res.status(404).json({ success: false, message: "Communication not found" });

        let updated = false;
        comm.messages.forEach((msg) => {
            if (!msg.readBy.some(id => id.toString() === userId.toString())) {
                msg.readBy.push(userId);
                updated = true;
            }
        });
        if (updated) await comm.save();

        res.status(200).json({ success: true, message: "Marked as read" });
    } catch (error) {
        console.error("Mark read error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET all communications (admin only)
export const getAllCommunications = async (req, res) => {
    try {
        // Only admin can access
        const user = await User.findById(req.user._id);
        if (user.userType !== "admin") {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        const communications = await Communication.find()
            .populate("auction", "title category finalPrice status")
            .populate("seller", "username firstName lastName email")
            .populate("winningBidder", "username firstName lastName email")
            .sort({ lastMessageAt: -1 });

        res.status(200).json({
            success: true,
            data: communications,
        });
    } catch (error) {
        console.error("Get all communications error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getAdminUser = async () => {
    const admin = await User.findOne({ userType: "admin" });
    if (!admin) throw new Error("No admin user found");
    return admin;
};

// GET communications for the logged-in bidder
export const getBidderCommunications = async (req, res) => {
    try {
        const userId = req.user._id;

        const communications = await Communication.find({ winningBidder: userId })
            .populate("auction", "title categories finalPrice status auctionType photos")
            .populate("seller", "username firstName lastName email")
            .populate("winningBidder", "username firstName lastName email")
            .sort({ lastMessageAt: -1 });

        res.status(200).json({
            success: true,
            data: communications,
        });
    } catch (error) {
        console.error("Get bidder communications error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET communications for the logged-in seller
export const getSellerCommunications = async (req, res) => {
    try {
        const userId = req.user._id;

        const communications = await Communication.find({ seller: userId })
            .populate("auction", "title categories finalPrice status auctionType photos")
            .populate("seller", "username firstName lastName email")
            .populate("winningBidder", "username firstName lastName email")
            .sort({ lastMessageAt: -1 });

        res.status(200).json({
            success: true,
            data: communications,
        });
    } catch (error) {
        console.error("Get seller communications error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};