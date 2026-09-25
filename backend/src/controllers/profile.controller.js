import User from "../models/user.model.js";
import Watchlist from "../models/watchlist.model.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import bcrypt from "bcrypt";

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile",
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      firstName,
      lastName,
      phone,
      countryCode,
      countryName,
      street,
      city,
      state,
      postCode,
      country,
    } = req.body;

    const updateData = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone && { phone }),
      ...(countryCode && { countryCode }),
      ...(countryName && { countryName }),
    };

    // Handle address fields if provided
    if (street || city || state || postCode || country) {
      updateData.address = {
        ...(street && { street }),
        ...(city && { city }),
        ...(state && { state }),
        ...(postCode && { postCode }),
        ...(country && { country }),
      };
    }

    // Handle avatar upload
    if (req.file) {
      try {
        // Delete old avatar if exists
        const oldUser = await User.findById(userId);
        if (oldUser.image) {
          await deleteFromCloudinary(oldUser.image);
        }

        // Upload new avatar
        const result = await uploadToCloudinary(
          req.file.buffer,
          "user-avatars"
        );
        updateData.image = result.secure_url;
      } catch (uploadError) {
        console.error("Avatar upload error:", uploadError);
        return res.status(400).json({
          success: false,
          message: "Failed to upload avatar image",
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -refreshToken");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(userId);

    // Verify current password
    const isCurrentPasswordValid = await user.isPasswordCorrect(
      currentPassword
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while changing password",
    });
  }
};

// Update preferences
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { preferences } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { preferences },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password -refreshToken");

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating preferences",
    });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { userType } = req.params;

    const Auction = (await import("../models/auction.model.js")).default;

    let statistics = {};

    if (userType === "bidder") {
      const auctionMatch = { auctionType: { $ne: "buy_now" } };
      const productMatch = { auctionType: "buy_now" };

      // ===== AUCTION STATS =====
      const totalBidsResult = await Auction.aggregate([
        { $match: { "bids.bidder": userId, ...auctionMatch } },
        { $unwind: "$bids" },
        { $match: { "bids.bidder": userId, "bids.isBuyNow": { $ne: true } } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]);

      const totalOffersCount = await Auction.aggregate([
        { $match: { "offers.buyer": userId, ...auctionMatch } },
        { $unwind: "$offers" },
        { $match: { "offers.buyer": userId } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]);

      const participatedAuctions = await Auction.countDocuments({
        ...auctionMatch,
        $or: [
          { "bids.bidder": userId },
          { "offers.buyer": userId },
          { winner: userId },
        ],
      });

      const currentlyWinning = await Auction.countDocuments({
        ...auctionMatch,
        currentBidder: userId,
        status: "active",
        endDate: { $gt: new Date() },
      });

      const activeBidsResult = await Auction.aggregate([
        { $match: { ...auctionMatch, "bids.bidder": userId, status: "active", endDate: { $gt: new Date() } } },
        { $unwind: "$bids" },
        { $match: { "bids.bidder": userId } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      const activeBids = activeBidsResult[0]?.count || 0;

      const activeOffersResult = await Auction.aggregate([
        { $match: { ...auctionMatch, "offers.buyer": userId, status: "active", endDate: { $gt: new Date() } } },
        { $unwind: "$offers" },
        { $match: { "offers.buyer": userId, "offers.status": "pending" } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      const activeOffers = activeOffersResult[0]?.count || 0;

      const wonAuctions = await Auction.countDocuments({
        ...auctionMatch,
        winner: userId,
        status: { $in: ["sold", "sold_buy_now"] },
      });

      const watchlistItems = await Watchlist.aggregate([
        { $lookup: { from: "auctions", localField: "auction", foreignField: "_id", as: "auction" } },
        { $unwind: "$auction" },
        { $match: { "auction.status": "active", "auction.auctionType": { $ne: "buy_now" }, user: userId } },
        { $count: "count" },
      ]);
      const watchlistCount = watchlistItems[0]?.count || 0;

      const acceptedOffersSpent = await Auction.aggregate([
        { $match: { ...auctionMatch, "offers.buyer": userId, "offers.status": "accepted" } },
        { $unwind: "$offers" },
        { $match: { "offers.buyer": userId, "offers.status": "accepted" } },
        { $group: { _id: null, total: { $sum: "$offers.amount" } } },
      ]);
      const totalSpent = acceptedOffersSpent[0]?.total || 0;

      const totalBids = totalBidsResult[0]?.total || 0;
      const totalOffers = totalOffersCount[0]?.total || 0;

      const totalBidAmount = await Auction.aggregate([
        { $match: { ...auctionMatch, "bids.bidder": userId } },
        { $unwind: "$bids" },
        { $match: { "bids.bidder": userId, "bids.isBuyNow": { $ne: true } } },
        { $group: { _id: null, total: { $sum: "$bids.amount" } } },
      ]);
      const avgBidAmount = totalBids > 0 ? (totalBidAmount[0]?.total || 0) / totalBids : 0;

      const totalOfferValue = await Auction.aggregate([
        { $match: { ...auctionMatch, "offers.buyer": userId } },
        { $unwind: "$offers" },
        { $match: { "offers.buyer": userId } },
        { $group: { _id: null, total: { $sum: "$offers.amount" } } },
      ]);
      const avgOfferAmount = totalOffers > 0 ? (totalOfferValue[0]?.total || 0) / totalOffers : 0;

      const successRate = participatedAuctions > 0
        ? Math.round((wonAuctions / participatedAuctions) * 100) : 0;

      const buyNowPurchases = await Auction.countDocuments({
        ...auctionMatch,
        winner: userId,
        status: "sold_buy_now",
      });

      // ===== PRODUCT STATS =====
      const totalProductsPurchased = await Auction.countDocuments({
        ...productMatch,
        winner: userId,
        status: "sold",
      });

      const recentPurchases = await Auction.countDocuments({
        ...productMatch,
        winner: userId,
        status: "sold",
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      });

      const productSpendingResult = await Auction.aggregate([
        { $match: { ...productMatch, winner: userId, status: "sold" } },
        { $group: { _id: null, total: { $sum: "$finalPrice" }, avg: { $avg: "$finalPrice" } } },
      ]);
      const totalProductSpent = productSpendingResult[0]?.total || 0;
      const avgProductSpent = productSpendingResult[0]?.avg || 0;

      statistics = {
        userType: "bidder",

        // Auction stats
        totalBids,
        totalOffers,
        activeOffers,
        activeBids,
        wonAuctions,
        watchlistCount,
        successRate,
        totalSpent,
        avgBidAmount: Math.round(avgBidAmount),
        avgOfferAmount: Math.round(avgOfferAmount),
        currentlyWinning,
        totalParticipatedAuctions: participatedAuctions,
        buyNowPurchases,
        totalAcceptedOffers: acceptedOffersSpent[0]?.total || 0,
        totalRejectedOffers: await Auction.aggregate([
          { $match: { ...auctionMatch, "offers.buyer": userId } },
          { $unwind: "$offers" },
          { $match: { "offers.buyer": userId, "offers.status": "rejected" } },
          { $group: { _id: null, count: { $sum: 1 } } },
        ]).then((r) => r[0]?.count || 0),
        recentBids: await Auction.aggregate([
          {
            $match: {
              ...auctionMatch,
              "bids.bidder": userId,
              "bids.timestamp": { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
          { $unwind: "$bids" },
          {
            $match: {
              "bids.bidder": userId,
              "bids.timestamp": { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
          { $group: { _id: null, count: { $sum: 1 } } },
        ]).then((r) => r[0]?.count || 0),

        // Product stats
        totalProductsPurchased,
        recentPurchases,
        totalProductSpent: Math.round(totalProductSpent),
        avgProductSpent: Math.round(avgProductSpent),
      };
    } else if (userType === "seller") {
      const auctionOnly = { seller: userId, auctionType: { $ne: "buy_now" } };
      const productOnly = { seller: userId, auctionType: "buy_now" };

      // ===== AUCTION STATS =====
      const totalAuctions = await Auction.countDocuments(auctionOnly);
      const activeAuctions = await Auction.countDocuments({
        ...auctionOnly, status: "active", endDate: { $gt: new Date() },
      });
      const soldAuctions = await Auction.countDocuments({ ...auctionOnly, status: "sold" });
      const draftAuctions = await Auction.countDocuments({ ...auctionOnly, status: "draft" });
      const endedNotSold = await Auction.countDocuments({
        ...auctionOnly, status: "ended", winner: { $exists: false },
      });
      const endingSoonAuctions = await Auction.countDocuments({
        ...auctionOnly,
        status: "active",
        endDate: { $gt: new Date(), $lt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      const reserveNotMet = await Auction.countDocuments({
        ...auctionOnly, status: "reserve_not_met",
      });

      const totalRevenueResult = await Auction.aggregate([
        { $match: { ...auctionOnly, status: "sold" } },
        { $group: { _id: null, total: { $sum: "$finalPrice" } } },
      ]);
      const totalRevenue = totalRevenueResult[0]?.total || 0;
      const avgSalePrice = soldAuctions > 0 ? totalRevenue / soldAuctions : 0;

      const completedAuctions = soldAuctions + endedNotSold + reserveNotMet;
      const successRate = completedAuctions > 0
        ? Math.round((soldAuctions / completedAuctions) * 100) : 0;

      const totalBidsOnAuctions = await Auction.aggregate([
        { $match: auctionOnly },
        { $group: { _id: null, totalBids: { $sum: "$bidCount" } } },
      ]);
      const totalBidsReceived = totalBidsOnAuctions[0]?.totalBids || 0;
      const avgBidsPerAuction = totalAuctions > 0 ? totalBidsReceived / totalAuctions : 0;

      const highestSaleResult = await Auction.findOne({ ...auctionOnly, status: "sold" })
        .sort({ finalPrice: -1 })
        .select("title finalPrice");

      const mostPopularAuction = await Auction.findOne({ ...auctionOnly, bidCount: { $gt: 0 } })
        .sort({ bidCount: -1 })
        .select("title bidCount watchlistCount");

      const totalWatchlists = await Watchlist.aggregate([
        { $lookup: { from: "auctions", localField: "auction", foreignField: "_id", as: "auction" } },
        { $unwind: "$auction" },
        {
          $match: {
            "auction.status": "active",
            "auction.auctionType": { $ne: "buy_now" },
            "auction.seller": userId,
          },
        },
        { $count: "count" },
      ]);
      const totalWatchlistsCount = totalWatchlists[0]?.count || 0;

      const auctionViews = await Auction.aggregate([
        { $match: auctionOnly },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
      ]).then((r) => r[0]?.totalViews || 0);

      // ===== PRODUCT STATS =====
      const totalProducts = await Auction.countDocuments(productOnly);
      const activeProducts = await Auction.countDocuments({ ...productOnly, status: "active" });
      const soldProducts = await Auction.countDocuments({ ...productOnly, status: "sold" });
      const draftProducts = await Auction.countDocuments({ ...productOnly, status: "draft" });
      const cancelledProducts = await Auction.countDocuments({ ...productOnly, status: "cancelled" });

      const productRevenueResult = await Auction.aggregate([
        { $match: { ...productOnly, status: "sold" } },
        { $group: { _id: null, total: { $sum: "$finalPrice" } } },
      ]);
      const productRevenue = productRevenueResult[0]?.total || 0;
      const avgProductPrice = soldProducts > 0 ? productRevenue / soldProducts : 0;

      const completedProducts = soldProducts + cancelledProducts;
      const productSuccessRate = completedProducts > 0
        ? Math.round((soldProducts / completedProducts) * 100) : 0;

      const productViews = await Auction.aggregate([
        { $match: productOnly },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
      ]).then((r) => r[0]?.totalViews || 0);

      statistics = {
        userType: "seller",

        // Auction stats
        totalAuctions,
        activeAuctions,
        soldAuctions,
        draftAuctions,
        endedNotSold,
        endingSoonAuctions,
        reserveNotMet,
        totalRevenue,
        avgSalePrice: Math.round(avgSalePrice),
        successRate,
        totalBidsReceived,
        avgBidsPerAuction: Math.round(avgBidsPerAuction * 100) / 100,
        highestSale: highestSaleResult
          ? { title: highestSaleResult.title, amount: highestSaleResult.finalPrice }
          : null,
        mostPopularAuction: mostPopularAuction
          ? {
            title: mostPopularAuction.title,
            bidCount: mostPopularAuction.bidCount,
            watchlistCount: mostPopularAuction.watchlistCount,
          }
          : null,
        totalViews: auctionViews,
        totalWatchlists: totalWatchlistsCount,

        // Product stats
        totalProducts,
        activeProducts,
        soldProducts,
        draftProducts,
        cancelledProducts,
        productRevenue,
        avgProductPrice: Math.round(avgProductPrice),
        productSuccessRate,
        productViews,
      };
    }

    res.status(200).json({
      success: true,
      data: { statistics, userType },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user statistics",
    });
  }
};


//     try {
//         const userId = req.user._id;
//         const userType = req.user.userType;

//         const Auction = (await import('../models/auction.model.js')).default;
//         const Watchlist = (await import('../models/watchlist.model.js')).default;

//         // Bidder Statistics
//         const totalBidsResult = await Auction.aggregate([
//             { $match: { 'bids.bidder': userId } },
//             { $unwind: '$bids' },
//             { $match: { 'bids.bidder': userId } },
//             { $group: { _id: null, total: { $sum: 1 } } }
//         ]);

//         const participatedAuctions = await Auction.countDocuments({
//             'bids.bidder': userId
//         });

//         const activeBids = await Auction.countDocuments({
//             'bids.bidder': userId,
//             status: 'active',
//             endDate: { $gt: new Date() }
//         });

//         const wonAuctions = await Auction.countDocuments({
//             winner: userId,
//             status: 'sold'
//         });

//         const watchlistItems = await Watchlist.aggregate([
//             {
//                 $lookup: {
//                     from: 'auctions',
//                     localField: 'auction',
//                     foreignField: '_id',
//                     as: 'auction'
//                 }
//             },
//             {
//                 $unwind: '$auction'
//             },
//             {
//                 $match: {
//                     'auction.status': 'active',
//                     'user': userId
//                 }
//             },
//             {
//                 $count: 'count'
//             }
//         ]);

//         const watchlistCount = watchlistItems[0]?.count || 0;
//         const totalBids = totalBidsResult[0]?.total || 0;
//         const successRate = participatedAuctions > 0 ? Math.round((wonAuctions / participatedAuctions) * 100) : 0;

//         // Calculate total spent (sum of winning bids)
//         const totalSpentResult = await Auction.aggregate([
//             { $match: { winner: userId, status: 'sold' } },
//             { $group: { _id: null, total: { $sum: '$finalPrice' } } }
//         ]);

//         const totalSpent = totalSpentResult[0]?.total || 0;
//         const avgBidAmount = totalBids > 0 ? totalSpent / totalBids : 0;

//         // Seller Statistics
//         const totalAuctions = await Auction.countDocuments({
//             seller: userId
//         });

//         const activeAuctions = await Auction.countDocuments({
//             seller: userId,
//             status: 'active',
//             endDate: { $gt: new Date() }
//         });

//         const soldAuctions = await Auction.countDocuments({
//             seller: userId,
//             status: 'sold'
//         });

//         const draftAuctions = await Auction.countDocuments({
//             seller: userId,
//             status: 'draft'
//         });

//         const endedNotSold = await Auction.countDocuments({
//             seller: userId,
//             status: 'ended',
//             winner: { $exists: false }
//         });

//         const endingSoonAuctions = await Auction.countDocuments({
//             seller: userId,
//             status: 'active',
//             endDate: {
//                 $gt: new Date(),
//                 $lt: new Date(Date.now() + 24 * 60 * 60 * 1000)
//             }
//         });

//         const reserveNotMet = await Auction.countDocuments({
//             seller: userId,
//             status: 'reserve_not_met'
//         });

//         // Calculate total revenue from sold auctions
//         const totalRevenueResult = await Auction.aggregate([
//             { $match: { seller: userId, status: 'sold' } },
//             { $group: { _id: null, total: { $sum: '$finalPrice' } } }
//         ]);

//         const totalRevenue = totalRevenueResult[0]?.total || 0;
//         const avgSalePrice = soldAuctions > 0 ? totalRevenue / soldAuctions : 0;

//         // Calculate success rate (sold vs total completed auctions)
//         const completedAuctions = soldAuctions + endedNotSold + reserveNotMet;
//         const sellerSuccessRate = completedAuctions > 0 ? Math.round((soldAuctions / completedAuctions) * 100) : 0;

//         // Calculate total bids across all seller's auctions
//         const totalBidsOnAuctions = await Auction.aggregate([
//             { $match: { seller: userId } },
//             { $group: { _id: null, totalBids: { $sum: '$bidCount' } } }
//         ]);

//         const totalBidsReceived = totalBidsOnAuctions[0]?.totalBids || 0;
//         const avgBidsPerAuction = totalAuctions > 0 ? (totalBidsReceived / totalAuctions) : 0;

//         // Get highest selling auction
//         const highestSaleResult = await Auction.findOne({
//             seller: userId,
//             status: 'sold'
//         }).sort({ finalPrice: -1 }).select('title finalPrice');

//         // Get most bid-on auction
//         const mostPopularAuction = await Auction.findOne({
//             seller: userId,
//             bidCount: { $gt: 0 }
//         }).sort({ bidCount: -1 }).select('title bidCount');

//         const totalWatchlists = await Watchlist.aggregate([
//             {
//                 $lookup: {
//                     from: 'auctions',
//                     localField: 'auction',
//                     foreignField: '_id',
//                     as: 'auction'
//                 }
//             },
//             {
//                 $unwind: '$auction'
//             },
//             {
//                 $match: {
//                     'auction.seller': userId
//                 }
//             },
//             {
//                 $count: 'count'
//             }
//         ]);

//         const totalWatchlistsCount = totalWatchlists[0]?.count || 0;

//         const totalViews = await Auction.aggregate([
//             { $match: { seller: userId } },
//             { $group: { _id: null, totalViews: { $sum: '$views' } } }
//         ]).then(result => result[0]?.totalViews || 0);

//         const statistics = {
//             userType, // Keep userType for reference

//             // Bidder Stats (available to all users)
//             bidderStats: {
//                 totalBids,
//                 activeBids,
//                 wonAuctions,
//                 watchlistCount,
//                 successRate,
//                 totalSpent,
//                 avgBidAmount: Math.round(avgBidAmount),
//                 totalParticipatedAuctions: participatedAuctions,
//                 currentlyWinning: await Auction.countDocuments({
//                     'currentBidder': userId,
//                     status: 'active',
//                     endDate: { $gt: new Date() }
//                 })
//             },

//             // Seller Stats (available to all users)
//             sellerStats: {
//                 totalAuctions,
//                 activeAuctions,
//                 soldAuctions,
//                 draftAuctions,
//                 endedNotSold,
//                 endingSoonAuctions,
//                 reserveNotMet,
//                 totalRevenue,
//                 avgSalePrice: Math.round(avgSalePrice),
//                 successRate: sellerSuccessRate,
//                 totalBidsReceived,
//                 avgBidsPerAuction: Math.round(avgBidsPerAuction * 100) / 100,
//                 highestSale: highestSaleResult ? {
//                     title: highestSaleResult.title,
//                     amount: highestSaleResult.finalPrice
//                 } : null,
//                 mostPopularAuction: mostPopularAuction ? {
//                     title: mostPopularAuction.title,
//                     bidCount: mostPopularAuction.bidCount
//                 } : null,
//                 totalViews,
//                 totalWatchlists: totalWatchlistsCount
//             },

//             // Combined overall stats
//             overallStats: {
//                 totalAuctionsParticipated: participatedAuctions,
//                 totalAuctionsCreated: totalAuctions,
//                 totalWonAuctions: wonAuctions,
//                 totalSoldAuctions: soldAuctions,
//                 totalWatchlisted: watchlistCount,
//                 totalRevenue: totalRevenue,
//                 totalSpent: totalSpent
//             }
//         };

//         res.status(200).json({
//             success: true,
//             data: {
//                 statistics,
//                 userType
//             }
//         });

//     } catch (error) {
//         console.error('Get user stats error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Internal server error while fetching user statistics'
//         });
//     }
// };
