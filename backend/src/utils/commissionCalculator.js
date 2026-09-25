import Commission from "../models/commission.model.js";

/**
 * Calculate commission based on scope.
 * @param {number} finalPrice
 * @param {'auction'|'product'} scope
 */
export const calculateCommission = async (finalPrice, scope = 'auction') => {
  try {
    const commission = await Commission.findOne({ scope });

    // Fallback rates: 5% for auctions, 10% for products
    const fallback = scope === 'product' ? 10 : 5;

    if (!commission) {
      return {
        commissionType: "percentage",
        commissionValue: fallback,
        commissionAmount: Math.round(((finalPrice * fallback) / 100) * 100) / 100,
      };
    }

    let commissionAmount = 0;
    if (commission.commissionType === "fixed") {
      commissionAmount = commission.commissionValue;
    } else {
      commissionAmount = (finalPrice * commission.commissionValue) / 100;
    }

    return {
      commissionType: commission.commissionType,
      commissionValue: commission.commissionValue,
      commissionAmount: Math.round(commissionAmount * 100) / 100,
    };
  } catch (error) {
    console.error("Error calculating commission:", error);
    const fallback = scope === 'product' ? 10 : 5;
    return {
      commissionType: "percentage",
      commissionValue: fallback,
      commissionAmount: Math.round(((finalPrice * fallback) / 100) * 100) / 100,
    };
  }
};