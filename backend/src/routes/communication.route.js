import express from "express";
import { auth, authAdmin } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js"; // reuse your existing multer config
import {
    getCommunication,
    sendMessage,
    updateShipping,
    markRead,
    getAllCommunications,
    getBidderCommunications,
    getSellerCommunications,
} from "../controllers/communication.controller.js";

const communicationRouter = express.Router();

// All routes require authentication
communicationRouter.use(auth);

communicationRouter.get("/admin/all", authAdmin, getAllCommunications);

// Bidder / Seller — MUST come before "/:auctionId"
communicationRouter.get("/bidder/all", getBidderCommunications);
communicationRouter.get("/seller/all", getSellerCommunications);

// Get communication for an auction
communicationRouter.get("/:auctionId", getCommunication);

// Send a message (with optional file attachments)
communicationRouter.post(
    "/:auctionId/message",
    upload.array("attachments", 5), // up to 5 files
    sendMessage
);

// Update shipping info
communicationRouter.put("/:auctionId/shipping", updateShipping);

// Mark messages as read
communicationRouter.post("/:auctionId/read", markRead);

export default communicationRouter;