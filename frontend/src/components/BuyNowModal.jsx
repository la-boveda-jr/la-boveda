import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Package, Gift } from "lucide-react";
import axiosInstance from "../utils/axiosInstance";

const BuyNowModal = ({ isOpen, onClose, onConfirm, auction, loading, isGiveaway }) => {
    const [serviceFee, setServiceFee] = useState(0);
    const [commissionType, setCommissionType] = useState("percentage");
    const [commissionValue, setCommissionValue] = useState(0);

    useEffect(() => {
        // Don't fetch commission for giveaways
        if (isGiveaway) {
            setServiceFee(0);
            return;
        }

        if (!isOpen || !auction?.buyNowPrice) return;

        const getCommission = async () => {
            try {
                const { data } = await axiosInstance.get("/api/v1/commissions");

                // New structure: { auction, product }
                // Buy Now purchases use the PRODUCT commission scope
                const commission = data?.data?.product || data?.data?.auction;

                if (!commission) return;

                setCommissionType(commission.commissionType);
                setCommissionValue(commission.commissionValue);

                const price = Number(auction.buyNowPrice);

                if (commission.commissionType === "fixed") {
                    setServiceFee(Number(commission.commissionValue));
                } else {
                    setServiceFee(
                        (price * Number(commission.commissionValue)) / 100
                    );
                }
            } catch (error) {
                console.error("Error fetching commission:", error);
            }
        };

        getCommission();
    }, [isOpen, auction?.buyNowPrice, isGiveaway]);

    if (!isOpen) return null;

    const formatUSD = (amount) => {
        if (!amount && amount !== 0) return "$0";
        return `$${Number(amount).toLocaleString("en-US")}`;
    };

    const total = isGiveaway
        ? 0
        : Number(auction?.buyNowPrice || 0) + Number(serviceFee);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
                <div className="p-6">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-full ${isGiveaway ? 'bg-purple-100' : 'bg-green-100'}`}>
                            {isGiveaway ? (
                                <Gift className="h-6 w-6 text-purple-600" />
                            ) : (
                                <Package className="h-6 w-6 text-green-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {isGiveaway ? '🎁 Claim Free Item' : 'Buy Now Confirmation'}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {isGiveaway ? 'Instant claim - completely free' : 'Instant purchase'}
                            </p>
                        </div>
                    </div>

                    {/* Special Giveaway Message */}
                    {isGiveaway && (
                        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-purple-700 text-sm">
                                This item is completely free! The first person to claim it wins.
                                No payment or fees required.
                            </p>
                        </div>
                    )}

                    {/* Price Breakdown */}
                    {!isGiveaway && (
                        <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-3">
                            <div className="flex justify-between text-gray-700">
                                <span>Buy Now Price</span>
                                <span className="font-semibold">
                                    {formatUSD(auction?.buyNowPrice)}
                                </span>
                            </div>

                            <div className="flex justify-between text-gray-700">
                                <span>
                                    Service Fee
                                    {commissionType === "percentage" && commissionValue > 0 && (
                                        <span className="text-xs text-gray-500 ml-1">
                                            ({commissionValue}%)
                                        </span>
                                    )}
                                </span>
                                <span className="font-semibold">
                                    {formatUSD(serviceFee)}
                                </span>
                            </div>

                            <div className="border-t pt-2 flex justify-between text-lg font-bold text-green-600">
                                <span>Total Payable</span>
                                <span>{formatUSD(total)}</span>
                            </div>
                        </div>
                    )}

                    {/* Action List */}
                    <div className="mb-6">
                        <p className="font-medium text-gray-700 mb-2">This will:</p>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                {isGiveaway ? 'Claim the item immediately' : 'Mark the product as sold and declare you as the buyer.'}
                            </li>
                        </ul>
                    </div>

                    {/* Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 order-2 sm:order-1"
                        >
                            <XCircle className="h-5 w-5" />
                            Cancel
                        </button>

                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg transition-colors disabled:opacity-50 order-1 sm:order-2 ${isGiveaway
                                ? 'bg-purple-600 hover:bg-purple-700'
                                : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <CheckCircle className="h-5 w-5" />
                                    {isGiveaway ? 'Claim for Free' : 'Confirm Purchase'}
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default BuyNowModal;