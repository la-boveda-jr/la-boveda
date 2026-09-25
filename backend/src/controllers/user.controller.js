import User from "../models/user.model.js";
import { StripeService } from "../services/stripeService.js";
import jwt from "jsonwebtoken";
import {
  newUserRegistrationEmail,
  resetPasswordEmail,
  welcomeEmail,
} from "../utils/nodemailer.js";
import crypto from "crypto";
import BidPayment from "../models/bidPayment.model.js";
import { deleteFromCloudinary, uploadDocumentToCloudinary, uploadImageToCloudinary } from "../utils/cloudinary.js";
import Auction from "../models/auction.model.js";
import mongoose from "mongoose";

// Helper function to generate tokens and set cookies
const generateTokensAndRespond = async (user, req, res, message) => {
  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    const resetToken = user.generateResetPasswordToken();

    // Save refresh token to user document
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Remove sensitive data from user object
    const safeUser = user.toSafeObject();

    // await loginUser(req, res);

    // Set cookies and send response
    res
      .status(201)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 60 * 1000, // 30 minutes
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .json({
        success: true,
        message,
        data: {
          user: safeUser,
          accessToken,
          refreshToken,
        },
      });
  } catch (error) {
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

// Registration Controller
export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      userType,
      countryCode,
      countryName,
      phone = "",
      image = "",
      // Add new address fields
      dealershipName = "",
      buildingNameNo = "",
      street = "",
      city = "",
      county = "",
      postCode = "",
    } = req.body;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    // Check if user already exists with normalized email or username
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Handle ID document upload
    const identificationDocumentFile = req.file;
    let identificationDocumentUrl = null;
    let identificationDocumentPublicId = null;

    if (identificationDocumentFile) {
      const isImage = identificationDocumentFile.mimetype.startsWith('image/');
      const uploadFn = isImage
        ? uploadImageToCloudinary
        : uploadDocumentToCloudinary;

      const uploadResult = await uploadFn(
        identificationDocumentFile.buffer,
        isImage ? undefined : identificationDocumentFile.originalname,
        'identification-documents'
      );
      identificationDocumentUrl = uploadResult.secure_url;
      identificationDocumentPublicId = uploadResult.public_id;
    }

    // Create user in database
    const userData = {
      firstName,
      lastName,
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      userType,
      countryCode,
      countryName,
      phone,
      image,
      isVerified: false,
      identificationDocument: identificationDocumentUrl,
      identificationDocumentPublicId,
      identificationStatus: identificationDocumentUrl ? 'pending' : undefined,
      // Add address object
      address: {
        dealershipName,
        buildingNameNo,
        street,
        city,
        county,
        postCode,
        country: countryName, // Use the countryName from request
      },
    };

    const user = await User.create(userData);

    if (!user) {
      return res.status(500).json({
        success: false,
        message: "User registration failed",
      });
    }

    // await generateTokensAndRespond(user, res, 'Registration successful');
    await generateTokensAndRespond(user, req, res, "Registration successful");

    //send registration email
    await welcomeEmail(user);

    const adminUsers = await User.find({ userType: "admin" });
    for (const admin of adminUsers) {
      await newUserRegistrationEmail(admin.email, user);
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
};

// Login Controller
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No user found",
      });
    }

    // Check if user is active
    // if (!user.isActive) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Account is deactivated",
    //   });
    // }

    // Verify password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Wrong password",
      });
    }

    // await generateTokensAndRespond(user, res, 'Login successful');
    await generateTokensAndRespond(user, req, res, "Login successful");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
};

// Logout Controller
export const logoutUser = async (req, res) => {
  try {
    const user = req.user;

    // Clear refresh token from database
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });

    // Clear cookies
    res.clearCookie("accessToken").clearCookie("refreshToken").json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during logout",
    });
  }
};

// Refresh Access Token
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate new tokens
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Access token refreshed",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error during token refresh",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    }

    const resetToken = await user.generateResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const url = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const emailSent = await resetPasswordEmail(user.email, url);

    if (!emailSent) {
      user.resetPasswordToken = null;
      user.resetPasswordTokenExpiry = null;
      await user.save({ validateBeforeSave: false });
      return res
        .status(500)
        .json({ success: false, message: "Could not send email" });
    }

    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const { newPassword } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(200)
        .json({ success: true, message: "Token is invalid or has expired" });
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: "Password updated" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to get user" });
  }
};

export const getBillingInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "stripeCustomerId paymentMethodId cardLast4 cardBrand cardExpMonth cardExpYear isPaymentVerified userType"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const billingInfo = {
      stripeCustomerId: user.stripeCustomerId,
      isPaymentVerified: user.isPaymentVerified,
      userType: user.userType,
    };

    // Add card details if available
    if (user.cardLast4) {
      billingInfo.card = {
        last4: user.cardLast4,
        brand: user.cardBrand,
        expMonth: user.cardExpMonth,
        expYear: user.cardExpYear,
      };
    }

    res.status(200).json({
      success: true,
      data: billingInfo,
    });
  } catch (error) {
    console.error("Get billing info error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching billing information",
    });
  }
};

export const updatePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user._id;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: "Payment method ID is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: "No Stripe customer found",
      });
    }

    // ✅ STEP 1: Cancel ONLY pending authorizations (requires_capture) on old card
    // DO NOT cancel succeeded payments (already charged commissions)
    const pendingAuthorizations = await BidPayment.find({
      bidder: userId,
      type: "bid_authorization",
      status: "requires_capture", // ONLY this status!
    });

    console.log(
      `🔄 Cancelling ${pendingAuthorizations.length} PENDING authorizations for user ${userId}`
    );

    let cancelledCount = 0;
    for (const payment of pendingAuthorizations) {
      try {
        await StripeService.cancelPaymentIntent(payment.paymentIntentId);
        payment.status = "canceled";
        await payment.save();
        cancelledCount++;
        console.log(
          `✅ Cancelled PENDING authorization for auction: ${payment.auction}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to cancel authorization ${payment.paymentIntentId}:`,
          error.message
        );
      }
    }

    // ✅ STEP 2: Also mark any 'succeeded' bid_authorizations as 'replaced'
    // These are the old $2500 authorizations that were replaced by final commissions
    const succeededAuthorizations = await BidPayment.find({
      bidder: userId,
      type: "bid_authorization",
      status: "succeeded",
    });

    for (const payment of succeededAuthorizations) {
      payment.status = "replaced"; // Mark as replaced for clarity
      await payment.save();
      console.log(
        `📝 Marked succeeded authorization as replaced for auction: ${payment.auction}`
      );
    }

    // ✅ STEP 3: Verify and update card with Stripe
    const verificationResult = await StripeService.verifyAndSaveCard(
      user.stripeCustomerId,
      paymentMethodId
    );

    if (!verificationResult.success) {
      throw new Error("Card verification failed");
    }

    const paymentMethodDetails = verificationResult.paymentMethod;

    // ✅ STEP 4: Update user in database
    user.paymentMethodId = paymentMethodDetails.id;
    user.cardLast4 = paymentMethodDetails.last4;
    user.cardBrand = paymentMethodDetails.brand;
    user.cardExpMonth = paymentMethodDetails.expMonth;
    user.cardExpYear = paymentMethodDetails.expYear;
    user.isPaymentVerified = true;

    await user.save();

    const updatedCardInfo = {
      last4: user.cardLast4,
      brand: user.cardBrand,
      expMonth: user.cardExpMonth,
      expYear: user.cardExpYear,
    };

    res.status(200).json({
      success: true,
      message: `Payment method updated successfully. ${cancelledCount} pending authorizations cancelled.`,
      data: {
        card: updatedCardInfo,
        isPaymentVerified: true,
        userType: user.userType,
        stripeCustomerId: user.stripeCustomerId,
        cancelledAuthorizations: cancelledCount,
      },
    });
  } catch (error) {
    console.error("Update payment method error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update payment method",
    });
  }
};

// Upload identification document
export const uploadIdentification = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Only JPG, PNG, and PDF are allowed",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user can upload (only if rejected or not verified)
    if (user.identificationStatus === "verified") {
      return res.status(400).json({
        success: false,
        message: "Your identity is already verified",
      });
    }

    // If user had previous document, delete it from Cloudinary
    if (user.identificationDocumentPublicId) {
      try {
        await deleteFromCloudinary(user.identificationDocumentPublicId, "raw");
      } catch (deleteError) {
        console.error("Failed to delete old document:", deleteError);
        // Continue with upload even if delete fails
      }
    }

    // Upload new document to Cloudinary
    const isImage = file.mimetype.startsWith("image/");
    let uploadResult;

    if (isImage) {
      uploadResult = await uploadImageToCloudinary(
        file.buffer,
        "identification-documents",
      );
    } else {
      uploadResult = await uploadDocumentToCloudinary(
        file.buffer,
        file.originalname,
        "identification-documents",
      );
    }

    // Update user with new document info
    user.identificationDocument = uploadResult.secure_url;
    user.identificationDocumentPublicId = uploadResult.public_id;
    user.identificationStatus = "pending";
    user.identificationRejectionReason = null; // Clear any previous rejection reason
    user.identificationVerifiedAt = null;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Identification document uploaded successfully",
      data: {
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    console.error("Upload identification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload identification document",
    });
  }
};

// Get user's verification status
export const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "identificationDocument identificationStatus identificationVerifiedAt identificationRejectionReason",
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
        status: user.identificationStatus || "not_uploaded",
        documentUrl: user.identificationDocument,
        verifiedAt: user.identificationVerifiedAt,
        rejectionReason: user.identificationRejectionReason,
      },
    });
  } catch (error) {
    console.error("Get verification status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch verification status",
    });
  }
};

// Delete identification document
export const deleteIdentification = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Only allow deletion if status is rejected or pending
    if (user.identificationStatus === "verified") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete verified document",
      });
    }

    // Delete from Cloudinary
    if (user.identificationDocumentPublicId) {
      try {
        await deleteFromCloudinary(user.identificationDocumentPublicId, "raw");
      } catch (deleteError) {
        console.error("Failed to delete from Cloudinary:", deleteError);
      }
    }

    // Clear document fields
    user.identificationDocument = null;
    user.identificationDocumentPublicId = null;
    user.identificationStatus = null;
    user.identificationRejectionReason = null;
    user.identificationVerifiedAt = null;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Identification document deleted successfully",
      data: {
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    console.error("Delete identification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete identification document",
    });
  }
};

// Add this function
// export const getSellers = async (req, res) => {
//   try {
//     const { page = 1, limit = 12, search = '', location = '' } = req.query;

//     const filter = { userType: { $in: ['seller', 'broker'] }, isActive: true };

//     if (search) {
//       filter.$or = [
//         { firstName: { $regex: search, $options: 'i' } },
//         { lastName: { $regex: search, $options: 'i' } },
//         { username: { $regex: search, $options: 'i' } },
//         { email: { $regex: search, $options: 'i' } },
//         { companyName: { $regex: search, $options: 'i' } },
//       ];
//     }

//     if (location) {
//       filter['address.city'] = { $regex: location, $options: 'i' };
//       // or use country, state, etc.
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     // Aggregate to get auction count for each seller (optional)
//     const sellers = await User.aggregate([
//       { $match: filter },
//       {
//         $lookup: {
//           from: 'auctions',
//           localField: '_id',
//           foreignField: 'seller',
//           as: 'auctions'
//         }
//       },
//       {
//         $addFields: {
//           auctionCount: { $size: '$auctions' },
//           // optionally total revenue or average rating
//         }
//       },
//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: parseInt(limit) },
//       {
//         $project: {
//           password: 0,
//           refreshToken: 0,
//           resetPasswordToken: 0,
//           resetPasswordTokenExpiry: 0,
//           emailVerificationToken: 0,
//           emailVerificationExpiry: 0,
//           identificationDocument: 0,
//           identificationDocumentPublicId: 0,
//           payoutMethods: 0,
//         }
//       }
//     ]);

//     const total = await User.countDocuments(filter);

//     res.status(200).json({
//       success: true,
//       data: {
//         sellers,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages: Math.ceil(total / limit),
//           totalSellers: total,
//         }
//       }
//     });
//   } catch (error) {
//     console.error('Get sellers error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error while fetching sellers'
//     });
//   }
// };

export const getSellers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = "",
      location = "",
    } = req.query;

    const filter = {
      userType: { $in: ["seller", "broker"] },
      isActive: true,
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
      ];
    }

    if (location) {
      filter["address.city"] = {
        $regex: location,
        $options: "i",
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sellers = await User.aggregate([
      // --------------------------------------------------
      // 1. Find sellers
      // --------------------------------------------------
      {
        $match: filter,
      },

      // --------------------------------------------------
      // 2. Get their auctions
      // --------------------------------------------------
      {
        $lookup: {
          from: "auctions",
          let: { sellerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$seller", "$$sellerId"],
                },
              },
            },
            {
              $project: {
                status: 1,
                bidCount: 1,
                finalPrice: 1,
                currentPrice: 1,
              },
            },
          ],
          as: "auctions",
        },
      },

      // --------------------------------------------------
      // 3. Calculate seller statistics
      // --------------------------------------------------
      {
        $addFields: {
          // Total listings excluding drafts
          listedCount: {
            $size: {
              $filter: {
                input: "$auctions",
                as: "auction",
                cond: {
                  $ne: ["$$auction.status", "draft"],
                },
              },
            },
          },

          // Currently active
          activeCount: {
            $size: {
              $filter: {
                input: "$auctions",
                as: "auction",
                cond: {
                  $eq: ["$$auction.status", "active"],
                },
              },
            },
          },

          // Successfully sold
          soldCount: {
            $size: {
              $filter: {
                input: "$auctions",
                as: "auction",
                cond: {
                  $in: [
                    "$$auction.status",
                    ["sold", "sold_buy_now"],
                  ],
                },
              },
            },
          },

          // Auctions that have reached an outcome
          completedCount: {
            $size: {
              $filter: {
                input: "$auctions",
                as: "auction",
                cond: {
                  $in: [
                    "$$auction.status",
                    [
                      "sold",
                      "sold_buy_now",
                      "ended",
                      "reserve_not_met",
                    ],
                  ],
                },
              },
            },
          },

          // Total bids received
          totalBids: {
            $sum: {
              $map: {
                input: "$auctions",
                as: "auction",
                in: {
                  $ifNull: ["$$auction.bidCount", 0],
                },
              },
            },
          },

          // Total sales value
          totalSalesValue: {
            $sum: {
              $map: {
                input: "$auctions",
                as: "auction",
                in: {
                  $cond: [
                    {
                      $in: [
                        "$$auction.status",
                        ["sold", "sold_buy_now"],
                      ],
                    },
                    {
                      $ifNull: [
                        "$$auction.finalPrice",
                        "$$auction.currentPrice",
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },

      // --------------------------------------------------
      // 4. Success percentage
      // --------------------------------------------------
      {
        $addFields: {
          successRate: {
            $cond: [
              { $gt: ["$completedCount", 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$soldCount",
                          "$completedCount",
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              null,
            ],
          },
        },
      },

      // --------------------------------------------------
      // 5. Don't expose sensitive information
      // --------------------------------------------------
      {
        $project: {
          password: 0,
          refreshToken: 0,
          resetPasswordToken: 0,
          resetPasswordTokenExpiry: 0,
          emailVerificationToken: 0,
          emailVerificationExpiry: 0,
          identificationDocument: 0,
          identificationDocumentPublicId: 0,
          payoutMethods: 0,
          auctions: 0,
        },
      },

      // --------------------------------------------------
      // 6. Sort / paginate
      // --------------------------------------------------
      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $skip: skip,
      },

      {
        $limit: parseInt(limit),
      },
    ]);

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        sellers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalSellers: total,
        },
      },
    });
  } catch (error) {
    console.error("Get sellers error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching sellers",
    });
  }
};

export const getUserPublic = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const user = await User.findById(userId)
            .select(
                '-password -refreshToken -resetPasswordToken ' +
                '-emailVerificationToken -payoutMethods -identificationDocument'
            )
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // =====================================================
        // SINGLE AGGREGATION — auctions + products split
        // =====================================================

        const stats = await Auction.aggregate([
            { $match: { seller: user._id } },
            {
                $group: {
                    _id: null,

                    // ---- AUCTIONS (excludes buy_now) ----
                    auctionListed: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $ne: ['$status', 'draft'] },
                                    { $ne: ['$auctionType', 'buy_now'] },
                                ]},
                                1, 0,
                            ],
                        },
                    },
                    auctionActive: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ['$status', 'active'] },
                                    { $ne: ['$auctionType', 'buy_now'] },
                                ]},
                                1, 0,
                            ],
                        },
                    },
                    auctionSold: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $in: ['$status', ['sold', 'sold_buy_now']] },
                                    { $ne: ['$auctionType', 'buy_now'] },
                                ]},
                                1, 0,
                            ],
                        },
                    },
                    auctionCompleted: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $in: ['$status', ['sold', 'sold_buy_now', 'ended', 'reserve_not_met']] },
                                    { $ne: ['$auctionType', 'buy_now'] },
                                ]},
                                1, 0,
                            ],
                        },
                    },
                    auctionBids: {
                        $sum: {
                            $cond: [
                                { $ne: ['$auctionType', 'buy_now'] },
                                { $ifNull: ['$bidCount', 0] },
                                0,
                            ],
                        },
                    },
                    auctionRevenue: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $in: ['$status', ['sold', 'sold_buy_now']] },
                                    { $ne: ['$auctionType', 'buy_now'] },
                                ]},
                                { $ifNull: ['$finalPrice', 0] },
                                0,
                            ],
                        },
                    },

                    // ---- PRODUCTS (buy_now only) ----
                    productListed: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $ne: ['$status', 'draft'] },
                                    { $eq: ['$auctionType', 'buy_now'] },
                                ]},
                                1, 0,
                            ],
                        },
                    },
                    productActive: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ['$status', 'active'] },
                                    { $eq: ['$auctionType', 'buy_now'] },
                                ]},
                                1, 0,
                            ],
                        },
                    },
                    productSold: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $in: ['$status', ['sold', 'sold_buy_now']] },
                                    { $eq: ['$auctionType', 'buy_now'] },
                                ]},
                                1, 0,
                            ],
                        },
                    },
                    productCompleted: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $in: ['$status', ['sold', 'sold_buy_now', 'cancelled']] },
                                    { $eq: ['$auctionType', 'buy_now'] },
                                ]},
                                1, 0,
                            ],
                        },
                    },
                    productRevenue: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $in: ['$status', ['sold', 'sold_buy_now']] },
                                    { $eq: ['$auctionType', 'buy_now'] },
                                ]},
                                { $ifNull: ['$finalPrice', 0] },
                                0,
                            ],
                        },
                    },
                },
            },
        ]);

        const s = stats[0] || {};

        // =====================================================
        // COMBINED STATS — used by SellerCard & the profile hero
        // =====================================================

        const combinedListed = (s.auctionListed || 0) + (s.productListed || 0);
        const combinedActive = (s.auctionActive || 0) + (s.productActive || 0);
        const combinedSold = (s.auctionSold || 0) + (s.productSold || 0);
        const combinedCompleted = (s.auctionCompleted || 0) + (s.productCompleted || 0);

        const combinedSuccessRate = combinedCompleted > 0
            ? Math.round((combinedSold / combinedCompleted) * 100)
            : 0;

        const combinedRevenue =
            (s.auctionRevenue || 0) + (s.productRevenue || 0);

        // =====================================================
        // ATTACH STATS
        // =====================================================

        user.stats = {
            // Combined (top-level, backward compatible)
            listed: combinedListed,
            active: combinedActive,
            sold: combinedSold,
            completed: combinedCompleted,
            successRate: combinedSuccessRate,
            revenue: combinedRevenue,
            totalBids: s.auctionBids || 0,

            // SellerCard aliases (it reads listedCount / activeCount / soldCount)
            listedCount: combinedListed,
            activeCount: combinedActive,
            soldCount: combinedSold,
            completedCount: combinedCompleted,

            // Split — used on the seller profile page
            auctions: {
                listed: s.auctionListed || 0,
                active: s.auctionActive || 0,
                sold: s.auctionSold || 0,
                completed: s.auctionCompleted || 0,
                bids: s.auctionBids || 0,
                revenue: s.auctionRevenue || 0,
            },
            products: {
                listed: s.productListed || 0,
                active: s.productActive || 0,
                sold: s.productSold || 0,
                completed: s.productCompleted || 0,
                revenue: s.productRevenue || 0,
            },
        };

        return res.status(200).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        console.error('Get public user error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};