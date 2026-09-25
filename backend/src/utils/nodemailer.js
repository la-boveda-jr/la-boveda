import nodemailer from "nodemailer";
import Commission from "../models/commission.model.js";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Add connection verification
transporter.verify(function (error, success) {
    if (error) {
        console.log("SMTP Connection failed:", error);
    } else {
        console.log("SMTP Server is ready");
    }
});

// ============================================
// LA-BOVEDA BRANDING CONFIGURATION
// ============================================

// Brand colors (Gold & Navy)
const BRAND_COLORS = {
    primary: '#D19F3E',      // Gold - main brand color
    primaryLight: '#E0B05E',  // Lighter gold
    primaryDark: '#B88A2E',   // Darker gold
    secondary: '#072342',     // Navy blue - secondary brand color
    secondaryLight: '#1A3A5C', // Lighter navy
    secondaryDark: '#051A32',  // Darker navy
    grayBg: '#f8f9fa',
    grayBorder: '#e9ecef',
    text: '#1f2937',
    textLight: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
};

// Brand text variables
const BRAND_NAME = 'La-Boveda';
const BRAND_TAGLINE = 'TU PASIÓN, NUESTRO TESORO.';

// Contact/Support info
const SUPPORT_EMAIL = process.env.EMAIL_USER;
const SUPPORT_PHONE = '';
const COMPANY_LOCATION = 'Venezuela';

// URLs
const FRONTEND_URL = 'https://la-boveda.com';
const ADMIN_URL = `${FRONTEND_URL}/admin`;

// ============================================
// DYNAMIC SPECIFICATIONS RENDERER
// ============================================

const renderSpecifications = (specifications) => {
    if (!specifications) return '';

    let entries = [];
    if (specifications instanceof Map) {
        if (specifications.size === 0) return '';
        entries = Array.from(specifications.entries());
    } else if (typeof specifications === 'object') {
        entries = Object.entries(specifications);
    }

    if (entries.length === 0) return '';

    let html = '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">';
    entries.forEach(([key, value]) => {
        const label = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^\w/, c => c.toUpperCase());

        html += `
            <tr style="border-bottom: 1px solid ${BRAND_COLORS.grayBorder};">
                <td style="padding: 8px 12px; font-weight: 600; color: ${BRAND_COLORS.secondary}; width: 40%;">${label}:</td>
                <td style="padding: 8px 12px; color: ${BRAND_COLORS.text};">${value}</td>
            </tr>
        `;
    });
    html += '</table>';
    return html;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format currency in USD
const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0';
    return `$${Number(amount).toFixed(0).toLocaleString('en-US')}`;
};

// ============================================
// LISTING LABEL HELPER
// Products (buy_now) get "Product" wording, others get "Auction"
// ============================================

const getListingLabel = (listing) =>
    listing?.auctionType === "buy_now" ? "Product" : "Auction";

const getListingLabelLower = (listing) =>
    listing?.auctionType === "buy_now" ? "product" : "auction";

// Get time remaining
const getTimeRemaining = (endDate) => {
    if (!endDate) return 'Time not available';
    const remaining = new Date(endDate) - new Date();
    if (remaining <= 0) return 'Ended';
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

// Info card
const createInfoCard = (content, variant = 'default') => {
    const variants = {
        default: `background: ${BRAND_COLORS.grayBg}; border: 1px solid ${BRAND_COLORS.grayBorder}; border-radius: 12px; padding: 20px; margin: 20px 0;`,
        warning: `background: #fffbeb; border-left: 4px solid ${BRAND_COLORS.warning}; padding: 16px; border-radius: 8px; margin: 20px 0;`,
        success: `background: #f0fdf4; border-left: 4px solid ${BRAND_COLORS.success}; padding: 16px; border-radius: 8px; margin: 20px 0;`
    };
    return `<div style="${variants[variant]}">${content}</div>`;
};

// Summary row
const createSummaryRow = (label, value) => `
    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid ${BRAND_COLORS.grayBorder};">
        <span style="font-weight: 600; color: ${BRAND_COLORS.secondary};">${label}</span>
        <span style="color: ${BRAND_COLORS.text};">${value}</span>
    </div>
`;

// URL box
const createUrlBox = (url) => `
    <div style="background: ${BRAND_COLORS.grayBg}; padding: 12px 16px; border-radius: 12px; font-family: monospace; font-size: 13px; word-break: break-all; margin: 16px 0; border: 1px solid ${BRAND_COLORS.grayBorder};">
        ${url}
    </div>
`;

// Button generator
const createButton = (text, url, variant = 'primary') => {
    const colors = {
        primary: `background: ${BRAND_COLORS.primary}; color: #ffffff;`,
        secondary: `background: ${BRAND_COLORS.secondary}; color: #ffffff;`,
        outline: `background: transparent; border: 2px solid ${BRAND_COLORS.primary}; color: ${BRAND_COLORS.primary};`
    };
    return `
        <div style="text-align: center; margin: 20px 0;">
            <a href="${url}" style="display: inline-block; ${colors[variant]} padding: 12px 28px; text-decoration: none; border-radius: 40px; font-weight: 600; font-size: 15px;">
                ${text}
            </a>
        </div>
    `;
};

// ============================================
// BASE EMAIL TEMPLATE
// ============================================

const baseTemplate = (content, title = BRAND_NAME) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            background-color: #f4f6f9;
            color: ${BRAND_COLORS.text};
        }
        .container {
            max-width: 560px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.02);
        }
        .content {
            padding: 32px 40px;
        }
        @media (max-width: 600px) {
            .content {
                padding: 24px 20px;
            }
        }
        .footer {
            background: ${BRAND_COLORS.grayBg};
            padding: 24px 40px;
            text-align: center;
            color: ${BRAND_COLORS.textLight};
            font-size: 12px;
            border-top: 1px solid ${BRAND_COLORS.grayBorder};
        }
        .footer a {
            color: ${BRAND_COLORS.primary};
            text-decoration: none;
            margin: 0 8px;
        }
        .divider {
            height: 1px;
            background: ${BRAND_COLORS.grayBorder};
            margin: 24px 0;
        }
        h2 {
            font-size: 22px;
            text-align: center;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: ${BRAND_COLORS.secondary};
        }
        h3 {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 12px 0;
            color: ${BRAND_COLORS.secondary};
        }
        a {
            color: ${BRAND_COLORS.primary};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <!-- La-Boveda Header -->
            <div style="text-align: center; margin-bottom: 28px;">
                <h1 style="color: ${BRAND_COLORS.secondary}; font-size: 32px; margin: 0; letter-spacing: -0.5px;">${BRAND_NAME}</h1>
                <div style="width: 60px; height: 3px; background: ${BRAND_COLORS.primary}; margin: 12px auto 0;"></div>
                <p style="color: ${BRAND_COLORS.textLight}; font-size: 13px; margin: 12px 0 0 0;">${BRAND_TAGLINE}</p>
            </div>
            ${content}
        </div>
        <div class="footer">
            <p style="margin: 0 0 12px 0;">${BRAND_NAME} · Support Team</p>
            <p style="margin: 0 0 12px 0;">${COMPANY_LOCATION} | <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
            <p style="margin: 0;">
                <a href="${FRONTEND_URL}/contact">Help Center</a> ·
                <a href="${FRONTEND_URL}/privacy-policy">Privacy Policy</a>
            </p>
            <p style="margin: 20px 0 0 0; font-size: 11px;">© ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

// ============================================
// EMAIL TEMPLATES (all updated to La-Boveda, USD only)
// ============================================

// 1. Contact email for admin
const contactEmail = async (name, email, phone, userType = "Bidder", message) => {
    try {
        const content = `
            <h2 style="text-align: center;">New Contact Form Submission</h2>
            ${createInfoCard(`
                ${createSummaryRow('Full Name:', name)}
                ${createSummaryRow('Email:', `<a href="mailto:${email}" style="color: ${BRAND_COLORS.primary};">${email}</a>`)}
                ${createSummaryRow('Phone:', phone || 'Not provided')}
                ${createSummaryRow('User Type:', userType)}
            `)}
            <div style="margin: 20px 0;">
                <strong style="color: ${BRAND_COLORS.secondary};">Message:</strong>
                <div style="background: ${BRAND_COLORS.grayBg}; padding: 16px; border-radius: 8px; margin-top: 8px; border: 1px solid ${BRAND_COLORS.grayBorder};">
                    ${message}
                </div>
            </div>
            <div style="margin-top: 25px; padding: 15px; background: ${BRAND_COLORS.grayBg}; border-radius: 8px; border-left: 4px solid ${BRAND_COLORS.primary};">
                <p style="margin: 0; color: ${BRAND_COLORS.secondary}; font-size: 14px;">
                    <strong>Recommended Action:</strong> Respond within 24 hours for best customer engagement.
                </p>
            </div>
        `;
        const html = baseTemplate(content, 'New Contact Query');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `New Contact Query - ${name}`,
            html
        });
        return !!info;
    } catch (error) {
        throw new Error(error);
    }
};

// 2. Contact confirmation email to user
const contactConfirmationEmail = async (name, email) => {
    try {
        const content = `
            <h2 style="text-align: center;">Thank You for Contacting Us</h2>
            ${createInfoCard(`
                <p style="margin: 0 0 16px 0; font-size: 18px; color: ${BRAND_COLORS.secondary};">Dear ${name},</p>
                <p style="margin: 0 0 16px 0;">Thank you for reaching out to <strong>${BRAND_NAME}</strong>. We have successfully received your inquiry and appreciate you taking the time to contact us.</p>
                <p style="margin: 0 0 16px 0;">Our dedicated team is currently reviewing your message and will get back to you within <strong>24-48 hours</strong>.</p>
                <p style="margin: 0;">We're committed to providing you with the best possible service and look forward to assisting you with your marketplace needs.</p>
            `, 'default')}
            <div style="background: ${BRAND_COLORS.secondary}; color: #ffffff; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <div style="color: ${BRAND_COLORS.primary}; font-size: 18px; margin-bottom: 10px; font-weight: bold;">Need Immediate Assistance?</div>
                <div style="font-size: 14px; margin-bottom: 15px; opacity: 0.9;">If your inquiry requires urgent attention, please contact our support team directly for faster service.</div>
            </div>
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 14px; border: 1px solid ${BRAND_COLORS.grayBorder};">
                <p style="margin: 0 0 8px 0;"><strong style="color: ${BRAND_COLORS.secondary};">Phone Support:</strong> Available Monday-Friday, 9:00 AM - 6:00 PM</p>
                <p style="margin: 0;"><strong style="color: ${BRAND_COLORS.secondary};">Email Support:</strong> <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.primary};">${SUPPORT_EMAIL}</a></p>
            </div>
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid ${BRAND_COLORS.grayBorder};">
                <p style="margin: 5px 0;">Best regards,</p>
                <p style="margin: 5px 0;"><strong>The ${BRAND_NAME} Team</strong></p>
            </div>
        `;
        const html = baseTemplate(content, 'Thank You');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Thank You for Contacting ${BRAND_NAME}`,
            html
        });
        return !!info;
    } catch (error) {
        throw new Error(error);
    }
};

// 3. Welcome email for user
const welcomeEmail = async (user) => {
    try {
        const content = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="text-align: center;">Welcome to ${BRAND_NAME}, ${user.firstName || user.companyName || user.username}!</h2>
            </div>
            <p>We're thrilled to welcome you to ${BRAND_NAME}. Your ${user.userType || 'bidder'} account has been successfully created.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0;"><strong>Account Details</strong></p>
                ${createSummaryRow('Name:', `${user.firstName || ''} ${user.lastName || ''}`)}
                ${createSummaryRow('Email:', user.email)}
                ${createSummaryRow('Account Type:', user.userType || 'Bidder')}
            `)}
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Go to Profile', `${FRONTEND_URL}/${user?.userType || 'bidder'}/profile`, 'primary')}
            </div>
            <div style="text-align: center; margin: 15px 0;">
                ${createButton('Browse Auctions', `${FRONTEND_URL}/auctions`, 'outline')}
            </div>
            <div style="text-align: center; margin: 15px 0;">
                ${createButton('Browse Products', `${FRONTEND_URL}/products`, 'outline')}
            </div>
            <p>Need help getting started? Check out our FAQ section or contact our support team - we're here to help!</p>
        `;
        const html = baseTemplate(content, `Welcome, ${user.firstName || user.companyName || user.username}`);
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Welcome to ${BRAND_NAME}, ${user.firstName || user.companyName || user.username}!`,
            html
        });
        console.log(`Welcome email sent to ${user.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send welcome email:`, error);
        return false;
    }
};

// 4. New user registered for admin
const newUserRegistrationEmail = async (adminEmail, user) => {
    try {
        const userTypeDisplay = (user.userType || "bidder").charAt(0).toUpperCase() + (user.userType || "bidder").slice(1);
        const content = `
            <h2 style="text-align: center;">New User Registration</h2>
            <p style="text-align: center;">A new user has successfully registered on ${BRAND_NAME}.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0;"><strong>User Information</strong></p>
                ${createSummaryRow('Full Name:', `${user.firstName || ''} ${user.lastName || ''}`)}
                ${createSummaryRow('Username:', user.username || user.companyName || 'Not provided')}
                ${createSummaryRow('Email:', user.email)}
                ${createSummaryRow('Account Type:', userTypeDisplay)}
                ${createSummaryRow('Phone Number:', user.phone || 'Not provided')}
                ${createSummaryRow('Country:', user.countryName || 'Not provided')}
            `)}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
                <p style="margin: 0 0 12px 0;"><strong>Admin Actions</strong></p>
                <p style="margin: 0 0 16px 0;">You can review this user's account, verify their details, or take necessary actions from the admin panel.</p>
                <div style="text-align: center;">
                    ${createButton('Go to User Management', `${FRONTEND_URL}/admin/users`, 'secondary')}
                </div>
            </div>
        `;
        const html = baseTemplate(content, 'New User Registration');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `New User Registration - ${userTypeDisplay}`,
            html
        });
        console.log(`New user registration email sent to admin for ${user.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send new user registration email:`, error);
        return false;
    }
};

// 5. Reset password email
const resetPasswordEmail = async (email, url) => {
    try {
        const content = `
            <h2 style="text-align: center;">Password Reset Request</h2>
            <p style="text-align: center;">We received a request to reset your ${BRAND_NAME} password.</p>
            ${createInfoCard(`
                <p>To reset your password, please click the button below. This link will expire in <strong>1 hour</strong> for security purposes.</p>
                ${createButton('Reset Password Now', url, 'primary')}
                <p style="margin-top: 16px; margin-bottom: 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
                ${createUrlBox(url)}
            `, 'warning')}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid ${BRAND_COLORS.grayBorder};">
                <p style="margin: 0 0 12px 0;"><strong>Create a Secure Password</strong></p>
                <p style="margin: 0 0 8px 0;">• Use at least 8 characters</p>
                <p style="margin: 0 0 8px 0;">• Include uppercase and lowercase letters</p>
                <p style="margin: 0 0 8px 0;">• Add numbers and special characters</p>
                <p style="margin: 0 0 8px 0;">• Avoid using personal information</p>
                <p style="margin: 0;">• Don't reuse passwords from other websites</p>
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
                <p style="margin: 0;"><strong>Important Security Notice:</strong> If you did NOT request this password reset, please ignore this email. Your account remains secure.</p>
            </div>
            <p>After resetting your password, you can log in to your ${BRAND_NAME} account and continue browsing our diverse selection of items.</p>
        `;
        const html = baseTemplate(content, 'Password Reset');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Reset Your ${BRAND_NAME} Password`,
            html
        });
        return !!info;
    } catch (error) {
        throw new Error(`Failed to send reset password email: ${error.message}`);
    }
};

// 6. Auction submitted for admin approval
const auctionSubmittedForApprovalEmail = async (adminEmail, auction, seller) => {
    try {
        const label = getListingLabel(auction);
        const content = `
            <h2 style="text-align: center;">New ${label} Awaiting Approval</h2>
            <p style="text-align: center;">A seller has submitted a new ${label.toLowerCase()} for review. It requires your approval before it can go live.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0;"><strong>${label} Information</strong></p>
                ${createSummaryRow('Title:', auction.title)}
                ${auction.subTitle ? createSummaryRow('Subtitle:', auction.subTitle) : ''}
                ${createSummaryRow('Categories:', auction?.categories?.join(', ') || 'N/A')}
                ${createSummaryRow('Location:', auction?.location || 'Not specified')}
                ${createSummaryRow('Type:', label)}
                ${auction?.auctionType !== 'buy_now' && auction?.allowOffers ? createSummaryRow('Offers:', 'Allowed') : ''}
            `)}
            ${auction.specifications ? `
                <div style="margin: 20px 0;">
                    <strong style="color: ${BRAND_COLORS.secondary};">Item Specifications</strong>
                    ${renderSpecifications(auction.specifications)}
                </div>
            ` : ''}
            ${auction.description ? `
                <div style="background: ${BRAND_COLORS.grayBg}; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid ${BRAND_COLORS.grayBorder};">
                    <strong style="color: ${BRAND_COLORS.secondary};">Item Description</strong>
                    <p style="margin: 8px 0 0 0;">${auction.description.substring(0, 200)}${auction.description.length > 200 ? '...' : ''}</p>
                </div>
            ` : ''}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
                <p style="margin: 0 0 12px 0;"><strong>Seller Information</strong></p>
                ${createSummaryRow('Name:', `${seller.firstName || seller.companyName || seller.username} ${seller.lastName || ''}`)}
                ${createSummaryRow('Username:', seller.username || seller.companyName)}
            </div>
            <div style="background: ${BRAND_COLORS.secondary}; color: #ffffff; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <p style="margin: 0 0 12px 0;"><strong>Admin Action Required</strong></p>
                <p style="margin: 0 0 16px 0;">Please review this ${label.toLowerCase()} to ensure timely activation.</p>
                ${createButton(`Review ${label}s`, `${FRONTEND_URL}/admin/${auction?.auctionType === 'buy_now' ? 'products' : 'auctions'}/all`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, `${label} Approval Required`);
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `New ${label} for Approval - ${auction.title}`,
            html
        });
        console.log(`${label} submission email sent to admin for ${auction._id}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send listing submission email:`, error);
        return false;
    }
};

// 7. Auction approved and live for seller
const auctionApprovedEmail = async (seller, listing) => {
    try {
        const label = getListingLabel(listing);
        const isProduct = listing?.auctionType === 'buy_now';
        const url = `${FRONTEND_URL}/${isProduct ? 'product' : 'auction'}/${listing?._id}`;
        const content = `
            <h2 style="text-align: center;">${label} Approved and Live</h2>
            <p style="text-align: center;">Great news! Your ${label.toLowerCase()} has been approved and is now live on ${BRAND_NAME}.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0;"><strong>${label} Details</strong></p>
                ${createSummaryRow('Title:', listing.title)}
                ${listing.subTitle ? createSummaryRow('Subtitle:', listing.subTitle) : ''}
                ${createSummaryRow('Type:', label)}
                ${!isProduct && listing?.allowOffers ? createSummaryRow('Offers:', 'Allowed') : ''}
                ${!isProduct && listing?.buyNowPrice ? createSummaryRow('Buy Now Price:', formatCurrency(listing.buyNowPrice)) : ''}
                ${createSummaryRow('Price:', formatCurrency(isProduct ? listing?.buyNowPrice : listing?.startPrice))}
            `)}
            ${listing.specifications && listing.specifications.size > 0 ? `
                <div style="margin: 20px 0;">
                    <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                    ${renderSpecifications(listing.specifications)}
                </div>
            ` : ''}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 12px 16px; border-radius: 12px; margin: 20px 0; word-break: break-all;">
                <strong>Your ${label} URL:</strong><br>
                <a href="${url}" style="color: ${BRAND_COLORS.primary};">${url}</a>
            </div>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton(`View Your Live ${label}`, url, 'primary')}
            </div>
            <p>Your item is now searchable and visible to our community. We wish you a quick and successful sale!</p>
            <p>For any questions about the selling process or if you need assistance, our support team is here to help.</p>
        `;
        const html = baseTemplate(content, `${label} Approved`);
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: seller.email,
            subject: `Your ${label} is Live: ${listing?.title}`,
            html
        });
        console.log(`${label} approved email sent to seller ${seller.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send listing approved email:`, error);
        return false;
    }
};

// 8. Auction listed and live for seller
const auctionListedEmail = async (listing, seller) => {
    try {
        const label = getListingLabel(listing);
        const isProduct = listing?.auctionType === 'buy_now';
        const url = `${FRONTEND_URL}/${isProduct ? 'product' : 'auction'}/${listing?._id}`;
        const content = `
            <h2>Your ${label} is Now Live</h2>
            <p>Great news! Your ${label.toLowerCase()} is now active and visible to potential buyers on ${BRAND_NAME}.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0;"><strong>${label} Details</strong></p>
                ${createSummaryRow('Title:', listing.title)}
                ${listing.subTitle ? createSummaryRow('Subtitle:', listing.subTitle) : ''}
                ${createSummaryRow('Type:', label)}
                ${!isProduct && listing?.allowOffers ? createSummaryRow('Offers:', 'Allowed') : ''}
                ${!isProduct && listing?.buyNowPrice ? createSummaryRow('Buy Now Price:', formatCurrency(listing.buyNowPrice)) : ''}
                ${createSummaryRow('Price:', formatCurrency(isProduct ? listing?.buyNowPrice : listing?.startPrice))}
            `)}
            ${listing.specifications && listing.specifications.size > 0 ? `
                <div style="margin: 20px 0;">
                    <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                    ${renderSpecifications(listing.specifications)}
                </div>
            ` : ''}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 12px 16px; border-radius: 12px; margin: 20px 0; word-break: break-all;">
                <strong>Your ${label} URL:</strong><br>
                <a href="${url}" style="color: ${BRAND_COLORS.primary};">${url}</a>
            </div>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton(`View Your Live ${label}`, url, 'primary')}
            </div>
            <p>We wish you a quick and successful sale!</p>
        `;
        const html = baseTemplate(content, `${label} Live`);
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: seller.email,
            subject: `Your ${label} is Live on ${BRAND_NAME}: ${listing?.title}`,
            html
        });
        console.log(`${label} live email sent to seller ${seller?.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send listing live email:`, error);
        return false;
    }
};

// 9. New auction listed notification for bidders
const newAuctionNotificationEmail = async (bidder, listing, seller) => {
    try {
        const label = getListingLabel(listing);
        const isProduct = listing?.auctionType === 'buy_now';
        const url = `${FRONTEND_URL}/${isProduct ? 'product' : 'auction'}/${listing?._id}`;
        const isLive = listing?.status === "active" || listing?.status === "approved";
        const listingStatus = isLive ? "Live Now" : "Coming Soon";
        let primaryAction = "View Details";
        if (isLive) {
            if (isProduct && listing?.buyNowPrice) {
                primaryAction = "Buy Now";
            } else if (listing.allowOffers) {
                primaryAction = "Make Offer";
            } else {
                primaryAction = "View Details";
            }
        }
        const content = `
            <h2 style="text-align: center;">New ${label}: ${listing?.title}</h2>
            <p style="text-align: center;">We're excited to let you know about a new ${label.toLowerCase()} on ${BRAND_NAME}.</p>
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-size: 14px; font-weight: bold; color: ${BRAND_COLORS.secondary};">
                ${listingStatus}
            </div>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0;"><strong>${label} Details</strong></p>
                ${createSummaryRow('Title:', listing.title)}
                ${listing.subTitle ? createSummaryRow('Subtitle:', listing.subTitle) : ''}
                ${createSummaryRow('Categories:', listing?.categories?.join(', ') || 'N/A')}
                ${createSummaryRow('Location:', listing?.location || 'Not specified')}
                ${createSummaryRow('Type:', label)}
                ${!isProduct && listing?.allowOffers ? createSummaryRow('Offers:', 'Allowed') : ''}
            `)}
            ${listing.specifications && listing.specifications.size > 0 ? `
                <div style="margin: 20px 0;">
                    <strong style="color: ${BRAND_COLORS.secondary};">Item Specifications</strong>
                    ${renderSpecifications(listing.specifications)}
                </div>
            ` : ''}
            ${listing?.description ? `
                <div style="background: ${BRAND_COLORS.grayBg}; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid ${BRAND_COLORS.grayBorder};">
                    <strong style="color: ${BRAND_COLORS.secondary};">Item Description</strong>
                    <p style="margin: 8px 0 0 0;">${listing?.description.substring(0, 200)}${listing?.description.length > 200 ? '...' : ''}</p>
                </div>
            ` : ''}
            ${isLive ? `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
                    <p style="margin: 0; font-weight: bold;">Available Now</p>
                    <p style="margin: 8px 0 0 0;">${isProduct
                    ? "Buy it immediately at the listed price."
                    : listing?.buyNowPrice
                        ? "Use Buy Now to secure it immediately or place a bid."
                        : listing?.allowOffers
                            ? "Make an offer to start negotiations."
                            : "Place a bid to compete for this item."
                }</p>
                </div>
            ` : `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
                    <p style="margin: 0; font-weight: bold;">Coming Soon</p>
                    <p style="margin: 8px 0 0 0;">This item will be available shortly.</p>
                </div>
            `}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Seller Information</strong></p>
                <p style="margin: 0;">${seller?.companyName || seller?.username}</p>
                <p style="margin: 0;">${seller?.firstName} ${seller?.lastName}</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton(primaryAction, url, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, `New ${label}`);
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: bidder.email,
            subject: `New ${label}: ${listing?.title}`,
            html
        });
        console.log(`New ${label} notification sent to bidder ${bidder?.email} for listing ${listing?._id}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send new listing notification:`, error);
        return false;
    }
};

// 10. Bulk send new listing notifications
const sendBulkAuctionNotifications = async (bidders, listing, seller) => {
    try {
        const notificationPromises = bidders?.map(async (bidder) => {
            try {
                if (bidder?.preferences) {
                    await newAuctionNotificationEmail(bidder, listing, seller);
                    return { success: true, email: bidder.email };
                }
                return { success: false, email: bidder?.email, reason: "Notifications disabled" };
            } catch (error) {
                console.error(`Failed to send notification to ${bidder?.email}:`, error.message);
                return { success: false, email: bidder?.email, error: error.message };
            }
        });
        const results = await Promise.allSettled(notificationPromises);
        const successful = results.filter(result => result.status === "fulfilled" && result.value.success).length;
        const failed = results.filter(result => result.status === "fulfilled" && !result.value.success).length;
        const errors = results.filter(result => result.status === "rejected").length;
        console.log(`Bulk listing notifications completed: ${successful} successful, ${failed} skipped/failed, ${errors} errors`);
        return { total: bidders.length, successful, failed, errors };
    } catch (error) {
        console.error("Error in bulk listing notifications:", error);
        throw error;
    }
};

// 11. Bid confirmation email for bidder
const bidConfirmationEmail = async (userEmail, userName, listing, amount, currentBid) => {
    try {
        const isWinning = amount >= currentBid;
        const content = `
            <h2 style="text-align: center;">Your Bid Has Been Confirmed</h2>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing.title}</p>
                <p style="margin: 15px 0; font-size: 24px; font-weight: bold; color: ${BRAND_COLORS.secondary};">Bid Amount: ${formatCurrency(amount)}</p>
                ${createSummaryRow('Your Bid Amount:', formatCurrency(amount))}
                ${createSummaryRow('Current Highest Bid:', formatCurrency(currentBid))}
                ${createSummaryRow('Your Position:', isWinning ? 'Leading' : 'Leading')}
            `)}
            <p>Thank you for placing your bid on <strong>${listing.title}</strong> on ${BRAND_NAME}.</p>
            <p>We'll notify you immediately if you are outbid or when the listing ends.</p>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('View Listing Details', `${FRONTEND_URL}/auction/${listing._id}`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'Bid Confirmation');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Bid Confirmation - ${listing.title}`,
            html
        });
        return !!info;
    } catch (error) {
        throw new Error(`Failed to send bid confirmation: ${error.message}`);
    }
};

// 12. New bid notification for seller
const newBidNotificationEmail = async (seller, listing, bidAmount, bidder) => {
    try {
        const content = `
            <h2 style="text-align: center;">New Bid Received</h2>
            <p style="text-align: center;">Great news! Your listing has received a new bid.</p>
            ${createInfoCard(`
                <p style="margin: 15px 0; font-size: 32px; font-weight: bold; color: ${BRAND_COLORS.secondary}; text-align: center;">${formatCurrency(bidAmount)}</p>
                ${createSummaryRow('Listing:', listing.title)}
                ${createSummaryRow('Current Price:', formatCurrency(listing.currentPrice || 0))}
                ${createSummaryRow('Total Bids:', (listing.bidCount || 0).toLocaleString())}
            `)}
            ${listing.specifications && listing.specifications.size > 0 ? `
                <div style="margin: 20px 0;">
                    <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                    ${renderSpecifications(listing.specifications)}
                </div>
            ` : ''}
            ${bidder ? `
                <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Bidder Information</strong></p>
                    <p style="margin: 0;">${bidder.username || bidder.companyName}</p>
                    <p style="margin: 0;">${bidder.firstName} ${bidder.lastName}</p>
                </div>
            ` : ''}
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('View Listing Details', `${FRONTEND_URL}/auction/${listing._id}`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'New Bid Received');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: seller.email,
            subject: `New Bid Received - ${listing.title}`,
            html
        });
        console.log(`New bid notification sent to seller ${seller.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send new bid notification:`, error);
        return false;
    }
};

// 13. Offer confirmation email for bidder
const offerConfirmationEmail = async (userEmail, userName, listing, offerAmount, listingPrice, offerId) => {
    try {
        const content = `
            <h2 style="text-align: center;">Your Offer Has Been Submitted</h2>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing.title}</p>
                <p style="margin: 15px 0; font-size: 28px; font-weight: bold; color: ${BRAND_COLORS.secondary}; text-align: center;">${formatCurrency(offerAmount)}</p>
                <div style="background: ${BRAND_COLORS.secondary}; color: #ffffff; padding: 8px 15px; border-radius: 20px; display: inline-block; font-size: 14px; margin: 10px 0;">
                    Offer ID: ${offerId}
                </div>
                ${createSummaryRow('Your Offer Amount:', formatCurrency(offerAmount))}
                ${createSummaryRow('Listing Price:', formatCurrency(listingPrice))}
                ${createSummaryRow('Offer Difference:', formatCurrency(offerAmount - listingPrice))}
            `)}
            ${listing.specifications && listing.specifications.size > 0 ? `
                <div style="margin: 20px 0;">
                    <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                    ${renderSpecifications(listing.specifications)}
                </div>
            ` : ''}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; font-weight: bold;">What Happens Next</p>
                <p style="margin: 8px 0 0 0;">The seller has 48 hours to respond to your offer. We'll notify you immediately when they respond.</p>
            </div>
            <p>Thank you for submitting your offer for <strong>${listing.title}</strong> on ${BRAND_NAME}.</p>
            <p>We have notified the seller of your offer and they have 48 hours to respond.</p>
        `;
        const html = baseTemplate(content, 'Offer Submitted');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Offer Submitted - ${listing.title}`,
            html
        });
        return !!info;
    } catch (error) {
        throw new Error(`Failed to send offer confirmation: ${error.message}`);
    }
};

// 14. New offer notification for seller
const newOfferNotificationEmail = async (seller, listing, offerAmount, bidder) => {
    try {
        const content = `
            <h2 style="text-align: center;">New Offer Received</h2>
            <p style="text-align: center;">A potential bidder has made an offer on your listing.</p>
            <div style="text-align: center; margin: 20px 0;">
                <p style="font-size: 36px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${formatCurrency(offerAmount)}</p>
            </div>
            ${createInfoCard(`
                ${createSummaryRow('Offer Amount:', formatCurrency(offerAmount))}
                ${createSummaryRow('Listing Price:', formatCurrency(listing?.startPrice || listing?.buyNowPrice || 0))}
                ${createSummaryRow('Item:', listing?.title)}
            `)}
            ${listing.specifications && listing.specifications.size > 0 ? `
                <div style="margin: 20px 0;">
                    <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                    ${renderSpecifications(listing.specifications)}
                </div>
            ` : ''}
            ${bidder ? `
                <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Bidder Information</strong></p>
                    <p style="margin: 0;">Full Name: ${bidder?.firstName} ${bidder?.lastName}</p>
                    <p style="margin: 0;">Username: ${bidder?.username || bidder?.companyName}</p>
                </div>
            ` : ''}
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 25px 0; text-align: center; border-left: 4px solid ${BRAND_COLORS.warning};">
                <p style="margin: 0; font-weight: bold;">Respond Within 48 Hours</p>
                <p style="margin: 8px 0 0 0;">Offers typically expire after 48 hours. Respond promptly to keep the bidder engaged.</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Review Offers', `${FRONTEND_URL}/seller/offers/all`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'New Offer Received');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: seller?.email,
            subject: `New Offer Received - ${listing?.title}`,
            html
        });
        console.log(`New offer notification sent to seller ${seller.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send new offer notification:`, error);
        return false;
    }
};

// 15. Outbid notification for bidder
const outbidNotificationEmail = async (userEmail, userName, listing, newBid, listingUrl) => {
    try {
        const content = `
            <h2 style="text-align: center;">You've Been Outbid</h2>
            <p style="text-align: center;">Another bidder has placed a higher bid on an item you were bidding on.</p>
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.danger};">
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing.title}</p>
                <p style="margin: 15px 0; font-size: 24px; font-weight: bold; color: ${BRAND_COLORS.secondary};">New Highest Bid: ${formatCurrency(newBid)}</p>
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 20px 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
            </div>
            <div style="text-align: center; padding: 25px; background: ${BRAND_COLORS.grayBg}; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">Place a new bid to regain your position.</p>
                <div style="margin: 20px 0;">
                    ${createButton('Place New Bid Now', listingUrl, 'primary')}
                </div>
                <div>
                    <a href="${FRONTEND_URL}/bidder/bids" style="display: inline-block; background: ${BRAND_COLORS.secondary}; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 5px;">View All Your Bids</a>
                    <a href="${FRONTEND_URL}/auctions" style="display: inline-block; background: ${BRAND_COLORS.secondary}; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 5px;">Browse Other Listings</a>
                </div>
            </div>
            <p>Dear ${userName},</p>
            <p>This is an automated notification to let you know that another bidder has placed a higher bid on <strong>${listing.title}</strong>.</p>
            <p>Act quickly. The sooner you place your next bid, the better your chances of winning.</p>
        `;
        const html = baseTemplate(content, 'Outbid Notification');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `You've Been Outbid - ${listing.title}`,
            html
        });
        return !!info;
    } catch (error) {
        throw new Error(`Failed to send outbid notification: ${error.message}`);
    }
};

// 16. Bulk outbid notifications
const DEBOUNCE_DELAY = 5000;
const lastNotificationTimes = new Map();

const sendOutbidNotifications = async (auction, previousHighestBidder, previousBidders, currentBidderId, newBidAmount) => {
    try {
        const auctionId = auction._id.toString();
        const now = Date.now();
        const lastTime = lastNotificationTimes.get(auctionId) || 0;
        if (now - lastTime < DEBOUNCE_DELAY) {
            console.log(`Outbid notifications debounced for auction ${auctionId} - too frequent`);
            return;
        }
        lastNotificationTimes.set(auctionId, now);

        const biddersToNotify = previousBidders.filter(bidderId => bidderId !== currentBidderId.toString());
        if (biddersToNotify.length === 0) {
            console.log("No bidders to notify for outbid");
            return;
        }
        const User = (await import("../models/user.model.js")).default;
        const users = await User.find({
            _id: { $in: biddersToNotify },
            "preferences.outbidNotifications": true,
        });
        if (users.length === 0) {
            console.log("No users found with outbid notifications enabled");
            return;
        }
        const auctionUrl = `${FRONTEND_URL}/auction/${auction._id}`;
        const notificationPromises = users.map(async (user) => {
            try {
                await outbidNotificationEmail(
                    user.email,
                    user.username || user?.companyName || `${user.firstName} ${user.lastName}`,
                    auction,
                    newBidAmount,
                    auctionUrl
                );
            } catch (error) {
                console.error(`Failed to send outbid notification to ${user.email}:`, error.message);
            }
        });
        const results = await Promise.allSettled(notificationPromises);
        const successful = results.filter(result => result.status === "fulfilled").length;
        const failed = results.filter(result => result.status === "rejected").length;
        console.log(`Outbid notifications for auction ${auctionId}: ${successful} successful, ${failed} failed`);
    } catch (error) {
        console.error("Error sending outbid notifications:", error);
    }
};

// 17. Auction ending soon notification for bidders
const auctionEndingSoonEmail = async (userEmail, userName, listing) => {
    try {
        const content = `
            <h2 style="text-align: center;">Listing Expiring Soon</h2>
            <p style="text-align: center;">Time is running out to get this item.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${createSummaryRow('Type:', getListingLabel(listing))}
                ${createSummaryRow('Current Offers/Bids:', (listing?.offers?.length || listing?.bids?.length || 0).toLocaleString())}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
            `)}
            <p>The listing for <strong>${listing?.title}</strong> is about to expire. Once expired, this item will no longer be available for purchase.</p>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('View Listing Now', `${FRONTEND_URL}/auction/${listing._id}`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'Listing Expiring Soon');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Listing Expires Soon: ${listing?.title}`,
            html
        });
        return !!info;
    } catch (error) {
        console.error(`Failed to send listing expiring soon email:`, error);
        return false;
    }
};

// 18. Auction ended notification for seller
const sendAuctionEndedSellerEmail = async (listing) => {
    try {
        if (!listing?.seller || typeof listing?.seller === "string" || !listing?.seller?.email) {
            console.error("Seller not populated or missing email for listing:", listing?._id);
            return false;
        }
        const label = getListingLabel(listing);
        const isProduct = listing?.auctionType === 'buy_now';
        const isSold = listing?.status === "sold" || listing?.status === "sold_buy_now";
        const statusMessage = isSold
        ? `Sold for ${formatCurrency(listing?.finalPrice || 0)}`
        : `${label} ended without sale`;
        const content = `
            <h2 style="text-align: center;">${isSold ? 'Item Sold' : `${label} Ended`}</h2>
            <p style="text-align: center;">${statusMessage}</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing?.finalPrice ? `
                    <p style="margin: 15px 0; font-size: 24px; font-weight: bold; color: ${BRAND_COLORS.secondary}; text-align: center;">${formatCurrency(listing?.finalPrice)}</p>
                ` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
                ${createSummaryRow('Final Status:', listing?.status?.toUpperCase() || 'N/A')}
                ${createSummaryRow('Price:', formatCurrency(isProduct ? listing?.buyNowPrice : (listing?.startPrice || 0)))}
                ${!isProduct ? createSummaryRow('Total Offers:', (listing?.offers?.length || 0).toLocaleString()) : ''}
                ${createSummaryRow('Total Views:', (listing?.views || 0).toLocaleString())}
            `)}
            ${isSold && listing?.winner ? `
                <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.success};">
                    <p style="margin: 0 0 8px 0;"><strong>Congratulations! Your item has been sold.</strong></p>
                    <p style="margin: 0;">Buyer details will be shared after payment confirmation.</p>
                </div>
            ` : `
                <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
                    <p style="margin: 0;"><strong>No Sale This Time</strong></p>
                    <p style="margin: 8px 0 0 0;">Your ${label.toLowerCase()} ended without a sale.</p>
                </div>
            `}
            <p>Dear ${listing?.seller?.firstName || listing?.seller?.companyName || listing?.seller?.username},</p>
            <p>Your ${label.toLowerCase()} for <strong>${listing?.title}</strong> on ${BRAND_NAME} has ended.</p>
        `;
        const html = baseTemplate(content, isSold ? 'Item Sold' : `${label} Ended`);
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: listing?.seller?.email,
            subject: isSold
            ? `Your ${label} Has Been Sold - ${listing?.title}`
            : `Your ${label} Has Ended - ${listing?.title}`,
            html
        });
        return !!info;
    } catch (error) {
        console.error(`Failed to send listing ended email to seller for listing ${listing?._id}:`, error);
        return false;
    }
};

// 19. Auction won notification for bidder
const sendAuctionWonEmail = async (listing) => {
    try {
        if (!listing?.winner || typeof listing?.winner === "string" || !listing?.winner.email) {
            console.error("Winner not populated or missing email for listing:", listing?._id);
            return false;
        }
        const isProduct = listing?.auctionType === 'buy_now';
        const finalPrice = listing?.finalPrice || listing?.currentPrice || 0;
        const content = `
            <h2 style="text-align: center;">${isProduct ? 'Congratulations! You Bought the Item' : 'Congratulations! You Won the Listing'}</h2>
            <p style="text-align: center;">${isProduct ? 'You have successfully purchased this item.' : 'You are the winning bidder for this item.'}</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                <p style="margin: 15px 0; font-size: 24px; font-weight: bold; color: ${BRAND_COLORS.secondary}; text-align: center;">${formatCurrency(finalPrice)}</p>
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
                ${createSummaryRow('Invoice Number:', listing?.transactionId || `INV-${listing?._id?.toString()?.toUpperCase()}`)}
                ${createSummaryRow('Total Amount Due:', formatCurrency(finalPrice))}
            `)}
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Confirm Payment', `mailto:${SUPPORT_EMAIL}?subject=Payment%20Confirmation%20-%20${listing?.title}`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'Invoice');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: listing?.winner?.email,
            subject: `Invoice - ${listing?.title}`,
            html
        });
        console.log(`Invoice email sent to ${listing?.winner?.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send listing won invoice email for listing ${listing._id}:`, error);
        return false;
    }
};

// 20. Auction won notification for admin
const auctionWonAdminEmail = async (adminEmail, listing, buyer) => {
    try {
        const label = getListingLabel(listing);
        const isProduct = listing?.auctionType === 'buy_now';
        const content = `
            <h2 style="text-align: center;">${label} Sold</h2>
            <p style="text-align: center;">A ${label.toLowerCase()} has been successfully completed with a buyer.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                <p style="margin: 15px 0; font-size: 24px; font-weight: bold; color: ${BRAND_COLORS.secondary}; text-align: center;">${formatCurrency(listing?.finalPrice || listing?.startPrice || listing?.buyNowPrice || 0)}</p>
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
                ${createSummaryRow('Sale Type:', label)}
                ${createSummaryRow('Categories:', listing?.categories?.join(', ') || 'N/A')}
                ${!isProduct ? createSummaryRow('Total Offers/Bids:', (listing?.offers?.length || listing?.bids?.length || 0).toLocaleString()) : ''}
                ${createSummaryRow('Sale Status:', 'Completed')}
                ${createSummaryRow('Payment:', listing?.paymentStatus || 'Pending')}
            `)}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 12px 0;"><strong>Buyer Information</strong></p>
                ${createSummaryRow('Name:', buyer?.firstName || buyer?.companyName || buyer?.username)}
                ${createSummaryRow('Username:', buyer?.username || buyer?.companyName)}
                ${createSummaryRow('Email:', buyer?.email)}
                ${createSummaryRow('Phone:', buyer?.phone || 'Not provided')}
            </div>
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 12px 0;"><strong>Seller Information</strong></p>
                ${createSummaryRow('Name:', listing?.seller?.firstName || listing?.seller?.username || 'N/A')}
                ${createSummaryRow('Email:', listing?.seller?.email || 'N/A')}
                ${listing?.seller?.phone ? createSummaryRow('Phone:', listing?.seller?.phone) : ''}
            </div>
        `;
        const html = baseTemplate(content, `${label} Sold`);
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `${label} Sold - ${listing?.title}`,
            html
        });
        console.log(`${label} sold admin email sent for ${listing._id}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send listing sold admin email:`, error);
        return false;
    }
};

// 21. Auction ended notification for admin
const auctionEndedAdminEmail = async (adminEmail, listing) => {
    try {
        const label = getListingLabel(listing);
        const isProduct = listing?.auctionType === 'buy_now';
        const isSold = listing.status === "sold" || listing.status === "sold_buy_now";
        const statusDisplay = isSold ? 'Sold' : 'Ended';
        const content = `
            <h2 style="text-align: center;">${label} ${statusDisplay}</h2>
            <p style="text-align: center;">A ${label.toLowerCase()} on ${BRAND_NAME} has ended.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing?.finalPrice && isSold ? `
                    <p style="margin: 15px 0; font-size: 24px; font-weight: bold; color: ${BRAND_COLORS.secondary}; text-align: center;">${formatCurrency(listing?.finalPrice)}</p>
                ` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
                ${createSummaryRow('Type:', label)}
                ${createSummaryRow('Categories:', listing?.categories?.join(', ') || 'N/A')}
                ${createSummaryRow('Price:', formatCurrency(isProduct ? listing?.buyNowPrice : (listing?.startPrice || 0)))}
                ${createSummaryRow('Final Status:', listing?.status?.toUpperCase() || 'N/A')}
                ${!isProduct ? createSummaryRow('Total Offers/Bids:', (listing?.offers?.length || listing?.bids?.length || 0).toLocaleString()) : ''}
                ${createSummaryRow('Total Views:', (listing?.views || 0).toLocaleString())}
                ${createSummaryRow(`${label} ID:`, listing?._id?.toString() || 'N/A')}
            `)}
            ${listing?.seller ? `
                <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Seller Information</strong></p>
                    ${createSummaryRow('Name:', listing?.seller?.firstName || listing?.seller?.companyName || listing?.seller?.username)}
                    ${createSummaryRow('Email:', listing?.seller?.email)}
                    ${listing?.seller?.phone ? createSummaryRow('Phone:', listing?.seller?.phone) : ''}
                </div>
            ` : ''}
            ${listing.winner && isSold ? `
                <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Buyer Information</strong></p>
                    ${createSummaryRow('Name:', listing?.winner?.firstName || listing?.winner?.companyName || listing?.winner?.username)}
                    ${createSummaryRow('Email:', listing?.winner?.email)}
                    ${listing?.winner?.phone ? createSummaryRow('Phone:', listing?.winner?.phone) : ''}
                </div>
            ` : ''}
        `;
        const html = baseTemplate(content, `${label} ${statusDisplay}`);
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `${label} ${statusDisplay} - ${listing?.title}`,
            html
        });
        console.log(`${label} ${statusDisplay.toLowerCase()} admin email sent for ${listing?._id}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send listing ended admin email:`, error);
        return false;
    }
};

// 22. Offer accepted notification for bidder
const offerAcceptedEmail = async (buyerEmail, buyerName, seller, listing, offerAmount, offerId) => {
    try {
        const content = `
            <h2 style="text-align: center;">Offer Accepted</h2>
            <p style="text-align: center;">Congratulations! The seller has accepted your offer.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
                ${createSummaryRow('Original Price:', formatCurrency(listing?.buyNowPrice || listing?.startPrice || 0))}
                ${createSummaryRow('Offer ID:', offerId)}
            `)}
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('View Purchase', `${FRONTEND_URL}/bidder/offers`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'Offer Accepted');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: buyerEmail,
            subject: `Offer Accepted - ${listing?.title}`,
            html
        });
        console.log(`Offer accepted email sent to buyer ${buyerEmail}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send offer accepted email:`, error);
        return false;
    }
};

// 23. Offer rejected notification for bidder
const offerRejectedEmail = async (buyerEmail, buyerName, seller, listing, offerAmount, offerId, reason) => {
    try {
        const content = `
            <h2 style="text-align: center;">Offer Declined</h2>
            <p style="text-align: center;">The seller has declined your offer.</p>
            ${reason ? `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
                    <p style="margin: 0 0 8px 0;"><strong>Seller's Response</strong></p>
                    <p style="margin: 0;">${reason}</p>
                </div>
            ` : ''}
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
                ${createSummaryRow('Offer ID:', offerId)}
            `)}
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Browse Other Listings', `${FRONTEND_URL}/auctions`, 'primary')}
            </div>
            <div style="text-align: center; margin: 15px 0;">
                <a href="${FRONTEND_URL}/auction/${listing._id}" style="display: inline-block; background: ${BRAND_COLORS.secondary}; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 5px;">Make New Offer</a>
                <a href="${FRONTEND_URL}/bidder/offers" style="display: inline-block; background: ${BRAND_COLORS.secondary}; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 5px;">My Offers</a>
            </div>
        `;
        const html = baseTemplate(content, 'Offer Declined');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: buyerEmail,
            subject: `Offer Declined - ${listing?.title}`,
            html
        });
        console.log(`Offer rejected email sent to buyer ${buyerEmail}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send offer rejected email:`, error);
        return false;
    }
};

// 24. Offer canceled notification for bidder
const offerCanceledEmail = async (buyerEmail, buyerName, seller, listing, offerAmount, offerId) => {
    try {
        const content = `
            <h2 style="text-align: center;">Offer Canceled</h2>
            <p style="text-align: center;">Your offer has been canceled by the seller.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
                ${createSummaryRow('Offer ID:', offerId)}
            `)}
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Browse Other Listings', `${FRONTEND_URL}/auctions`, 'primary')}
            </div>
            <div style="text-align: center; margin: 15px 0;">
                <a href="${FRONTEND_URL}/auctions?category=${listing?.categories?.[0]}" style="display: inline-block; background: ${BRAND_COLORS.secondary}; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Similar Items</a>
            </div>
        `;
        const html = baseTemplate(content, 'Offer Canceled');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: buyerEmail,
            subject: `Offer Canceled - ${listing?.title}`,
            html
        });
        console.log(`Offer canceled email sent to buyer ${buyerEmail}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send offer canceled email:`, error);
        return false;
    }
};

// 25. Payment completed notification for bidder
const paymentCompletedEmail = async (user, listing) => {
    try {
        const content = `
            <h2 style="text-align: center;">Payment Confirmed</h2>
            <p style="text-align: center;">Thank you for your payment, ${user?.firstName || user?.companyName || user?.username}!</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
            `)}
            <p>Great news! Your payment has been successfully processed and confirmed.</p>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton(
            'View My Purchases',
            `${FRONTEND_URL}/bidder/${listing?.auctionType === 'buy_now' ? 'products/purchased' : 'auctions/won'}`,
            'primary'
        )}
            </div>
        `;
        const html = baseTemplate(content, 'Payment Confirmed');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: user?.email,
            subject: `Payment Confirmed - ${listing?.title}`,
            html
        });
        console.log(`Payment completed email sent to buyer ${user?.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send payment completed email:`, error);
        return false;
    }
};

// 26. Payment success (duplicate of 25, can be merged)
const paymentSuccessEmail = async (user, listing) => {
    try {
        const content = `
            <h2 style="text-align: center;">Payment Successful</h2>
            <p style="text-align: center;">Your payment has been processed successfully, ${user.firstName || user?.companyName || user.username}!</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
            `)}
            <p>You can check your order details from your dashboard.</p>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton(
            'View My Purchases',
            `${FRONTEND_URL}/bidder/${listing?.auctionType === 'buy_now' ? 'products/purchased' : 'auctions/won'}`,
            'primary'
        )}
            </div>
        `;
        const html = baseTemplate(content, 'Payment Successful');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Payment Confirmed - ${listing.title}`,
            html
        });
        console.log(`Payment success email sent to ${user.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send payment success email:`, error);
        return false;
    }
};

// 27. Payment completed notification for seller
const paymentCompletedSellerEmail = async (seller, listing, buyer) => {
    try {
        const content = `
            <h2 style="text-align: center;">Payment Received</h2>
            <p style="text-align: center;">Great news, ${seller?.firstName || seller?.companyName || seller?.username}!</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
            `)}
            <p>We're pleased to inform you that the buyer has successfully completed payment for your item. The funds have been received and confirmed.</p>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton(
            'View Sold Items',
            `${FRONTEND_URL}/seller/${listing?.auctionType === 'buy_now' ? 'products/sold' : 'auctions/sold'}`,
            'primary'
        )}
            </div>
        `;
        const html = baseTemplate(content, 'Payment Received');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: seller?.email,
            subject: `Payment Received - ${listing?.title}`,
            html
        });
        console.log(`Payment completed email sent to seller ${seller?.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send payment completed email to seller:`, error);
        return false;
    }
};

// 28. Flagged comment admin email
const flaggedCommentAdminEmail = async (adminEmail, reason, comment, listing, reportedByUser) => {
    try {
        const content = `
            <h2 style="text-align: center;">Comment Flagged for Review</h2>
            <p style="text-align: center;">A user has reported inappropriate content.</p>
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
                <p style="margin: 0 0 8px 0;"><strong>Report Reason</strong></p>
                <p style="margin: 0;">${reason}</p>
            </div>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
            `)}
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.danger};">
                <p style="margin: 0 0 8px 0;"><strong>Flagged Comment</strong></p>
                <p style="margin: 0; font-style: italic;">${comment?.content}</p>
            </div>
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 12px 0;"><strong>Comment Author</strong></p>
                ${createSummaryRow('Name:', `${comment?.user?.firstName || comment?.user?.companyName || comment?.userName || 'N/A'} ${comment?.user?.lastName || ''}`)}
                ${createSummaryRow('Username:', comment?.user?.username || comment?.user?.companyName || comment?.userName || 'N/A')}
                ${createSummaryRow('Email:', comment?.user?.email || 'N/A')}
                ${createSummaryRow('Account Type:', comment?.user?.userType || 'N/A')}
            </div>
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 12px 0;"><strong>Reported By</strong></p>
                ${createSummaryRow('Name:', `${reportedByUser?.firstName} ${reportedByUser?.lastName}`)}
                ${createSummaryRow('Username:', reportedByUser?.username || reportedByUser?.companyName)}
                ${createSummaryRow('Email:', reportedByUser?.email)}
                ${createSummaryRow('Account Type:', reportedByUser?.userType)}
            </div>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Review Comments', `${FRONTEND_URL}/admin/comments`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'Flagged Comment');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `Flagged Comment - ${listing?.title}`,
            html
        });
        console.log(`Flagged comment email sent to admin for comment ${comment._id}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send flagged comment email:`, error);
        return false;
    }
};

// 29. New comment on listing for seller
const newCommentSellerEmail = async (seller, listing, comment, commentAuthor) => {
    try {
        const content = `
            <h2 style="text-align: center;">New Comment on Your ${getListingLabel(listing)}</h2>
            <p style="text-align: center;">${commentAuthor?.firstName || commentAuthor?.companyName || commentAuthor?.username} has commented on your ${getListingLabelLower(listing)}.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
            `)}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
                <p style="margin: 0 0 8px 0;"><strong>Comment</strong></p>
                <p style="margin: 0; font-style: italic;">${comment?.content}</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton(`View ${getListingLabel(listing)}`, `${FRONTEND_URL}/${listing?.auctionType === 'buy_now' ? 'product' : 'auction'}/${listing?._id}`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'New Comment');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: seller?.email,
            subject: `New Comment on Your ${getListingLabel(listing)}: ${listing.title}`,
            html
        });
        console.log(`New comment email sent to seller ${seller.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send new comment email to seller:`, error);
        return false;
    }
};

// 30. New comment on listing for bidder
const newCommentBidderEmail = async (bidder, listing, comment, commentAuthor) => {
    try {
        const content = `
            <h2 style="text-align: center;">New Activity on ${getListingLabel(listing)}</h2>
            <p style="text-align: center;">${commentAuthor?.firstName || commentAuthor?.companyName || commentAuthor?.username} has added a comment on a ${getListingLabelLower(listing)} you're interested in.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing?.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
            `)}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
                <p style="margin: 0 0 8px 0;"><strong>Comment</strong></p>
                <p style="margin: 0; font-style: italic;">${comment?.content}</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
               ${createButton(`View ${getListingLabel(listing)}`, `${FRONTEND_URL}/${listing?.auctionType === 'buy_now' ? 'product' : 'auction'}/${listing?._id}`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'New Activity');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: bidder?.email,
            subject: `New Activity on ${getListingLabel(listing)}: ${listing?.title}`,
            html
        });
        console.log(`New comment email sent to bidder ${bidder.email}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send new comment email to bidder:`, error);
        return false;
    }
};

// 31. Giveaway participation confirmation
const giveawayParticipationEmail = async (userEmail, listing) => {
    try {
        const content = `
            <h2 style="text-align: center;">You're in the Giveaway!</h2>
            <p style="text-align: center;">You have successfully entered the giveaway for <strong>${listing.title}</strong>.</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
            `)}
            <p>Thank you for participating in this giveaway!</p>
            <p>We'll notify you via email if you are selected as the winner.</p>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('View Giveaway', `${FRONTEND_URL}/auction/${listing._id}`, 'primary')}
            </div>
            <p>Good luck!</p>
        `;
        const html = baseTemplate(content, 'Giveaway Entry Confirmed');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Giveaway Entry Confirmed - ${listing.title}`,
            html
        });
        console.log(`Giveaway participation email sent to ${userEmail}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send giveaway participation email:`, error);
        return false;
    }
};

// 32. Giveaway winner notification
const giveawayWinnerEmail = async (winnerEmail, winnerName, listing) => {
    try {
        const content = `
            <h2 style="text-align: center;">🎉 Congratulations! You Won!</h2>
            <p style="text-align: center;">You have been selected as the winner of the giveaway for <strong>${listing.title}</strong>!</p>
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${listing.title}</p>
                ${listing.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${listing.subTitle}</p>` : ''}
                ${listing.specifications && listing.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(listing.specifications)}
                    </div>
                ` : ''}
            `)}
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.success};">
                <p style="margin: 0 0 12px 0;"><strong>What happens next?</strong></p>
                <p style="margin: 0;">Please contact our support team to arrange collection or delivery of your prize.</p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Contact Support', `mailto:${SUPPORT_EMAIL}?subject=Giveaway%20Winner%20-%20${listing.title}`, 'primary')}
            </div>
            <p>Dear ${winnerName},</p>
            <p>We are delighted to inform you that you have been selected as the winner of the <strong>${listing.title}</strong> giveaway!</p>
            <p>Our team will be in touch with you shortly to arrange the next steps.</p>
            <p>Once again, congratulations on your win!</p>
        `;
        const html = baseTemplate(content, '🎉 You Won the Giveaway!');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: winnerEmail,
            subject: `🎉 Congratulations! You Won ${listing.title}!`,
            html
        });
        console.log(`Giveaway winner email sent to ${winnerEmail}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send giveaway winner email:`, error);
        return false;
    }
};

// ============================================
// PAYOUT EMAILS 
// ============================================

const payoutInitiatedEmail = async (seller, auction, payout) => {
    try {
        const content = `
            <h2 style="text-align: center;">💰 Payout Initiated</h2>
            <p style="text-align: center;">Good news, ${seller.firstName || seller?.companyName || seller.username}!</p>
            
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${auction.title}</p>
                
                <div style="margin: 16px 0 0 0;">
                    ${createSummaryRow('Item Sold:', auction.title)}
                    ${createSummaryRow('Payout Method:', `<span style="background: ${BRAND_COLORS.primary}; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: capitalize;">${payout.payoutMethod}</span>`)}
                    ${createSummaryRow('Total Sale Amount:', payout.formattedTotalAmount)}
                    ${createSummaryRow('Commission:', payout.formattedCommissionAmount)}
                </div>
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid ${BRAND_COLORS.primary};">
                    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">
                        <span>Your Payout Amount:</span>
                        <span>${payout.formattedSellerAmount}</span>
                    </div>
                </div>
            `)}
            
            <p><strong>What happens next?</strong></p>
            <p>The admin will process your payment manually. You'll receive another notification once the payment has been completed. Please allow 1-3 business days for processing.</p>
            
            <p>If you have any questions about this payout, please contact our support team.</p>
            
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Contact Support', `mailto:${SUPPORT_EMAIL}?subject=Payout%20Question%20-%20${auction.title}`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'Payout Initiated');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: seller.email,
            subject: `💰 Payout Initiated - ${auction.title}`,
            html
        });
        console.log(`✅ Payout initiated email sent to seller ${seller.email}`);
        return !!info;
    } catch (error) {
        console.error("❌ Failed to send payout initiated email:", error);
        return false;
    }
};

const payoutCompletedEmail = async (seller, auction, payout) => {
    try {
        const content = `
            <h2 style="text-align: center;">✅ Payout Completed</h2>
            <p style="text-align: center;">Great news, ${seller.firstName || seller?.companyName || seller.username}!</p>
            
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${auction.title}</p>
                
                <div style="margin: 16px 0 0 0;">
                    ${createSummaryRow('Item Sold:', auction.title)}
                    ${createSummaryRow('Payout Method:', `<span style="background: ${BRAND_COLORS.primary}; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: capitalize;">${payout.payoutMethod}</span>`)}
                    ${payout.transactionId ? createSummaryRow('Transaction ID:', `<code style="background: ${BRAND_COLORS.grayBg}; padding: 2px 6px; border-radius: 4px;">${payout.transactionId}</code>`) : ''}
                    ${createSummaryRow('Total Sale Amount:', payout.formattedTotalAmount)}
                    ${createSummaryRow('Commission:', payout.formattedCommissionAmount)}
                </div>
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid ${BRAND_COLORS.primary};">
                    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">
                        <span>Amount Sent to You:</span>
                        <span>${payout.formattedSellerAmount}</span>
                    </div>
                </div>
                
                <div style="margin-top: 15px; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid ${BRAND_COLORS.success};">
                    <p style="margin: 0;"><strong>✅ Payment sent</strong></p>
                    <p style="margin: 8px 0 0 0; font-size: 14px;">The funds have been transferred to your ${payout.payoutMethod} account. Please allow 1-3 business days for the funds to appear, depending on your provider.</p>
                </div>
            `, 'success')}
            
            <p>Thank you for selling with ${BRAND_NAME}! We appreciate your business.</p>
            
            <div style="text-align: center; margin: 25px 0;">
                ${createButton(
            'View Your Sales',
            `${FRONTEND_URL}/seller/${auction?.auctionType === 'buy_now' ? 'products/sold' : 'auctions/sold'}`,
            'primary'
        )}
            </div>
        `;
        const html = baseTemplate(content, 'Payout Completed');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: seller.email,
            subject: `✅ Payout Completed - ${auction.title}`,
            html
        });
        console.log(`✅ Payout completed email sent to seller ${seller.email}`);
        return !!info;
    } catch (error) {
        console.error("❌ Failed to send payout completed email:", error);
        return false;
    }
};

const payoutFailedEmail = async (seller, payout) => {
    try {
        const content = `
            <h2 style="text-align: center;">⚠️ Payout Issue</h2>
            <p style="text-align: center;">We encountered an issue with your payout, ${seller.firstName || seller?.companyName || seller.username}.</p>
            
            ${createInfoCard(`
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${BRAND_COLORS.warning};">
                    <p style="margin: 0; font-weight: bold;">Issue Details</p>
                    <p style="margin: 8px 0 0 0;">${payout.failureReason || "Payment method issue or invalid details"}</p>
                </div>
                
                <div style="margin: 16px 0 0 0;">
                    ${createSummaryRow('Payout Method:', `<span style="background: ${BRAND_COLORS.primary}; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: capitalize;">${payout.payoutMethod}</span>`)}
                    ${createSummaryRow('Attempted Amount:', payout.formattedSellerAmount)}
                </div>
                
                <div style="margin-top: 15px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid ${BRAND_COLORS.primary};">
                    <p style="margin: 0;"><strong>Next Steps:</strong></p>
                    <p style="margin: 8px 0 0 0;">Please check your payout method details in your account settings and ensure they are correct. Our admin team will review the issue and may contact you for additional information.</p>
                </div>
            `, 'warning')}
            
            <p>If you need immediate assistance, please contact our support team.</p>
            
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Update Payout Method', `${FRONTEND_URL}/seller/payout-methods`, 'primary')}
                <div style="margin-top: 10px;">
                    ${createButton('Contact Support', `mailto:${SUPPORT_EMAIL}?subject=Payout%20Issue%20-%20${payout.payoutMethod}`, 'outline')}
                </div>
            </div>
        `;
        const html = baseTemplate(content, 'Payout Issue');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: seller.email,
            subject: `⚠️ Payout Update - Action Required`,
            html
        });
        console.log(`✅ Payout failed email sent to seller ${seller.email}`);
        return !!info;
    } catch (error) {
        console.error("❌ Failed to send payout failed email:", error);
        return false;
    }
};

// Deprecated: sendOfferOutbidNotifications
const sendOfferOutbidNotifications = async () => {
    console.log("sendOfferOutbidNotifications is deprecated - offers cannot be outbid");
    return false;
};

const paymentInitiatedAdminEmail = async (adminEmail, payment, buyer, auction) => {
    try {
        const label = getListingLabel(auction);
        const content = `
            <h2 style="text-align: center;">💰 New Payment Initiated</h2>
            <p style="text-align: center;">A buyer has started a bank transfer payment for a ${label.toLowerCase()}.</p>
            
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${auction?.title}</p>
                ${auction.subTitle ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${BRAND_COLORS.textLight};">${auction.subTitle}</p>` : ''}
                
                <div style="margin: 16px 0 0 0;">
                    ${createSummaryRow('Total Amount:', formatCurrency(payment.totalAmount))}
                    ${createSummaryRow(
                    auction?.auctionType === 'buy_now' ? 'Purchase Amount:' : 'Bid Amount:',
                    formatCurrency(payment.bidAmount)
                )}
                    ${createSummaryRow('Commission:', formatCurrency(payment.commissionAmount))}
                    ${createSummaryRow('Payment Method:', 'Bank Transfer')}
                    ${payment.transactionReference ? createSummaryRow('Transaction Ref:', payment.transactionReference) : ''}
                </div>
                
                ${auction.specifications && auction.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(auction.specifications)}
                    </div>
                ` : ''}
            `)}
            
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 12px 0;"><strong>Buyer Information</strong></p>
                ${createSummaryRow('Name:', buyer?.firstName || buyer?.companyName || buyer?.username)}
                ${createSummaryRow('Username:', buyer?.username || buyer?.companyName)}
                ${createSummaryRow('Email:', buyer?.email)}
                ${createSummaryRow('Phone:', buyer?.phone || 'Not provided')}
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
                <p style="margin: 0 0 12px 0;"><strong>Action Required</strong></p>
                <p style="margin: 0;">Please verify that the payment has been received in the bank account. Once confirmed, mark the payment as "processing" or "completed" in the admin dashboard.</p>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('View Payment Details', `${ADMIN_URL}/${auction?.auctionType === 'buy_now' ? 'products' : 'auctions'}/all`, 'primary')}
            </div>
        `;
        const html = baseTemplate(content, 'New Payment Initiated');
        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `New Payment Initiated - ${auction?.title}`,
            html
        });
        console.log(`Payment initiated admin email sent to ${adminEmail}`);
        return !!info;
    } catch (error) {
        console.error(`Failed to send payment initiated admin email:`, error);
        return false;
    }
};

// ============================================
// SHIPPING UPDATED EMAIL (to winning bidder)
// ============================================

const shippingUpdatedEmail = async (recipient, auction, shippingInfo, updatedBy, userRole) => {
    try {
        const label = getListingLabel(auction);
        const url = `${FRONTEND_URL}/${auction?.auctionType === 'buy_now' ? 'product' : 'auction'}/${auction?._id}`;
        const content = `
            <h2 style="text-align: center;">🚚 Shipping Information Updated</h2>
            <p style="text-align: center;">Hello ${recipient.firstName || recipient.username},</p>
            
            <p>The shipping details for the ${label.toLowerCase()} <strong>${auction.title}</strong> have been updated by <strong>${userRole}</strong>.</p>
            
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${auction.title}</p>
                
                <div style="margin: 16px 0 0 0;">
                    ${createSummaryRow('Courier / Company:', shippingInfo.company || 'Not provided')}
                    ${createSummaryRow('Tracking Number:', shippingInfo.trackingNumber || 'Not provided')}
                    ${shippingInfo.estimatedDelivery ? createSummaryRow('Estimated Delivery:', formatDate(shippingInfo.estimatedDelivery)) : ''}
                    ${shippingInfo.notes ? createSummaryRow('Additional Notes:', shippingInfo.notes) : ''}
                    ${createSummaryRow('Updated By:', updatedBy?.firstName || updatedBy?.username || userRole)}
                    ${createSummaryRow('Updated At:', new Date().toLocaleString())}
                </div>
                
                ${auction.specifications && auction.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(auction.specifications)}
                    </div>
                ` : ''}
            `)}
            
            ${userRole === 'Admin' ?
                `<p>You can track your shipment using the provided tracking number. If you have any questions, please contact our support team.</p>` :
                `<p>Please review the shipping details and confirm with the buyer. If you need any changes, you can update them again.</p>`
            }
            
            <div style="text-align: center; margin: 25px 0;">
                ${createButton(`View ${label} Details`, url, 'primary')}
            </div>
            
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 14px; border: 1px solid ${BRAND_COLORS.grayBorder};">
                <p style="margin: 0;"><strong style="color: ${BRAND_COLORS.secondary};">Need Help?</strong> Contact our support team at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.primary};">${SUPPORT_EMAIL}</a></p>
            </div>
        `;

        const html = baseTemplate(content, 'Shipping Updated');

        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: recipient.email,
            subject: `Shipping Update - ${auction.title}`,
            html
        });

        console.log(`✅ Shipping update email sent to ${recipient.email}`);
        return !!info;
    } catch (error) {
        console.error(`❌ Failed to send shipping update email:`, error);
        return false;
    }
};

// Helper for date formatting (reuse or add)
const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// ============================================
// NEW MESSAGE NOTIFICATION EMAIL
// ============================================

const newMessageNotificationEmail = async (recipient, sender, auction, messageContent, communicationId) => {
    try {
        const label = getListingLabel(auction);
        const senderRole = sender.userType === 'admin' ? 'Admin' :
            sender.userType === 'seller' ? 'Seller' : 'Bidder';

        const content = `
            <h2 style="text-align: center;">💬 New Message Received</h2>
            <p style="text-align: center;">Hello ${recipient.firstName || recipient.username},</p>
            
            <p>You have received a new message from <strong>${senderRole}</strong> regarding your ${label.toLowerCase()} <strong>${auction.title}</strong>.</p>
            
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary};">${auction.title}</p>
                
                <div style="margin: 16px 0 0 0;">
                    ${createSummaryRow('From:', `${sender.firstName || sender.username} ${sender?.lastName} (${senderRole})`)}
                    ${createSummaryRow(`${label}:`, auction.title)}
                </div>
                
                <div style="margin-top: 16px; padding: 16px; background: #ffffff; border-radius: 8px; border: 1px solid ${BRAND_COLORS.grayBorder};">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: ${BRAND_COLORS.secondary};">Message:</p>
                    <p style="margin: 0; color: ${BRAND_COLORS.text};">${messageContent || 'No text content (attachment(s) sent)'}</p>
                </div>
                
                ${auction.specifications && auction.specifications.size > 0 ? `
                    <div style="margin: 16px 0 0 0;">
                        <strong style="color: ${BRAND_COLORS.secondary};">Item Details</strong>
                        ${renderSpecifications(auction.specifications)}
                    </div>
                ` : ''}
            `)}
            
            <p>You can reply to this message by visiting the communication page for this ${label.toLowerCase()}.</p>
            
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 14px; border: 1px solid ${BRAND_COLORS.grayBorder};">
                <p style="margin: 0;"><strong style="color: ${BRAND_COLORS.secondary};">Need Help?</strong> Contact our support team at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLORS.primary};">${SUPPORT_EMAIL}</a></p>
            </div>
        `;

        const html = baseTemplate(content, 'New Message');

        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: recipient.email,
            subject: `New Message - ${auction.title}`,
            html
        });

        console.log(`✅ New message notification sent to ${recipient.email}`);
        return !!info;
    } catch (error) {
        console.error(`❌ Failed to send new message notification:`, error);
        return false;
    }
};

// ============================================
// ACCOUNT APPROVED EMAIL (to user)
// ============================================

const accountApprovedEmail = async (user) => {
    try {
        const content = `
            <h2 style="text-align: center;">✅ Account Approved</h2>
            <p style="text-align: center;">Welcome to ${BRAND_NAME}, ${user.firstName || user.username}!</p>
            
            <p>We are pleased to inform you that your account has been <strong>approved</strong> by our team. You now have full access to all features of ${BRAND_NAME}.</p>
            
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: ${BRAND_COLORS.secondary};">Your Approved Account Allows You To:</p>
                
                <div style="margin: 12px 0 0 0;">
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid ${BRAND_COLORS.grayBorder};">
                        <span style="font-size: 20px;">🏷️</span>
                        <span style="color: ${BRAND_COLORS.text};">Bid on auctions, compete for items, and buy them.</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0;">
                        <span style="font-size: 20px;">📤</span>
                        <span style="color: ${BRAND_COLORS.text};">Upload your own auctions and products and start selling</span>
                    </div>
                </div>
            `)}
            
            <p>You can now log in to your account and start exploring all the features ${BRAND_NAME} has to offer.</p>
            
            <div style="text-align: center; margin: 25px 0;">
                ${createButton('Go to Dashboard', `${FRONTEND_URL}/${user?.userType || 'bidder'}/dashboard`, 'primary')}
            </div>
            
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid ${BRAND_COLORS.grayBorder};">
                <p style="margin: 0 0 12px 0; font-weight: bold; color: ${BRAND_COLORS.secondary};">📞 Need Assistance?</p>
                <p style="margin: 0 0 8px 0; color: ${BRAND_COLORS.text};">If you have any questions or need any assistance at any stage, just reach out to us.</p>
            </div>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.success};">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                    <strong>🎉 Welcome aboard!</strong> We're excited to have you as part of the ${BRAND_NAME} community.
                </p>
            </div>
        `;

        const html = baseTemplate(content, 'Account Approved');

        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Account Approved - Welcome to ${BRAND_NAME}!`,
            html
        });

        console.log(`✅ Account approval email sent to ${user.email}`);
        return !!info;
    } catch (error) {
        console.error(`❌ Failed to send account approval email:`, error);
        return false;
    }
};

// ============================================
// IDENTITY REJECTED EMAIL (to user)
// ============================================

const identityRejectedEmail = async (user, rejectionReason, allowReupload = true) => {
    try {
        const content = `
            <h2 style="text-align: center;">❌ Identity Verification Rejected</h2>
            <p style="text-align: center;">Hello ${user.firstName || user.username},</p>
            
            <p>We regret to inform you that your identity verification document has been <strong>rejected</strong> by our admin team.</p>
            
            ${createInfoCard(`
                <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: ${BRAND_COLORS.secondary};">Reason for Rejection:</p>
                
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid ${BRAND_COLORS.danger}; margin-top: 8px;">
                    <p style="margin: 0; color: #991b1b;">${rejectionReason}</p>
                </div>
                
                ${allowReupload ? `
                    <div style="margin-top: 16px; padding: 15px; background: #fff7ed; border-radius: 8px; border-left: 4px solid ${BRAND_COLORS.warning};">
                        <p style="margin: 0 0 8px 0; font-weight: 600; color: ${BRAND_COLORS.secondary};">📤 What You Can Do:</p>
                        <p style="margin: 0; color: ${BRAND_COLORS.text};">You can upload a new, clearer identification document. Please make sure the document is:</p>
                        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: ${BRAND_COLORS.text};">
                            <li>Clear and legible</li>
                            <li>Not expired</li>
                            <li>Matches your account details</li>
                        </ul>
                    </div>
                ` : `
                    <div style="margin-top: 16px; padding: 15px; background: #fef2f2; border-radius: 8px; border-left: 4px solid ${BRAND_COLORS.danger};">
                        <p style="margin: 0; color: #991b1b;">⚠️ You cannot re-upload your document. Please contact support for further assistance.</p>
                    </div>
                `}
            `, 'warning')}
            
            <p>If you believe this rejection was in error or need clarification, please contact our support team.</p>
            
            <div style="background: ${BRAND_COLORS.grayBg}; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid ${BRAND_COLORS.grayBorder};">
                <p style="margin: 0 0 12px 0; font-weight: bold; color: ${BRAND_COLORS.secondary};">📞 Need Help?</p>
                <p style="margin: 0 0 8px 0; color: ${BRAND_COLORS.text};">If you have any questions or need assistance, just reach out to us.</p>
            </div>
        `;

        const html = baseTemplate(content, 'Identity Verification Rejected');

        const info = await transporter.sendMail({
            from: `"${BRAND_NAME}" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Identity Verification Rejected - ${BRAND_NAME}`,
            html
        });

        console.log(`✅ Identity rejection email sent to ${user.email}`);
        return !!info;
    } catch (error) {
        console.error(`❌ Failed to send identity rejection email:`, error);
        return false;
    }
};

// Export all
export {
    contactEmail,
    contactConfirmationEmail,
    welcomeEmail,
    newUserRegistrationEmail,
    resetPasswordEmail,
    auctionSubmittedForApprovalEmail,
    auctionApprovedEmail,
    auctionListedEmail,
    newAuctionNotificationEmail,
    sendBulkAuctionNotifications,
    bidConfirmationEmail,
    newBidNotificationEmail,
    offerConfirmationEmail,
    newOfferNotificationEmail,
    outbidNotificationEmail,
    sendOutbidNotifications,
    sendOfferOutbidNotifications,
    auctionEndingSoonEmail,
    sendAuctionWonEmail,
    sendAuctionEndedSellerEmail,
    auctionWonAdminEmail,
    auctionEndedAdminEmail,
    offerAcceptedEmail,
    offerRejectedEmail,
    offerCanceledEmail,
    newCommentSellerEmail,
    newCommentBidderEmail,
    flaggedCommentAdminEmail,
    paymentCompletedEmail,
    paymentSuccessEmail,
    paymentCompletedSellerEmail,
    payoutInitiatedEmail,
    payoutCompletedEmail,
    payoutFailedEmail,
    giveawayParticipationEmail,
    giveawayWinnerEmail,
    paymentInitiatedAdminEmail,
    shippingUpdatedEmail,
    newMessageNotificationEmail,
    accountApprovedEmail,
    identityRejectedEmail,
};