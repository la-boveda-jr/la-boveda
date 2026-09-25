import {
    MapPin,
    Eye,
    Shield,
    ShoppingCart,
    HandGrab,
    ArrowUpRight,
    CheckCircle,
    Tag,
    Package,
} from "lucide-react";

import { heroImg } from "../assets";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function ProductCard({ product, onBuyNow }) {
    const navigate = useNavigate();

    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const threshold = 3;

    const handleMove = (e) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();

        const x = (e.clientX - left) / width - 0.5;
        const y = (e.clientY - top) / height - 0.5;

        setTilt({
            x: y * -threshold,
            y: x * threshold,
        });
    };

    // ============================================================
    // STATE
    // ============================================================

    const isSold = product.status === "sold" || !!product.winner;
    const isActive = product.status === "active" && !product.winner;
    const isDraft = product.status === "draft";
    const isCancelled = product.status === "cancelled";

    const price = product.buyNowPrice || product.startPrice || 0;
    const finalPrice = product.finalPrice || 0;

    const handleBuyNowClick = (e) => {
        e.stopPropagation();
        if (!isActive) {
            navigate(`/product/${product._id}`);
            return;
        }
        // If parent gave us a handler, use it; otherwise navigate to detail page
        if (typeof onBuyNow === "function") {
            onBuyNow(product);
        } else {
            navigate(`/product/${product._id}`);
        }
    };

    // ============================================================
    // STATUS BADGES
    // ============================================================

    const getStatusBadges = () => {
        const badges = [];

        if (isSold) {
            badges.push({
                label: "Sold",
                icon: CheckCircle,
                color: "bg-blue-50 text-blue-700 border-blue-200",
            });
        } else if (isDraft) {
            badges.push({
                label: "Pending Approval",
                icon: Shield,
                color: "bg-amber-50 text-amber-700 border-amber-200",
            });
        } else if (isCancelled) {
            badges.push({
                label: "Cancelled",
                icon: Shield,
                color: "bg-red-50 text-red-700 border-red-200",
            });
        } else if (isActive) {
            badges.push({
                label: "Available",
                icon: Package,
                color: "bg-emerald-50 text-emerald-700 border-emerald-200",
            });
        }

        return badges;
    };

    const statusBadges = getStatusBadges();

    // ============================================================
    // LOADING STATE
    // ============================================================

    if (!product) {
        return (
            <div className="h-full overflow-hidden rounded-[24px] border border-gray-100 bg-white p-3 shadow-[0_8px_35px_rgba(0,0,0,0.05)]">
                <div className="h-64 animate-pulse rounded-[18px] bg-gray-100" />

                <div className="space-y-3 p-2 pt-5">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
                        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // CARD
    // ============================================================

    return (
        <div
            className="group h-full cursor-pointer"
            onMouseMove={handleMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            style={{
                transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: "transform 180ms ease-out",
            }}
            onClick={() => navigate(`/product/${product._id}`)}
        >
            <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white p-3 shadow-[0_8px_35px_rgba(0,0,0,0.05)] transition-all duration-500 group-hover:-translate-y-1 group-hover:border-[#C59D55]/25 group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.11)]">

                {/* =================================================
                    IMAGE
                ================================================== */}
                <div className="relative h-64 overflow-hidden rounded-[18px] bg-gray-100">

                    <img
                        src={product.photos?.[0]?.url || heroImg}
                        alt={product.title}
                        className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] ${isSold ? "grayscale-[35%]" : ""
                            }`}
                    />

                    {/* Image gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/10" />

                    {/* SOLD overlay ribbon */}
                    {isSold && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="-rotate-12 rounded-lg border-2 border-white/80 bg-black/60 px-6 py-2 text-2xl font-black uppercase tracking-widest text-white backdrop-blur-md">
                                Sold
                            </div>
                        </div>
                    )}

                    {/* =================================================
                        TOP LEFT BADGES
                    ================================================== */}
                    <div className="absolute left-3 top-3 flex max-w-[75%] flex-wrap gap-1.5">
                        {statusBadges.map((badge, index) => {
                            const IconComponent = badge.icon;
                            return (
                                <span
                                    key={index}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md ${badge.color}`}
                                >
                                    <IconComponent size={11} />
                                    {badge.label}
                                </span>
                            );
                        })}
                    </div>

                    {/* =================================================
                        VIEW COUNT
                    ================================================== */}
                    <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-1.5 text-[10px] font-medium text-white backdrop-blur-md">
                        <Eye size={12} />
                        {product.views?.toLocaleString() || 0}
                    </div>

                    {/* =================================================
                        BOTTOM PRICE TAG (on image)
                    ================================================== */}
                    {!isSold && (
                        <div className="absolute bottom-3 left-3">
                            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-[11px] font-semibold text-white backdrop-blur-md">
                                <Tag size={12} className="text-[#D8B96F]" />
                                <span className="text-white/70">Price</span>
                                <span className="text-[#D8B96F] font-bold">
                                    ${price.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* =================================================
                    CONTENT
                ================================================== */}
                <div className="flex flex-1 flex-col px-1 pt-5">

                    {/* Title */}
                    <Link
                        to={`/product/${product._id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="line-clamp-2 text-[17px] font-bold leading-6 tracking-tight text-gray-900 transition-colors hover:text-[#A17B35]"
                    >
                        {product.title}
                    </Link>

                    {/* Location */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-400">
                        <MapPin size={13} className="shrink-0" />
                        <span className="truncate">
                            {product.location || "Location not specified"}
                        </span>
                    </div>

                    {/* =================================================
                        PRICE / STATUS
                    ================================================== */}
                    <div className="mt-5 grid grid-cols-2 gap-2.5">

                        {/* Price */}
                        <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3.5">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                                {isSold ? "Sold For" : "Price"}
                            </div>
                            <div className="mt-1 text-lg font-black tracking-tight text-gray-900">
                                <span className="text-lg font-semibold text-gray-900">$</span>
                                {(isSold ? finalPrice : price).toLocaleString()}
                            </div>
                        </div>

                        {/* Status card */}
                        <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3.5">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                                Status
                            </div>
                            <div
                                className={`mt-1 flex items-center gap-1.5 text-sm font-bold ${isSold
                                        ? "text-blue-600"
                                        : isDraft
                                            ? "text-amber-600"
                                            : isCancelled
                                                ? "text-red-600"
                                                : "text-emerald-600"
                                    }`}
                            >
                                {isSold ? (
                                    <>
                                        <CheckCircle size={14} />
                                        Sold
                                    </>
                                ) : isDraft ? (
                                    <>
                                        <Shield size={14} />
                                        Pending
                                    </>
                                ) : isCancelled ? (
                                    <>
                                        <Shield size={14} />
                                        Cancelled
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={14} />
                                        Available
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        META
                    ================================================== */}
                    {/* <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[10px] text-gray-400">
                        <span>
                            {product.categories?.[1] || product.categories?.[0] || "Uncategorized"}
                        </span>

                        {isSold && product.winner?.username && (
                            <span className="flex items-center gap-1">
                                <CheckCircle size={11} />
                                to @{product.winner.username}
                            </span>
                        )}
                    </div> */}

                    {/* =================================================
                        ACTION
                    ================================================== */}
                    <div className="mt-auto pt-4">
                        {isSold ? (
                            <Link
                                to={`/product/${product._id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="group/button flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 transition-all duration-300 hover:bg-gray-100"
                            >
                                <Eye size={17} />
                                <span>View Details</span>
                                <ArrowUpRight
                                    size={15}
                                    className="transition-transform duration-300 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
                                />
                            </Link>
                        ) : isDraft || isCancelled ? (
                            <Link
                                to={`/product/${product._id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="group/button flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 transition-all duration-300 hover:bg-gray-100"
                            >
                                <Eye size={17} />
                                <span>View Details</span>
                                <ArrowUpRight
                                    size={15}
                                    className="transition-transform duration-300 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
                                />
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={handleBuyNowClick}
                                className="group/button flex w-full items-center justify-center gap-2 rounded-lg bg-[#C59D55] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[#D8B96F] hover:shadow-[0_10px_30px_rgba(197,157,85,0.2)]"
                            >
                                <HandGrab size={17} />
                                <span>Buy Now</span>
                                <ArrowUpRight
                                    size={15}
                                    className="transition-transform duration-300 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
                                />
                            </button>
                        )}
                    </div>
                </div>

                {/* =================================================
                    BOTTOM GOLD ACCENT
                ================================================== */}
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#C59D55] transition-all duration-500 group-hover:w-full" />
            </div>
        </div>
    );
}

export default ProductCard;