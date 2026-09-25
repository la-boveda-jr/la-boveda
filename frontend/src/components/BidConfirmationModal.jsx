import { forwardRef, useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

const BidConfirmationModal = forwardRef((props, ref) => {
    const {
        isOpen,
        onClose,
        onConfirm,
        auction,
        bidAmount
    } = props;

    const [commissionType, setCommissionType] = useState("percentage");
    const [commissionValue, setCommissionValue] = useState(0);
    const [serviceFee, setServiceFee] = useState(0);

    useEffect(() => {
        if (!isOpen) return;

        const getCommission = async () => {
            try {
                const { data } = await axiosInstance.get("/api/v1/commissions");

                // New structure: { auction, product }
                // Bids use the AUCTION commission scope
                const commission = data?.data?.auction;

                if (!commission) return;

                setCommissionType(commission.commissionType);
                setCommissionValue(commission.commissionValue);

                if (commission.commissionType === "fixed") {
                    setServiceFee(Number(commission.commissionValue));
                } else {
                    setServiceFee(
                        (Number(bidAmount) * Number(commission.commissionValue)) / 100
                    );
                }
            } catch (error) {
                console.error("Error fetching commission:", error);
            }
        };

        getCommission();
    }, [bidAmount, isOpen]);

    if (!isOpen) return null;

    const formatUSD = (amount) => {
        if (!amount && amount !== 0) return "$0";
        return `$${Number(amount).toLocaleString("en-US")}`;
    };

    const total = Number(bidAmount) + Number(serviceFee);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center py-3 px-6 md:p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Confirm your bid
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                    >
                        ×
                    </button>
                </div>

                {/* Auction Info */}
                <div className="py-3 px-6 md:p-6 border-b border-gray-200">
                    <strong className="text-gray-900">
                        {auction?.auctionType === "standard" ? "No Reserve" : "Reserve"}:{" "}
                        {auction?.title || ""}
                    </strong>
                </div>

                {/* Bid Details */}
                <div className="py-3 px-6 md:px-6 border-b border-gray-200">
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td className="text-gray-600">Bid Amount:</td>
                                <td className="text-right text-gray-900">
                                    {formatUSD(bidAmount)}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2 text-gray-600">
                                    Service Fee ({commissionType === "percentage"
                                        ? `${commissionValue}%`
                                        : `$${commissionValue}`}):
                                </td>
                                <td className="py-2 text-right text-gray-900">
                                    {formatUSD(serviceFee)}
                                </td>
                            </tr>
                            <tr className="border-t border-gray-200">
                                <td className="py-3 font-semibold text-gray-900">Total:</td>
                                <td className="py-3 text-right font-semibold text-gray-900">
                                    {formatUSD(total)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="text-xs text-gray-500 text-center">
                        Note: {commissionType === "percentage"
                            ? `${commissionValue}%`
                            : `$${commissionValue}`} service fee will be applied on the winning bid amount.
                    </p>
                </div>

                {/* Information Text */}
                <div className="py-3 px-6 md:p-6 border-b border-gray-200 space-y-4">
                    <p className="text-sm text-gray-600">
                        For more info,{" "}
                        <a href="/faqs" className="text-blue-600 hover:text-blue-800 underline">
                            read about FAQs
                        </a>{" "}
                        or{" "}
                        <a href="/contact" className="text-blue-600 hover:text-blue-800 underline">
                            contact us
                        </a>{" "}
                        with any questions.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="py-3 px-6 md:p-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 px-4 md:py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        ref={ref}
                        onClick={onConfirm}
                        type="submit"
                        className="flex-1 py-2 px-4 md:py-3 bg-black text-white rounded-md hover:bg-gray-900 font-medium transition-colors"
                    >
                        Place Bid
                    </button>
                </div>

            </div>
        </div>
    );
});

export default BidConfirmationModal;