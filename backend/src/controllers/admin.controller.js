import User from "../models/user.model.js";
import Auction from "../models/auction.model.js";
import Comment from "../models/comment.model.js";
import Watchlist from "../models/watchlist.model.js";
import agendaService from "../services/agendaService.js";
import axios from "axios";

import {
  deleteFromCloudinary,
  uploadDocumentToCloudinary,
  uploadImageToCloudinary,
} from "../utils/cloudinary.js";

import {
  accountApprovedEmail,
  auctionApprovedEmail,
  auctionListedEmail,
  identityRejectedEmail,
  paymentCompletedEmail,
  paymentCompletedSellerEmail,
  sendBulkAuctionNotifications,
} from "../utils/nodemailer.js";
import Payment from "../models/payment.model.js";

export const getAdminStats = async (req, res) => {
  try {
    // ---- Shared user metrics ----
    const totalUsers = await User.countDocuments({ isActive: true });
    const userTypeStats = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$userType", count: { $sum: 1 } } },
    ]);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: oneWeekAgo },
    });

    const pendingUserVerifications = await User.countDocuments({
      isVerified: false,
      isActive: true,
    });

    // ---- Date boundaries ----
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // ---- Scope filters ----
    const auctionOnlyMatch = { auctionType: { $ne: "buy_now" } };
    const productMatch = { auctionType: "buy_now" };

    // ---- Total counts ----
    const totalAuctions = await Auction.countDocuments(auctionOnlyMatch);
    const totalProducts = await Auction.countDocuments(productMatch);

    // ---- Status breakdowns ----
    const auctionStatusStats = await Auction.aggregate([
      { $match: auctionOnlyMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const productStatusStats = await Auction.aggregate([
      { $match: productMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // ---- Active ----
    const activeAuctions = await Auction.countDocuments({
      ...auctionOnlyMatch,
      status: "active",
      endDate: { $gt: new Date() },
    });
    const activeProducts = await Auction.countDocuments({
      ...productMatch,
      status: "active",
    });

    // ---- Revenue split ----
    const auctionRevenueStats = await Auction.aggregate([
      { $match: { status: "sold", ...auctionOnlyMatch } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$finalPrice" },
          highestSale: { $max: "$finalPrice" },
          averageSale: { $avg: "$finalPrice" },
          totalSold: { $sum: 1 },
        },
      },
    ]);

    const productRevenueStats = await Auction.aggregate([
      { $match: { status: "sold", ...productMatch } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$finalPrice" },
          highestSale: { $max: "$finalPrice" },
          averageSale: { $avg: "$finalPrice" },
          totalSold: { $sum: 1 },
        },
      },
    ]);

    const totalAuctionRevenue = auctionRevenueStats[0]?.totalRevenue || 0;
    const totalProductRevenue = productRevenueStats[0]?.totalRevenue || 0;
    const highestAuctionSaleAmount = auctionRevenueStats[0]?.highestSale || 0;
    const highestProductSaleAmount = productRevenueStats[0]?.highestSale || 0;
    const averageAuctionSalePrice = auctionRevenueStats[0]?.averageSale || 0;
    const averageProductSalePrice = productRevenueStats[0]?.averageSale || 0;
    const totalSoldAuctions = auctionRevenueStats[0]?.totalSold || 0;
    const totalSoldProducts = productRevenueStats[0]?.totalSold || 0;

    // ---- Highest sale details ----
    const highestSaleAuction = await Auction.findOne({
      status: "sold",
      ...auctionOnlyMatch,
    })
      .sort({ finalPrice: -1 })
      .populate("seller", "username firstName lastName")
      .populate("winner", "username firstName lastName")
      .select("title finalPrice seller winner createdAt");

    const highestSaleProduct = await Auction.findOne({
      status: "sold",
      ...productMatch,
    })
      .sort({ finalPrice: -1 })
      .populate("seller", "username firstName lastName")
      .populate("winner", "username firstName lastName")
      .select("title finalPrice seller winner createdAt");

    // ---- Success rates ----
    const completedAuctions = await Auction.countDocuments({
      status: { $in: ["sold", "ended", "reserve_not_met"] },
      ...auctionOnlyMatch,
    });
    const soldAuctionsCount = await Auction.countDocuments({
      status: "sold",
      ...auctionOnlyMatch,
    });
    const auctionSuccessRate =
      completedAuctions > 0
        ? Math.round((soldAuctionsCount / completedAuctions) * 100)
        : 0;

    const completedProducts = await Auction.countDocuments({
      status: { $in: ["sold", "cancelled"] },
      ...productMatch,
    });
    const soldProductsCount = await Auction.countDocuments({
      status: "sold",
      ...productMatch,
    });
    const productSuccessRate =
      completedProducts > 0
        ? Math.round((soldProductsCount / completedProducts) * 100)
        : 0;

    // ---- Pending moderation ----
    const pendingAuctionModeration = await Auction.countDocuments({
      ...auctionOnlyMatch,
      status: "draft",
    });
    const pendingProductModeration = await Auction.countDocuments({
      ...productMatch,
      status: "draft",
    });

    // ---- Today's revenue split ----
    const todayAuctionRevenue =
      (
        await Auction.aggregate([
          {
            $match: {
              status: "sold",
              ...auctionOnlyMatch,
              updatedAt: { $gte: today, $lt: tomorrow },
            },
          },
          { $group: { _id: null, total: { $sum: "$finalPrice" } } },
        ])
      )[0]?.total || 0;

    const todayProductRevenue =
      (
        await Auction.aggregate([
          {
            $match: {
              status: "sold",
              ...productMatch,
              updatedAt: { $gte: today, $lt: tomorrow },
            },
          },
          { $group: { _id: null, total: { $sum: "$finalPrice" } } },
        ])
      )[0]?.total || 0;

    // ---- Shared engagement metrics ----
    const totalComments = await Comment.countDocuments();

    const watchlistItems = await Watchlist.aggregate([
      {
        $lookup: {
          from: "auctions",
          localField: "auction",
          foreignField: "_id",
          as: "auction",
        },
      },
      { $unwind: "$auction" },
      { $match: { "auction.status": "active" } },
      { $count: "count" },
    ]);
    const totalWatchlists = watchlistItems[0]?.count || 0;

    const recentBids = await Auction.aggregate([
      { $unwind: "$bids" },
      { $match: { "bids.timestamp": { $gte: yesterday } } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);
    const recentBidsCount = recentBids[0]?.count || 0;

    const highestBidStats = await Auction.aggregate([
      { $unwind: "$bids" },
      {
        $group: {
          _id: null,
          highestBidAmount: { $max: "$bids.amount" },
          averageBidAmount: { $avg: "$bids.amount" },
          totalBids: { $sum: 1 },
        },
      },
    ]);

    const categoryStats = await Auction.aggregate([
      { $match: { status: "sold" } },
      {
        $group: {
          _id: "$category",
          totalRevenue: { $sum: "$finalPrice" },
          auctionCount: { $sum: 1 },
          avgPrice: { $avg: "$finalPrice" },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    const totalBids = await Auction.aggregate([
      { $group: { _id: null, totalBids: { $sum: "$bidCount" } } },
    ]);
    const totalBidsCount = totalBids[0]?.totalBids || 0;

    const totalOffers = await Auction.aggregate([
      { $unwind: "$offers" },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);
    const totalOffersCount = totalOffers[0]?.count || 0;

    const offersByStatus = await Auction.aggregate([
      { $unwind: "$offers" },
      { $group: { _id: "$offers.status", count: { $sum: 1 } } },
    ]);

    const recentOffers = await Auction.aggregate([
      { $unwind: "$offers" },
      { $match: { "offers.createdAt": { $gte: yesterday } } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);
    const recentOffersCount = recentOffers[0]?.count || 0;

    const offerValueStats = await Auction.aggregate([
      { $unwind: "$offers" },
      {
        $match: {
          "offers.status": {
            $in: ["pending", "accepted", "rejected", "expired", "withdrawn"],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalOfferValue: { $sum: "$offers.amount" },
          avgOfferAmount: { $avg: "$offers.amount" },
          highestOffer: { $max: "$offers.amount" },
        },
      },
    ]);
    const totalOfferValue = offerValueStats[0]?.totalOfferValue || 0;
    const avgOfferAmount = offerValueStats[0]?.avgOfferAmount || 0;
    const highestOfferAmount = offerValueStats[0]?.highestOffer || 0;

    // ---- Auctions ending today (products excluded) ----
    const auctionsEndingToday = await Auction.countDocuments({
      status: "active",
      ...auctionOnlyMatch,
      endDate: { $gte: today, $lt: tomorrow },
    });

    // ---- Assemble stats ----
    const stats = {
      // Users
      totalUsers,
      userTypeStats: userTypeStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      recentUsers,
      newUsersThisWeek: recentUsers,
      pendingUserVerifications,

      // Auctions (buy_now excluded)
      totalAuctions,
      activeAuctions,
      totalSoldAuctions,
      auctionStatusStats: auctionStatusStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      totalAuctionRevenue,
      todayAuctionRevenue,
      highestAuctionSaleAmount,
      averageAuctionSalePrice,
      highestSaleAuction: highestSaleAuction
        ? {
          title: highestSaleAuction.title,
          amount: highestSaleAuction.finalPrice,
          seller: highestSaleAuction.seller?.username || "Unknown",
          winner: highestSaleAuction.winner?.username || "Unknown",
          date: highestSaleAuction.createdAt,
        }
        : null,
      auctionSuccessRate,
      pendingAuctionModeration,
      auctionsEndingToday,

      // Products (buy_now only)
      totalProducts,
      activeProducts,
      totalSoldProducts,
      productStatusStats: productStatusStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      totalProductRevenue,
      todayProductRevenue,
      highestProductSaleAmount,
      averageProductSalePrice,
      highestSaleProduct: highestSaleProduct
        ? {
          title: highestSaleProduct.title,
          amount: highestSaleProduct.finalPrice,
          seller: highestSaleProduct.seller?.username || "Unknown",
          winner: highestSaleProduct.winner?.username || "Unknown",
          date: highestSaleProduct.createdAt,
        }
        : null,
      productSuccessRate,
      pendingProductModeration,

      // Backward-compat aliases (auction-focused)
      totalRevenue: totalAuctionRevenue,
      todayRevenue: todayAuctionRevenue,
      highestSaleAmount: highestAuctionSaleAmount,
      averageSalePrice: averageAuctionSalePrice,
      successRate: auctionSuccessRate,
      pendingModeration: pendingAuctionModeration,

      // Engagement (combined)
      totalComments,
      totalWatchlists,
      totalBids: totalBidsCount,
      recentBids: recentBidsCount,
      highestBidAmount: highestBidStats[0]?.highestBidAmount || 0,
      averageBidAmount: highestBidStats[0]?.averageBidAmount || 0,
      totalOffers: totalOffersCount,
      recentOffers: recentOffersCount,
      offersByStatus: offersByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      pendingOffers: offersByStatus.pending || 0,
      totalOfferValue,
      averageOfferAmount: avgOfferAmount,
      highestOfferAmount,

      categoryStats,
      avgResponseTime: 2.3,
      systemHealth: 99.8,
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching admin statistics",
    });
  }
};

// Get all users for admin
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", filter = "all" } = req.query;

    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = {
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ],
    };

    // Add filter if not 'all'
    if (filter !== "all") {
      searchQuery.userType = filter;
    }

    // Get users with pagination
    const users = await User.find(searchQuery)
      .select(
        "-password -refreshToken -resetPasswordToken -emailVerificationToken",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: "$userType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert stats to object
    const stats = {
      total: totalUsers,
      admins: userStats.find((stat) => stat._id === "admin")?.count || 0,
      sellers: userStats.find((stat) => stat._id === "seller")?.count || 0,
      bidders: userStats.find((stat) => stat._id === "bidder")?.count || 0,
    };

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: page * limit < totalUsers,
          hasPrev: page > 1,
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching users",
    });
  }
};

// Get user details with statistics
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      "-password -refreshToken -resetPasswordToken -emailVerificationToken",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let userStats = {};

    if (user.userType === "seller") {
      // Seller statistics
      const auctionStats = await Auction.aggregate([
        { $match: { seller: user._id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$finalPrice" },
          },
        },
      ]);

      const activeAuctions =
        auctionStats.find((stat) => stat._id === "active")?.count || 0;
      const soldAuctions =
        auctionStats.find((stat) => stat._id === "sold")?.count || 0;
      const totalRevenue =
        auctionStats.find((stat) => stat._id === "sold")?.totalRevenue || 0;

      // Calculate rating (you might want to implement a proper rating system)
      const rating = 4.5 + Math.random() * 0.5; // Mock rating for now

      userStats = {
        totalSales: totalRevenue,
        activeListings: activeAuctions,
        totalAuctions: await Auction.countDocuments({ seller: user._id }),
        soldAuctions,
        rating: Math.round(rating * 10) / 10,
      };
    } else if (user.userType === "bidder") {
      // Bidder statistics
      const totalOffers = await Auction.aggregate([
        { $match: { "offers.buyer": user._id } },
        { $unwind: "$offers" },
        { $match: { "offers.buyer": user._id } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);

      const wonAuctions = await Auction.countDocuments({
        winner: user._id,
        status: "sold",
      });

      const totalAuctionOfferSent = await Auction.countDocuments({
        "offers.buyer": user._id,
      });

      const watchlistItems = await Watchlist.countDocuments({
        user: user._id,
      });

      const totalOffersCount = totalOffers[0]?.count || 0;
      const successRate =
        totalOffersCount > 0
          ? Math.round((wonAuctions / totalAuctionOfferSent) * 100)
          : 0;

      userStats = {
        totalOffers: totalOffersCount,
        auctionsWon: wonAuctions,
        watchlistItems,
        successRate,
      };
    } else if (user.userType === "admin") {
      userStats = {
        role: "Super Admin", // You might want to store this in user model
        lastLogin: user.updatedAt,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          stats: userStats,
        },
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user details",
    });
  }
};

// Update user status (activate/deactivate)
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true, runValidators: true },
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      data: { user },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating user status",
    });
  }
};

// Delete user and clean up related data
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // 1. Cancel all auctions created by this user
    const userAuctions = await Auction.find({ seller: userId });

    for (const auction of userAuctions) {
      // Cancel the auction
      auction.status = "cancelled";

      // Cancel agenda jobs for this auction
      await agendaService.cancelAuctionJobs(auction._id);

      await auction.save();
    }

    // 2. Remove user's bids from all auctions and update current highest bidder
    const auctionsWithUserBids = await Auction.find({
      "bids.bidder": userId,
      status: "active", // Only update active auctions
    });

    for (const auction of auctionsWithUserBids) {
      // Remove all bids by this user
      auction.bids = auction.bids.filter(
        (bid) => bid.bidder.toString() !== userId.toString(),
      );

      // Update bid count
      auction.bidCount = auction.bids.length;

      // Find the new highest bidder
      if (auction.bids.length > 0) {
        // Sort bids by amount descending and get the highest
        const sortedBids = auction.bids.sort((a, b) => b.amount - a.amount);
        const highestBid = sortedBids[0];

        auction.currentBidder = highestBid.bidder;
        auction.currentPrice = highestBid.amount;
      } else {
        // No bids left, reset to start price
        auction.currentBidder = null;
        auction.currentPrice = auction.startPrice;
      }

      await auction.save();
    }

    // 3. Delete user's comments (soft delete by marking as deleted)
    await Comment.updateMany(
      { user: userId },
      {
        status: "deleted",
        deletedAt: new Date(),
        deletedBy: req.user._id,
        adminDeleteReason: "User account deleted by admin",
      },
    );

    // 4. Remove user's watchlist items
    await Watchlist.deleteMany({ user: userId });

    // 5. Finally delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message:
        "User deleted successfully. All related data has been cleaned up.",
      data: {
        cancelledAuctions: userAuctions.length,
        updatedAuctions: auctionsWithUserBids.length,
      },
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting user",
    });
  }
};

// Update user role/type
export const updateUserType = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.body;

    // Validate user type
    if (!["admin", "seller", "bidder"].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { userType },
      { new: true, runValidators: true },
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${userType}`,
      data: { user },
    });
  } catch (error) {
    console.error("Update user type error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating user type",
    });
  }
};

// Get all auctions for admin
export const getAllAuctions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", filter = "all" } = req.query;

    const skip = (page - 1) * limit;
    const { context } = req.query;

    // Build search query
    let searchQuery = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { sellerUsername: { $regex: search, $options: "i" } },
        // { category: { $regex: search, $options: "i" } },
        { categories: { $in: [new RegExp(search, "i")] } },
      ],
    };

    if (context === "product") {
      searchQuery.auctionType = "buy_now";
    } else if (context === "auction") {
      searchQuery.auctionType = { $ne: "buy_now" };
    }

    // Add status filter if not 'all'
    if (filter !== "all") {
      if (filter === "active") {
        searchQuery.status = "active";
        searchQuery.endDate = { $gt: new Date() };
      } else if (filter === "pending") {
        searchQuery.status = "draft";
      } else if (filter === "ended") {
        searchQuery.status = { $in: ["ended", "sold", "reserve_not_met"] };
      } else {
        searchQuery.status = filter;
      }
    }

    // Get auctions with pagination and populate seller info
    const auctions = await Auction.find(searchQuery)
      .populate("seller", "firstName lastName username phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalAuctions = await Auction.countDocuments(searchQuery);

    const statsMatch = {};
    if (context === "product") statsMatch.auctionType = "buy_now";
    else if (context === "auction") statsMatch.auctionType = { $ne: "buy_now" };

    // Get auction statistics
    const auctionStats = await Auction.aggregate([
      { $match: statsMatch },
      {
        $facet: {
          total: [{ $count: "count" }],
          active: [
            {
              $match: {
                status: "active",
                endDate: { $gt: new Date() },
              },
            },
            { $count: "count" },
          ],
          draft: [{ $match: { status: "draft" } }, { $count: "count" }],
          sold: [{ $match: { status: "sold" } }, { $count: "count" }],
          featured: [{ $match: { featured: true } }, { $count: "count" }],
        },
      },
    ]);

    const stats = {
      total: auctionStats[0]?.total[0]?.count || 0,
      active: auctionStats[0]?.active[0]?.count || 0,
      pending: auctionStats[0]?.draft[0]?.count || 0,
      sold: auctionStats[0]?.sold[0]?.count || 0,
      featured: auctionStats[0]?.featured[0]?.count || 0,
    };

    res.status(200).json({
      success: true,
      data: {
        auctions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalAuctions / limit),
          totalAuctions,
          hasNext: page * limit < totalAuctions,
          hasPrev: page > 1,
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Get all auctions error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching auctions",
    });
  }
};

// Get auction details
export const getAuctionDetails = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findById(auctionId)
      .populate("seller", "firstName lastName username email phone")
      .populate("winner", "firstName lastName username")
      .populate("currentBidder", "firstName lastName username");

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    // Convert specifications Map to plain object
    const auctionObject = auction.toObject();

    if (
      auctionObject.specifications &&
      auctionObject.specifications instanceof Map
    ) {
      auctionObject.specifications = Object.fromEntries(
        auctionObject.specifications,
      );
    } else if (
      auction.specifications &&
      auction.specifications instanceof Map
    ) {
      // Fallback: convert from the original document if toObject() doesn't preserve the Map
      auctionObject.specifications = Object.fromEntries(auction.specifications);
    }

    // Calculate additional statistics
    const auctionStats = {
      totalBids: auction.bidCount,
      totalWatchers: auction.watchlistCount,
      totalViews: auction.views,
      timeRemaining: auction.timeRemaining,
      isReserveMet: auction.isReserveMet(),
    };

    res.status(200).json({
      success: true,
      data: {
        auction: {
          ...auctionObject,
          stats: auctionStats,
        },
      },
    });
  } catch (error) {
    console.error("Get auction details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching auction details",
    });
  }
};

// Update auction status
export const updateAuctionStatus = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { status, featured } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (featured !== undefined) updateData.featured = featured;

    const auction = await Auction.findByIdAndUpdate(auctionId, updateData, {
      new: true,
      runValidators: true,
    }).populate("seller", "firstName lastName username");

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    let message = "Auction updated successfully";
    if (status) message = `Auction ${status} successfully`;
    if (featured !== undefined) {
      message = `Auction ${featured ? "featured" : "unfeatured"} successfully`;
    }

    res.status(200).json({
      success: true,
      message,
      data: { auction },
    });
  } catch (error) {
    console.error("Update auction status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating auction status",
    });
  }
};

// Approve auction (change from draft to active)
export const approveAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findById(auctionId).populate("seller");

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    if (auction.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft auctions can be approved",
      });
    }

    const now = new Date();
    const isProduct = auction.auctionType === "buy_now";

    if (isProduct) {
      // Products have no dates — go straight to active
      auction.status = "active";
      await auction.populate("seller", "email username companyName firstName lastName");
      auctionListedEmail(auction, auction.seller).catch((error) =>
        console.error("Failed to send auction listed email:", error),
      );
    } else if (auction.startDate > now) {
      auction.status = "approved";
      await agendaService.scheduleAuctionActivation(auction._id, auction.startDate);
      auctionApprovedEmail(auction.seller, auction).catch((error) =>
        console.error("Failed to send auction approved email:", error),
      );
    } else {
      auction.status = "active";
      await auction.populate("seller", "email username companyName firstName lastName");
      auctionListedEmail(auction, auction.seller).catch((error) =>
        console.error("Failed to send auction listed email:", error),
      );
      if (auction.endDate && auction.endDate <= now) {
        await auction.endAuction();
      }
    }

    await auction.save();

    // ✅ Send response immediately
    res.status(200).json({
      success: true,
      message: "Auction approved successfully",
      data: { auction },
    });

    // ✅ Fire-and-forget: Fetch bidders and send notifications
    // This runs after the response is sent
    setImmediate(async () => {
      try {
        const bidders = await User.find({
          _id: { $ne: auction?.seller?._id },
          userType: { $ne: "admin" },
          isActive: true,
        }).select("email username companyName firstName lastName preferences userType currency");

        if (bidders.length > 0) {
          await sendBulkAuctionNotifications(bidders, auction, auction.seller);
        }
      } catch (error) {
        console.error("Failed to send bulk auction notifications:", error);
      }
    });

  } catch (error) {
    console.error("Approve auction error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while approving auction",
    });
  }
};

// Delete auction
export const deleteAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    // Prevent deletion of active auctions with bids
    if (auction.status === "active" && auction.bidCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete active auction with bids. Please cancel it first.",
      });
    }

    await Auction.findByIdAndDelete(auctionId);

    res.status(200).json({
      success: true,
      message: "Auction deleted successfully",
    });
  } catch (error) {
    console.error("Delete auction error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting auction",
    });
  }
};

// End auction manually
export const endAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findById(auctionId);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    if (auction.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Only active auctions can be ended manually",
      });
    }

    await auction.endAuction();

    res.status(200).json({
      success: true,
      message: "Auction ended successfully",
      data: { auction },
    });
  } catch (error) {
    console.error("End auction error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while ending auction",
    });
  }
};

export const updateAuction = async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    // For FormData, we need to access fields from req.body directly
    const {
      title,
      subTitle,
      features,
      description,
      specifications,
      location,
      videoLink,
      startPrice,
      bidIncrement,
      auctionType,
      reservePrice,
      buyNowPrice,
      allowOffers,
      startDate,
      endDate,
      removedPhotos,
      removedDocuments,
      removedServiceRecords,
      photoOrder,
      serviceRecordOrder,
    } = req.body;

    // ========== CATEGORIES HANDLING - FIXED ==========
    let categoriesArray = [];
    if (req.body.categories) {
      try {
        // Try to parse it as JSON first (from frontend JSON.stringify)
        const parsed = JSON.parse(req.body.categories);
        if (Array.isArray(parsed)) {
          categoriesArray = parsed;
        } else {
          categoriesArray = [parsed];
        }
      } catch (e) {
        // If it's not JSON, handle as regular string or array
        if (Array.isArray(req.body.categories)) {
          categoriesArray = req.body.categories;
        } else if (typeof req.body.categories === "string") {
          // Check if it's a comma-separated string
          categoriesArray = req.body.categories.includes(",")
            ? req.body.categories
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
            : [req.body.categories];
        }
      }
    }

    // Validation - categories are required
    if (!categoriesArray || categoriesArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one category is required",
      });
    }

    console.log("Categories after parsing:", categoriesArray);
    // =================================================

    // Basic validation - check if fields exist in req.body
    if (!title || !description || !auctionType) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
        missing: {
          title: !title,
          description: !description,
          auctionType: !auctionType,
          startDate: !startDate,
          endDate: !endDate,
        },
      });
    }

    // --- Dates: required for everything except buy_now ---
    const isProduct = auctionType === "buy_now";
    if (!isProduct && (!startDate || !endDate)) {
      return res.status(400).json({ success: false, message: "Start and end dates are required" });
    }

    // Validate start price for all auction types
    if (!startPrice || parseFloat(startPrice) < 0) {
      return res.status(400).json({
        success: false,
        message: "Start price is required and must be positive",
      });
    }

    // CHECK: If auction is sold, we'll reset everything
    const isSoldAuction =
      auction.status === "sold" || auction.status === "sold_buy_now";

    if (isSoldAuction) {
      const resetData = {
        // Reset all bidding/offers/winner data
        bids: [],
        offers: [],
        currentPrice: parseFloat(startPrice),
        currentBidder: null,
        winner: null,
        finalPrice: null,
        bidCount: 0,

        // Reset payment info
        paymentStatus: "pending",
        paymentMethod: null,
        paymentDate: null,
        transactionId: null,
        invoice: null,

        // Reset notifications
        notifications: {
          ending30min: false,
          ending2hour: false,
          ending24hour: false,
          ending30minSentAt: null,
          ending2hourSentAt: null,
          ending24hourSentAt: null,
          offerReceived: false,
          offerExpiring: false,
        },

        lastBidTime: null,

        // Reset views and watchlist if you want a fresh start
        views: 0,
        // watchlistCount: 0,

        // Reset commission
        commissionAmount: 0,
        commissionType: null,
        commissionValue: 0,
        bidPaymentRequired: true,

        // Set status based on new dates
        status: "draft", // Start as draft since it's being re-listed
      };

      // Apply reset data to auction object
      Object.assign(auction, resetData);
    }

    // Validate bid increment for standard and reserve auctions
    if (
      (auctionType === "standard" || auctionType === "reserve") &&
      (!bidIncrement || parseFloat(bidIncrement) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Bid increment is required for standard and reserve auctions",
      });
    }

    // Validate buy now price for buy_now auctions
    if (auctionType === "buy_now") {
      if (!buyNowPrice || parseFloat(buyNowPrice) < parseFloat(startPrice)) {
        return res.status(400).json({
          success: false,
          message:
            "Buy Now price must be provided and greater than or equal to start price",
        });
      }
    }

    // Validate reserve price for reserve auctions
    if (auctionType === "reserve") {
      if (!reservePrice || parseFloat(reservePrice) < parseFloat(startPrice)) {
        return res.status(400).json({
          success: false,
          message:
            "Reserve price must be provided and greater than or equal to start price",
        });
      }
    }

    // Validate giveaway auctions
    if (auctionType === "giveaway") {
      // For giveaways, we don't need pricing fields
      // But we should ensure they're not being updated incorrectly
      if (buyNowPrice || reservePrice || bidIncrement) {
        console.log("Warning: Pricing fields ignored for giveaway auction");
      }
    }

    // Handle specifications
    let finalSpecifications = new Map();

    // Convert existing specifications to Map if they exist
    if (auction.specifications && auction.specifications instanceof Map) {
      auction.specifications.forEach((value, key) => {
        if (value !== null && value !== undefined && value !== "") {
          finalSpecifications.set(key, value);
        }
      });
    } else if (
      auction.specifications &&
      typeof auction.specifications === "object"
    ) {
      Object.entries(auction.specifications).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          finalSpecifications.set(key, value);
        }
      });
    }

    // Parse and merge new specifications
    if (specifications) {
      try {
        let newSpecs;
        if (typeof specifications === "string") {
          newSpecs = JSON.parse(specifications);
        } else {
          newSpecs = specifications;
        }

        if (typeof newSpecs === "object" && newSpecs !== null) {
          Object.entries(newSpecs).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") {
              finalSpecifications.set(key, value.toString());
            } else {
              finalSpecifications.delete(key);
            }
          });
        }
      } catch (parseError) {
        console.error("Error parsing specifications:", parseError);
        return res.status(400).json({
          success: false,
          message: "Invalid specifications format",
        });
      }
    }

    // Handle removed photos
    let finalPhotos = [...auction.photos];
    if (removedPhotos) {
      try {
        const removedPhotoIds =
          typeof removedPhotos === "string"
            ? JSON.parse(removedPhotos)
            : removedPhotos;

        if (Array.isArray(removedPhotoIds)) {
          // Remove photos from the array and delete from Cloudinary
          for (const photoId of removedPhotoIds) {
            const photoIndex = finalPhotos.findIndex(
              (photo) =>
                photo.publicId === photoId || photo._id?.toString() === photoId,
            );

            if (photoIndex > -1) {
              const removedPhoto = finalPhotos[photoIndex];
              // Delete from Cloudinary
              if (removedPhoto.publicId) {
                await deleteFromCloudinary(removedPhoto.publicId);
              }
              finalPhotos.splice(photoIndex, 1);
            }
          }
        }
      } catch (error) {
        console.error("Error processing removed photos:", error);
      }
    }

    // Handle removed documents
    let finalDocuments = [...auction.documents];
    if (removedDocuments) {
      try {
        const removedDocIds =
          typeof removedDocuments === "string"
            ? JSON.parse(removedDocuments)
            : removedDocuments;

        if (Array.isArray(removedDocIds)) {
          for (const docId of removedDocIds) {
            const docIndex = finalDocuments.findIndex(
              (doc) => doc.publicId === docId || doc._id?.toString() === docId,
            );

            if (docIndex > -1) {
              const removedDoc = finalDocuments[docIndex];
              // Delete from Cloudinary
              if (removedDoc.publicId) {
                await deleteFromCloudinary(removedDoc.publicId);
              }
              finalDocuments.splice(docIndex, 1);
            }
          }
        }
      } catch (error) {
        console.error("Error processing removed documents:", error);
      }
    }

    // ========== CAPTION HANDLING ==========

    // 1. Get photo captions from request body
    const photoCaptionsArray = [];
    if (req.body.photoCaptions) {
      if (Array.isArray(req.body.photoCaptions)) {
        photoCaptionsArray.push(...req.body.photoCaptions);
      } else if (typeof req.body.photoCaptions === "string") {
        photoCaptionsArray.push(req.body.photoCaptions);
      }
    }

    // 2. Get existing document captions from request body
    const existingDocumentCaptions = [];
    if (req.body.existingDocumentCaptions) {
      if (Array.isArray(req.body.existingDocumentCaptions)) {
        existingDocumentCaptions.push(...req.body.existingDocumentCaptions);
      } else if (typeof req.body.existingDocumentCaptions === "string") {
        existingDocumentCaptions.push(req.body.existingDocumentCaptions);
      }
    }

    // 3. Get new document captions from request body
    const newDocumentCaptions = [];
    if (req.body.newDocumentCaptions) {
      if (Array.isArray(req.body.newDocumentCaptions)) {
        newDocumentCaptions.push(...req.body.newDocumentCaptions);
      } else if (typeof req.body.newDocumentCaptions === "string") {
        newDocumentCaptions.push(req.body.newDocumentCaptions);
      }
    }

    // 4. Get service record captions from request body
    const serviceRecordCaptionsArray = [];
    if (req.body.serviceRecordCaptions) {
      if (Array.isArray(req.body.serviceRecordCaptions)) {
        serviceRecordCaptionsArray.push(...req.body.serviceRecordCaptions);
      } else if (typeof req.body.serviceRecordCaptions === "string") {
        serviceRecordCaptionsArray.push(req.body.serviceRecordCaptions);
      }
    }

    // ========== SERVICE RECORD UPDATES ==========

    // Initialize finalServiceRecords here
    let finalServiceRecords = [...(auction.serviceRecords || [])];

    // Handle removed service records
    if (removedServiceRecords) {
      try {
        const removedServiceRecordIds =
          typeof removedServiceRecords === "string"
            ? JSON.parse(removedServiceRecords)
            : removedServiceRecords;

        if (Array.isArray(removedServiceRecordIds)) {
          for (const recordId of removedServiceRecordIds) {
            const recordIndex = finalServiceRecords.findIndex(
              (record) =>
                record.publicId === recordId ||
                record._id?.toString() === recordId,
            );

            if (recordIndex > -1) {
              const removedRecord = finalServiceRecords[recordIndex];
              // Delete from Cloudinary
              if (removedRecord.publicId) {
                await deleteFromCloudinary(removedRecord.publicId);
              }
              finalServiceRecords.splice(recordIndex, 1);
            }
          }
        }
      } catch (error) {
        console.error("Error processing removed service records:", error);
      }
    }

    // ========== PHOTO UPDATES ==========

    // Handle new photo uploads with captions
    const newPhotos = [];
    if (req.files && req.files.photos) {
      const photos = Array.isArray(req.files.photos)
        ? req.files.photos
        : [req.files.photos];

      for (const [index, photo] of photos.entries()) {
        try {
          const result = await uploadImageToCloudinary(
            photo.buffer,
            "auction-photos",
          );
          newPhotos.push({
            url: result.secure_url,
            publicId: result.public_id,
            filename: photo.originalname,
            order: finalPhotos.length + newPhotos.length,
            caption: photoCaptionsArray[index] || "",
          });
        } catch (uploadError) {
          console.error("Photo upload error:", uploadError);
          return res.status(400).json({
            success: false,
            message: `Failed to upload photo: ${photo.originalname}`,
          });
        }
      }
    }

    // Handle photo ordering
    if (photoOrder) {
      try {
        const parsedPhotoOrder =
          typeof photoOrder === "string" ? JSON.parse(photoOrder) : photoOrder;

        if (Array.isArray(parsedPhotoOrder)) {
          // Create a map of existing photos by their ID for quick lookup
          const existingPhotosMap = new Map();
          finalPhotos.forEach((photo) => {
            const photoId = photo.publicId || photo._id?.toString();
            if (photoId) {
              existingPhotosMap.set(photoId, photo);
            }
          });

          // Track used new photos to prevent duplicates
          const usedNewPhotos = new Set();
          const reorderedPhotos = [];

          for (const orderItem of parsedPhotoOrder) {
            if (orderItem.isExisting) {
              // Find existing photo by ID
              const existingPhoto = existingPhotosMap.get(orderItem.id);
              if (existingPhoto) {
                reorderedPhotos.push(existingPhoto);
                // Remove from map to avoid duplicates
                existingPhotosMap.delete(orderItem.id);
              }
            } else {
              // For new photos, find by the temporary ID from frontend
              let foundNewPhoto = null;
              for (let i = 0; i < newPhotos.length; i++) {
                if (!usedNewPhotos.has(i)) {
                  foundNewPhoto = newPhotos[i];
                  usedNewPhotos.add(i);
                  break;
                }
              }

              if (foundNewPhoto) {
                reorderedPhotos.push(foundNewPhoto);
              }
            }
          }

          // Add any remaining existing photos that weren't in the photoOrder
          existingPhotosMap.forEach((photo) => reorderedPhotos.push(photo));

          // Add any remaining new photos that weren't used
          newPhotos.forEach((photo, index) => {
            if (!usedNewPhotos.has(index)) {
              reorderedPhotos.push(photo);
            }
          });

          finalPhotos = reorderedPhotos;
        }
      } catch (error) {
        console.error("Error processing photo order:", error);
        // Fallback: append new photos at the end
        finalPhotos = [...finalPhotos, ...newPhotos];
      }
    } else {
      // If no photoOrder is provided, just append new photos at the end
      finalPhotos = [...finalPhotos, ...newPhotos];
    }

    // Update captions for existing photos (if sent from frontend)
    const existingPhotoCaptions = req.body.existingPhotoCaptions || [];
    finalPhotos.forEach((photo, index) => {
      if (
        index < existingPhotoCaptions.length &&
        existingPhotoCaptions[index] !== undefined
      ) {
        photo.caption = existingPhotoCaptions[index] || "";
      }
    });

    // ========== DOCUMENT UPDATES ==========

    // Update captions for existing documents
    finalDocuments.forEach((doc, index) => {
      if (index < existingDocumentCaptions.length) {
        doc.caption = existingDocumentCaptions[index] || "";
      }
    });

    // Handle new document uploads
    if (req.files && req.files.documents) {
      const documents = Array.isArray(req.files.documents)
        ? req.files.documents
        : [req.files.documents];

      for (const [index, doc] of documents.entries()) {
        try {
          const result = await uploadDocumentToCloudinary(
            doc.buffer,
            doc.originalname,
            "auction-documents",
          );
          finalDocuments.push({
            url: result.secure_url,
            publicId: result.public_id,
            filename: doc.originalname,
            originalName: doc.originalname,
            resourceType: "raw",
            caption: newDocumentCaptions[index] || "",
          });
        } catch (uploadError) {
          console.error("Document upload error:", uploadError);
          return res.status(400).json({
            success: false,
            message: `Failed to upload document: ${doc.originalname}`,
          });
        }
      }
    }

    // ========== SERVICE RECORD UPDATES CONTINUED ==========

    // Handle new service record uploads with captions
    const newServiceRecords = [];
    if (req.files && req.files.serviceRecords) {
      const serviceRecords = Array.isArray(req.files.serviceRecords)
        ? req.files.serviceRecords
        : [req.files.serviceRecords];

      for (const [index, record] of serviceRecords.entries()) {
        try {
          const result = await uploadImageToCloudinary(
            record.buffer,
            "auction-service-records",
          );
          newServiceRecords.push({
            url: result.secure_url,
            publicId: result.public_id,
            filename: record.originalname,
            originalName: record.originalname,
            order: finalServiceRecords.length + newServiceRecords.length,
            caption: serviceRecordCaptionsArray[index] || "",
          });
        } catch (uploadError) {
          console.error("Service record upload error:", uploadError);
          return res.status(400).json({
            success: false,
            message: `Failed to upload service record: ${record.originalname}`,
          });
        }
      }
    }

    // Handle service record ordering
    if (serviceRecordOrder) {
      try {
        const parsedServiceRecordOrder =
          typeof serviceRecordOrder === "string"
            ? JSON.parse(serviceRecordOrder)
            : serviceRecordOrder;

        if (Array.isArray(parsedServiceRecordOrder)) {
          // Create a map of existing service records by their ID for quick lookup
          const existingServiceRecordsMap = new Map();
          finalServiceRecords.forEach((record) => {
            const recordId = record.publicId || record._id?.toString();
            if (recordId) {
              existingServiceRecordsMap.set(recordId, record);
            }
          });

          // Track used new service records to prevent duplicates
          const usedNewServiceRecords = new Set();
          const reorderedServiceRecords = [];

          for (const orderItem of parsedServiceRecordOrder) {
            if (orderItem.isExisting) {
              // Find existing service record by ID
              const existingRecord = existingServiceRecordsMap.get(
                orderItem.id,
              );
              if (existingRecord) {
                reorderedServiceRecords.push(existingRecord);
                // Remove from map to avoid duplicates
                existingServiceRecordsMap.delete(orderItem.id);
              }
            } else {
              // For new service records, find by the temporary ID from frontend
              let foundNewRecord = null;
              for (let i = 0; i < newServiceRecords.length; i++) {
                if (!usedNewServiceRecords.has(i)) {
                  foundNewRecord = newServiceRecords[i];
                  usedNewServiceRecords.add(i);
                  break;
                }
              }

              if (foundNewRecord) {
                reorderedServiceRecords.push(foundNewRecord);
              }
            }
          }

          // Add any remaining existing service records that weren't in the order
          existingServiceRecordsMap.forEach((record) =>
            reorderedServiceRecords.push(record),
          );

          // Add any remaining new service records that weren't used
          newServiceRecords.forEach((record, index) => {
            if (!usedNewServiceRecords.has(index)) {
              reorderedServiceRecords.push(record);
            }
          });

          finalServiceRecords = reorderedServiceRecords;
        }
      } catch (error) {
        console.error("Error processing service record order:", error);
        // Fallback: append new service records at the end
        finalServiceRecords = [...finalServiceRecords, ...newServiceRecords];
      }
    } else {
      // If no serviceRecordOrder is provided, just append new service records at the end
      finalServiceRecords = [...finalServiceRecords, ...newServiceRecords];
    }

    // Update captions for existing service records
    const existingServiceRecordCaptions =
      req.body.existingServiceRecordCaptions || [];
    finalServiceRecords.forEach((record, index) => {
      if (
        index < existingServiceRecordCaptions.length &&
        existingServiceRecordCaptions[index] !== undefined
      ) {
        record.caption = existingServiceRecordCaptions[index] || "";
      }
    });

    // ========== DATE VALIDATION ==========
    let start = null;
    let end = null;
    if (!isProduct) {
      start = new Date(startDate);
      end = new Date(endDate);
      if (end <= start) {
        return res.status(400).json({ success: false, message: "End date must be after start date" });
      }
    }

    // ========== STATUS DETERMINATION ==========
    let newStatus;

    if (isSoldAuction) {
      // Sold reset logic (unchanged) — for products there's no startDate/endDate
      if (isProduct) {
        newStatus = "draft";   // product reset → back to draft for re-approval
      } else {
        const originalStart = auction.startDate;
        const originalEnd = auction.endDate;
        const startChanged = start.getTime() !== originalStart.getTime();
        const endChanged = end.getTime() !== originalEnd.getTime();

        if (!startChanged && !endChanged) {
          if (originalStart > now) newStatus = "draft";
          else if (originalStart <= now && originalEnd > now) newStatus = "active";
          else if (originalEnd <= now) newStatus = "ended";
        } else {
          if (start > now) newStatus = "draft";
          else if (start <= now && end > now) newStatus = "active";
          else if (end <= now) newStatus = "ended";
        }
      }
    } else {
      if (isProduct) {
        // Products: keep existing status, or draft if it was ended/cancelled
        newStatus = auction.winner
          ? auction.status
          : ["active", "draft"].includes(auction.status) ? auction.status : "draft";
      } else if (auctionType === "giveaway") {
        newStatus = auction.winner ? auction.status : "active";
      } else {
        if (start > now && end > now) newStatus = "approved";
        else if (end <= now) newStatus = "ended";
        else if (start <= now && end > now) newStatus = "active";
        else newStatus = auction.status;
      }
    }

    // ========== PREPARE UPDATE DATA ==========

    // Prepare update data
    const updateData = {
      title,
      subTitle: subTitle || "",
      categories: categoriesArray,
      features: features || "",
      description,
      specifications: finalSpecifications,
      location: location || "",
      videoLink: videoLink || "",
      startPrice: parseFloat(startPrice),
      auctionType,
      allowOffers: allowOffers === "true" || allowOffers === true,
      startDate: start,
      endDate: end,
      photos: finalPhotos,
      documents: finalDocuments,
      serviceRecords: finalServiceRecords,
      status: newStatus,
    };

    // Add bid increment only for standard and reserve auctions
    if (auctionType === "standard" || auctionType === "reserve") {
      updateData.bidIncrement = parseFloat(bidIncrement);
    } else {
      // Clear bid increment for other auction types
      updateData.bidIncrement = undefined;
    }

    // Add reserve price if applicable
    if (auctionType === "reserve") {
      updateData.reservePrice = parseFloat(reservePrice);
    } else {
      updateData.reservePrice = undefined;
    }

    // Add buy now price if applicable
    if (auctionType === "buy_now") {
      updateData.buyNowPrice = parseFloat(buyNowPrice);
    } else {
      updateData.buyNowPrice = undefined;
    }

    // Add reset fields for sold auctions
    if (isSoldAuction) {
      updateData.bids = [];
      updateData.offers = [];
      updateData.currentPrice = parseFloat(startPrice);
      updateData.currentBidder = null;
      updateData.winner = null;
      updateData.finalPrice = null;
      updateData.bidCount = 0;
      updateData.paymentStatus = "pending";
      updateData.paymentMethod = null;
      updateData.paymentDate = null;
      updateData.transactionId = null;
      updateData.invoice = null;
      updateData.notifications = {
        ending30min: false,
        ending2hour: false,
        ending24hour: false,
        ending30minSentAt: null,
        ending2hourSentAt: null,
        ending24hourSentAt: null,
        offerReceived: false,
        offerExpiring: false,
      };
      updateData.lastBidTime = null;
      updateData.commissionAmount = 0;
      updateData.bidPaymentRequired = true;
    }

    const updatedAuction = await Auction.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("seller", "username firstName lastName");

    // ========== RESCHEDULE JOBS ==========
    if (isProduct) {
      // Products don't have scheduled jobs
      await agendaService.cancelAuctionJobs(auction._id);
    } else {
      const datesChanged =
        start.getTime() !== new Date(auction.startDate).getTime() ||
        end.getTime() !== new Date(auction.endDate).getTime();

      if (datesChanged) {
        await agendaService.cancelAuctionJobs(auction._id);
        if (auctionType === "standard" || auctionType === "reserve") {
          if (start > new Date()) {
            await agendaService.scheduleAuctionActivation(updatedAuction._id, start);
          }
          await agendaService.scheduleAuctionEnd(updatedAuction._id, end);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: isSoldAuction
        ? "Sold auction has been reset and updated successfully"
        : "Auction updated successfully",
      data: { auction: updatedAuction },
      reset: isSoldAuction,
    });
  } catch (error) {
    console.error("Update auction error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating auction",
    });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = req.user;
    const { paymentStatus, paymentMethod, transactionId, notes } = req.body;

    // Find auction with populated data
    const auction = await Auction.findById(id)
      .populate("seller", "email username firstName lastName")
      .populate("winner", "email username firstName lastName");

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    // Validate auction is sold
    if (auction.status !== "sold" && auction.status !== "sold_buy_now") {
      return res.status(400).json({
        success: false,
        message: "Payment status can only be updated for sold auctions",
      });
    }

    // Validate payment status
    const validStatuses = [
      "pending",
      "processing",
      "completed",
      "failed",
      "refunded",
      "cancelled",
    ];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    // Handle invoice upload if provided
    let invoiceData = null;
    if (req.file) {
      const invoiceFile = req.file;
      try {
        const result = await uploadDocumentToCloudinary(
          invoiceFile.buffer,
          invoiceFile.originalname,
          "auction-invoices",
        );

        invoiceData = {
          url: result.secure_url,
          publicId: result.public_id,
          filename: invoiceFile.originalname,
          uploadedAt: new Date(),
          uploadedBy: admin._id,
        };
      } catch (uploadError) {
        console.error("Invoice upload error:", uploadError);
        return res.status(400).json({
          success: false,
          message: "Failed to upload invoice file",
        });
      }
    }

    // Update payment status and related fields
    auction.paymentStatus = paymentStatus;

    // Only update payment method if provided and status is not pending
    if (paymentMethod && paymentStatus !== "pending") {
      const validMethods = ["credit_card", "bank_transfer", "paypal", "other"];
      if (validMethods.includes(paymentMethod)) {
        auction.paymentMethod = paymentMethod;
      }
    }

    // Update transaction ID if provided
    if (transactionId && transactionId.trim() !== "") {
      auction.transactionId = transactionId.trim();
    }

    // Set payment date for completed status
    if (paymentStatus === "completed") {
      auction.paymentDate = new Date();
    }

    // Attach invoice if uploaded
    if (invoiceData) {
      auction.invoice = invoiceData;
    }

    await auction.save();

    // Populate updated auction
    const updatedAuction = await Auction.findById(id)
      .populate("seller", "username firstName lastName email phone address")
      .populate("winner", "username firstName lastName email phone address");

    const updatedPayment = await Payment.findOneAndUpdate({ auction: updatedAuction?._id }, { status: paymentStatus, processedBy: admin })

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      data: {
        auction: updatedAuction,
      },
    });

    if (paymentStatus === "completed" && updatedAuction.winner) {
      // Send payment success email to winner
      paymentCompletedEmail(
        updatedAuction?.winner,
        updatedAuction,
        updatedAuction?.finalPrice,
      ).catch((error) =>
        console.error("Failed to send payment success email:", error),
      );

      // Send payment received email to seller
      paymentCompletedSellerEmail(
        updatedAuction?.seller,
        updatedAuction,
        updatedAuction?.winner,
      ).catch((error) =>
        console.error(
          "Failed to send seller payment notification email:",
          error,
        ),
      );
    }
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update payment status",
    });
  }
};

export const fetchDVLAData = async (req, res) => {
  try {
    const { registrationNumber } = req.body;

    if (!registrationNumber) {
      return res.status(400).json({
        success: false,
        message: "registrationNumber is required",
      });
    }

    const response = await axios.post(
      process.env.DVLA_WORKER_URL,
      { registrationNumber },
      { timeout: 10000 },
    );

    res.status(200).json({
      success: true,
      message: "Vehicle details fetched successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("DVLA Worker error:", error?.response?.data || error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vehicle details",
    });
  }
};

// Verify user identity
export const verifyUserIdentity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body; // Optional admin notes

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.identificationDocument) {
      return res.status(400).json({
        success: false,
        message: "User has not uploaded any identification document",
      });
    }

    // Update user verification status
    user.identificationStatus = "verified";
    user.identificationVerifiedAt = new Date();
    user.identificationRejectionReason = null;
    user.isVerified = true;

    await user.save();

    // Send approval email (fire and forget)
    accountApprovedEmail(user).catch(err =>
      console.error("Failed to send account approved email:", err)
    );

    res.status(200).json({
      success: true,
      message: "User identity verified successfully",
      data: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        identificationStatus: user.identificationStatus,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Reject user identity verification
export const rejectUserIdentity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rejectionReason, allowReupload = true } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Store old document info for potential cleanup
    const oldDocumentPublicId = user.identificationDocumentPublicId;

    // Update user verification status
    user.identificationStatus = "rejected";
    user.identificationRejectionReason = rejectionReason;

    // If user can reupload, keep the document for reference
    if (!allowReupload) {
      // Delete the document from Cloudinary
      if (oldDocumentPublicId) {
        try {
          await deleteFromCloudinary(oldDocumentPublicId, "raw");
        } catch (cloudinaryError) {
          console.error("Failed to delete rejected document:", cloudinaryError);
        }
      }

      // Clear document fields
      user.identificationDocument = null;
      user.identificationDocumentPublicId = null;
    }

    await user.save();

    // Send approval email (fire and forget)
    identityRejectedEmail(user, rejectionReason, true).catch(err =>
      console.error("Failed to send account approved email:", err)
    );

    res.status(200).json({
      success: true,
      message: "User identity verification rejected",
      data: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        identificationStatus: user.identificationStatus,
        rejectionReason: user.identificationRejectionReason,
        canReupload: allowReupload,
      },
    });
  } catch (error) {
    console.error("Rejection error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Verify user
export const verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body; // Optional admin notes

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already verified.",
      });
    }

    // Update user verification status
    user.isVerified = true;

    await user.save();

    // Send approval email (fire and forget)
    accountApprovedEmail(user).catch(err =>
      console.error("Failed to send account approved email:", err)
    );

    res.status(200).json({
      success: true,
      message: "User verified successfully",
      data: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};