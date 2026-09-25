import {
    Banknote,
    User,
    Eye,
    ShieldCheck,
    CheckCircle2,
    Clock3,
    XCircle,
} from "lucide-react";

const ProductStatusCard = ({ product, onBuyNow, buying }) => {
    const isSold = product?.status === "sold" || product?.winner;
    const isDraft = product?.status === "draft";
    const isCancelled = product?.status === "cancelled";

    const statusConfig = isSold
        ? {
              label: "Sold",
              dot: "bg-blue-500",
              badge: "bg-blue-50 text-blue-700 border-blue-200",
              icon: CheckCircle2,
          }
        : isDraft
          ? {
                label: "Pending Approval",
                dot: "bg-amber-500",
                badge: "bg-amber-50 text-amber-700 border-amber-200",
                icon: Clock3,
            }
          : isCancelled
            ? {
                  label: "Cancelled",
                  dot: "bg-red-500",
                  badge: "bg-red-50 text-red-700 border-red-200",
                  icon: XCircle,
              }
            : {
                  label: "Available",
                  dot: "bg-green-500",
                  badge: "bg-green-50 text-green-700 border-green-200",
                  icon: CheckCircle2,
              };

    const StatusIcon = statusConfig.icon;

    const price = product?.buyNowPrice || product?.startPrice || 0;

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            {/* Top accent */}
            <div className="h-1.5 bg-[#C59D55]" />

            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                        Purchase Summary
                    </span>

                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig.badge}`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}
                        />
                        {statusConfig.label}
                    </span>
                </div>

                {/* Price */}
                <div className="mt-7">
                    <p className="mb-1 text-sm text-gray-500">
                        Buy Now Price
                    </p>

                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold tracking-tight text-gray-950">
                            ${price.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Buy button */}
                {!isSold && !isCancelled && !isDraft && (
                    <div className="mt-6">
                        <button
                            onClick={onBuyNow}
                            disabled={buying}
                            className="
                                group flex w-full items-center justify-center gap-2.5
                                rounded-xl bg-gray-950 px-5 py-3.5
                                text-sm font-semibold text-white
                                shadow-sm transition-all duration-200
                                hover:bg-[#C59D55]
                                hover:shadow-lg
                                disabled:cursor-not-allowed disabled:opacity-50
                            "
                        >
                            <Banknote
                                size={18}
                                className="transition-transform group-hover:scale-110"
                            />

                            {buying ? "Processing..." : "Buy Now"}
                        </button>

                        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                            <ShieldCheck size={14} />
                            Secure purchase
                        </div>
                    </div>
                )}

                {/* Sold state */}
                {isSold && product?.winner && (
                    <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <User size={15} />
                            </div>

                            <div className="min-w-0">
                                <p className="text-xs font-medium text-blue-600">
                                    Purchased by
                                </p>

                                <p className="mt-0.5 truncate text-sm font-semibold text-blue-900">
                                    @{product.winner.username || product.winner}
                                </p>

                                {product.finalPrice && (
                                    <p className="mt-2 text-sm font-semibold text-blue-900">
                                        Final price: $
                                        {product.finalPrice.toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Draft state */}
                {isDraft && (
                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <Clock3
                                size={18}
                                className="mt-0.5 shrink-0 text-amber-600"
                            />

                            <div>
                                <p className="text-sm font-semibold text-amber-900">
                                    Awaiting approval
                                </p>

                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    This product is currently waiting for admin
                                    approval.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cancelled state */}
                {isCancelled && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                        <div className="flex items-center gap-3">
                            <XCircle
                                size={18}
                                className="shrink-0 text-red-600"
                            />

                            <p className="text-sm font-medium text-red-800">
                                This product is no longer available.
                            </p>
                        </div>
                    </div>
                )}

                {/* Listing information */}
                <div className="mt-6 border-t border-gray-100 pt-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center justify-center">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                Views
                            </p>

                            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                <Eye size={14} className="text-gray-400" />
                                {product?.views || 0}
                            </p>
                        </div>

                        {product?.sellerUsername && (
                            <div className="min-w-0 flex flex-col items-center justify-center">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                    Seller
                                </p>

                                <p className="mt-1 truncate text-sm font-semibold text-gray-800">
                                    {product.sellerUsername}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Verified listing */}
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                    <ShieldCheck
                        size={15}
                        className="shrink-0 text-[#C59D55]"
                    />

                    <span className="text-xs font-medium text-gray-600">
                        Verified marketplace listing
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProductStatusCard;