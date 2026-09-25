import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Banknote,
    CalendarDays,
    ChevronRight,
    Clock,
    Download,
    Eye,
    File,
    MapPin,
    MessageSquare,
    ShieldCheck,
    Tag,
    User,
    CheckCircle2,
} from "lucide-react";
import { toast } from "react-hot-toast";

import {
    Container,
    LoadingSpinner,
    ImageLightBox,
    SpecificationsSection,
    TabSection,
    BuyNowModal,
    ProductStatusCard,
    ProductSpecificationSection,
} from "../components";

import { useComments } from "../hooks/useComments";
import { useAuth } from "../contexts/AuthContext";
import axiosInstance from "../utils/axiosInstance";

const YouTubeEmbed = lazy(() => import("../components/YouTubeEmbed"));

function SingleProduct() {
    const { id } = useParams();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [showBuyNowModal, setShowBuyNowModal] = useState(false);
    const [activeTab, setActiveTab] = useState("description");

    const commentSectionRef = useRef(null);

    const { pagination } = useComments(id);
    const { user } = useAuth();
    const navigate = useNavigate();

    // --------------------------------------------------
    // Fetch Product
    // --------------------------------------------------

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);

                const { data } = await axiosInstance.get(
                    `/api/v1/auctions/${id}`
                );

                if (
                    data.success &&
                    data.data.auction.auctionType === "buy_now"
                ) {
                    setProduct(data.data.auction);
                } else if (data.success) {
                    // Wrong type — send to auction page
                    navigate(`/auction/${id}`, { replace: true });
                }
            } catch (error) {
                toast.error(
                    error?.response?.data?.message ||
                    "Failed to fetch product"
                );
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProduct();
    }, [id, navigate]);

    // --------------------------------------------------
    // Buy Now
    // --------------------------------------------------

    const handleBuyNow = async () => {
        if (!user) {
            toast.error("You must login to buy.");
            navigate("/login");
            return;
        }

        if (
            user._id?.toString() ===
            product?.seller?._id?.toString()
        ) {
            toast.error("You can't buy your own product.");
            return;
        }

        try {
            setBuying(true);

            const { data } = await axiosInstance.post(
                `/api/v1/buy-now/${id}`
            );

            if (data.success) {
                setProduct(data.data.auction);

                toast.success(
                    "Congratulations! You have purchased this product."
                );

                setShowBuyNowModal(false);

                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });

                navigate("/bidder/products/purchased");
            }
        } catch (error) {
            toast.error(
                error?.response?.data?.message ||
                "Failed to complete purchase"
            );
        } finally {
            setBuying(false);
        }
    };

    // --------------------------------------------------
    // YouTube
    // --------------------------------------------------

    const getYouTubeId = (url) => {
        if (!url) return null;

        const regex =
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

        const match = url.match(regex);

        return match ? match[1] : null;
    };

    // --------------------------------------------------
    // Documents
    // --------------------------------------------------

    const handleDocumentDownload = (url, filename) => {
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.target = "_blank";

        link.click();
    };

    // --------------------------------------------------
    // Loading
    // --------------------------------------------------

    if (loading) {
        return (
            <Container className="min-h-[70vh] flex items-center justify-center py-32">
                <LoadingSpinner size="large" />
            </Container>
        );
    }

    // --------------------------------------------------
    // Product Not Found
    // --------------------------------------------------

    if (!product) {
        return (
            <Container className="min-h-[70vh] flex items-center justify-center py-32">
                <div className="max-w-md text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                        <Tag className="h-7 w-7 text-gray-400" />
                    </div>

                    <h2 className="text-2xl font-semibold text-gray-900">
                        Product not found
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        The product you're looking for may have been
                        removed or is no longer available.
                    </p>

                    <Link
                        to="/products"
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C59D55]"
                    >
                        Browse Products
                        <ChevronRight size={16} />
                    </Link>
                </div>
            </Container>
        );
    }

    const youtubeVideoId = getYouTubeId(product.videoLink);

    const isActive =
        product.status === "active" && !product.winner;

    const isSold =
        product.status === "sold" || product.winner;

    const isDraft = product.status === "draft";

    const isCancelled = product.status === "cancelled";

    const price =
        product.buyNowPrice ||
        product.startPrice ||
        0;

    const statusConfig = isSold
        ? {
            label: "Sold",
            dot: "bg-blue-500",
            badge:
                "border-blue-200 bg-blue-50 text-blue-700",
        }
        : isDraft
            ? {
                label: "Pending Approval",
                dot: "bg-amber-500",
                badge:
                    "border-amber-200 bg-amber-50 text-amber-700",
            }
            : isCancelled
                ? {
                    label: "Cancelled",
                    dot: "bg-red-500",
                    badge:
                        "border-red-200 bg-red-50 text-red-700",
                }
                : {
                    label: "Available",
                    dot: "bg-green-500",
                    badge:
                        "border-green-200 bg-green-50 text-green-700",
                };

    return (
        <Container className="min-h-[70vh] pb-20 pt-28">

            {/* ==================================================
                PRODUCT HEADER
            ================================================== */}

            <section className="mb-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-4xl">
                        {/* Categories */}

                        <div className="mb-4 flex flex-wrap gap-2">
                            {product.categories?.map(
                                (category, index) => (
                                    <Link
                                        key={index}
                                        to={`/products?category=${category}`}
                                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold capitalize text-gray-600 transition hover:border-[#C59D55] hover:bg-[#C59D55]/5 hover:text-[#9b783b]"
                                    >
                                        {category}
                                    </Link>
                                )
                            )}
                        </div>

                        {/* Title */}

                        <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl lg:text-4xl">
                            {product.title}
                        </h1>
                    </div>
                </div>
            </section>

            {/* ==================================================
                HERO / GALLERY + PURCHASE
            ================================================== */}

            <section className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_370px]">
                {/* LEFT - IMAGE */}

                <div className="min-w-0">
                    <ImageLightBox
                        images={product.photos}
                        auctionType="buy_now"
                    />

                    {/* Quick information */}

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                                <Tag
                                    size={16}
                                    className="text-gray-600"
                                />
                            </div>

                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                Category
                            </p>

                            <p className="mt-1 truncate text-sm font-semibold capitalize text-gray-900">
                                {product?.categories?.[1] ||
                                    product?.categories?.[0] ||
                                    "Not specified"}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                                <MapPin
                                    size={16}
                                    className="text-gray-600"
                                />
                            </div>

                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                Location
                            </p>

                            <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                                {product.location ||
                                    "Not specified"}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                                <User
                                    size={16}
                                    className="text-gray-600"
                                />
                            </div>

                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                Seller
                            </p>

                            <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                                {product.sellerUsername ||
                                    "Not specified"}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                                <CalendarDays
                                    size={16}
                                    className="text-gray-600"
                                />
                            </div>

                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                Listed
                            </p>

                            <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                                {product.createdAt
                                    ? new Date(
                                        product.createdAt
                                    ).toLocaleDateString()
                                    : "Not specified"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT - PURCHASE PANEL */}

                <aside className="xl:sticky xl:top-24">
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.07)]">
                        {/* Accent */}

                        <div className="h-1.5 bg-[#C59D55]" />

                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                                    Purchase Summary
                                </span>

                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                    <Eye size={14} />
                                    {product.views || 0}
                                </div>
                            </div>

                            {/* Price */}

                            <div className="mt-7">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm text-gray-500">
                                        Buy Now Price
                                    </p>

                                    {/* Status */}

                                    <div
                                        className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-4 py-1 text-xs font-medium ${statusConfig.badge}`}
                                    >
                                        <span
                                            className={`h-2 w-2 rounded-full ${statusConfig.dot}`}
                                        />

                                        {statusConfig.label}
                                    </div>
                                </div>

                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-4xl font-bold tracking-tight text-gray-950">
                                        $
                                        {price.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Buy */}

                            {!isSold &&
                                !isCancelled &&
                                !isDraft && (
                                    <>
                                        <button
                                            onClick={() =>
                                                setShowBuyNowModal(
                                                    true
                                                )
                                            }
                                            disabled={buying}
                                            className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-950 px-5 py-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#C59D55] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Banknote size={19} />

                                            {buying
                                                ? "Processing..."
                                                : "Buy Now"}
                                        </button>

                                        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                                            <ShieldCheck
                                                size={14}
                                            />
                                            Secure purchase
                                        </div>
                                    </>
                                )}

                            {/* Sold */}

                            {isSold &&
                                product?.winner && (
                                    <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                                        <div className="flex gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                <CheckCircle2
                                                    size={17}
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-blue-600">
                                                    Product sold
                                                </p>

                                                <p className="mt-1 truncate text-sm font-semibold text-blue-900">
                                                    @
                                                    {product
                                                        .winner
                                                        .username ||
                                                        product.winner}
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

                            {/* Draft */}

                            {isDraft && (
                                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex gap-3">
                                        <Clock
                                            size={18}
                                            className="mt-0.5 shrink-0 text-amber-600"
                                        />

                                        <div>
                                            <p className="text-sm font-semibold text-amber-900">
                                                Awaiting approval
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                                This product is
                                                currently waiting
                                                for admin approval.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cancelled */}

                            {isCancelled && (
                                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                                            <span className="h-2 w-2 rounded-full bg-red-500" />
                                        </div>

                                        <p className="text-sm font-medium text-red-800">
                                            This product is no longer
                                            available.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Seller */}

                            <div className="mt-6 border-t border-gray-100 pt-5">
                                <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                                    Listing Information
                                </p>

                                <div className="space-y-3">
                                    {product.sellerUsername && (
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-sm text-gray-500">
                                                Seller
                                            </span>

                                            <span className="max-w-[180px] truncate text-sm font-semibold text-gray-900">
                                                {
                                                    product.sellerUsername
                                                }
                                            </span>
                                        </div>
                                    )}

                                    {product.location && (
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-sm text-gray-500">
                                                Location
                                            </span>

                                            <span className="max-w-[180px] truncate text-right text-sm font-semibold text-gray-900">
                                                {
                                                    product.location
                                                }
                                            </span>
                                        </div>
                                    )}

                                    {product.createdAt && (
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-sm text-gray-500">
                                                Listed
                                            </span>

                                            <span className="text-sm font-semibold text-gray-900">
                                                {new Date(
                                                    product.createdAt
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Verified */}

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

                    {/* Contact Admin */}

                    {product.winner && (
                        <Link
                            to={`/bidder/communication/${product._id}`}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C59D55] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#b38b48]"
                        >
                            <MessageSquare size={17} />
                            Contact Admin
                        </Link>
                    )}
                </aside>
            </section>

            {/* ==================================================
                PRODUCT DETAILS
            ================================================== */}
            <ProductSpecificationSection auction={product} />

            {/* ==================================================
                FEATURES
            ================================================== */}
            {product.features && (
                <section className="mt-10">
                    <div className="mb-5">
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#C59D55]">
                            Highlights
                        </p>

                        <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-950">
                            Features
                        </h2>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="prose prose-lg max-w-none text-gray-700">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: product.features,
                                }}
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* ==================================================
                DOCUMENTS
            ================================================== */}

            {product.documents?.length > 0 && (
                <section className="mt-10">
                    <div className="mb-5">
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#C59D55]">
                            Supporting Files
                        </p>

                        <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-950">
                            Documents
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {product.documents.map(
                            (doc, index) => (
                                <button
                                    key={index}
                                    onClick={() =>
                                        handleDocumentDownload(
                                            doc.url,
                                            doc.originalName ||
                                            doc.filename
                                        )
                                    }
                                    className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#C59D55]/50 hover:shadow-md"
                                >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition group-hover:bg-[#C59D55]/10 group-hover:text-[#9b783b]">
                                        <File size={20} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900">
                                            {doc.originalName ||
                                                doc.filename}
                                        </p>

                                        <p className="mt-1 text-xs text-gray-500">
                                            Click to download
                                        </p>
                                    </div>

                                    <Download
                                        size={18}
                                        className="shrink-0 text-gray-400 transition group-hover:text-[#C59D55]"
                                    />
                                </button>
                            )
                        )}
                    </div>
                </section>
            )}

            {/* ==================================================
                VIDEO
            ================================================== */}

            {youtubeVideoId && (
                <section className="mt-10">
                    <div className="mb-5">
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#C59D55]">
                            Visual Inspection
                        </p>

                        <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-950">
                            Product Video
                        </h2>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm">
                        <Suspense
                            fallback={
                                <div className="flex min-h-[300px] items-center justify-center">
                                    <LoadingSpinner />
                                </div>
                            }
                        >
                            <YouTubeEmbed
                                videoId={youtubeVideoId}
                                title={product.title}
                            />
                        </Suspense>
                    </div>
                </section>
            )}

            {/* ==================================================
                DESCRIPTION / COMMENTS
            ================================================== */}

            <section
                ref={commentSectionRef}
                className="mt-12 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
                <div className="border-b border-gray-200 px-6 py-5 sm:px-8">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#C59D55]">
                                More Information
                            </p>

                            <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-950">
                                Product discussion
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MessageSquare size={16} />
                            {pagination?.totalComments || 0} comments
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    <Suspense
                        fallback={
                            <div className="flex min-h-[200px] items-center justify-center">
                                <LoadingSpinner />
                            </div>
                        }
                    >
                        <TabSection
                            description={product.description}
                            bids={[]}
                            offers={[]}
                            auction={product}
                            activatedTab={activeTab}
                            onAuctionUpdate={setProduct}
                        />
                    </Suspense>
                </div>
            </section>

            {/* ==================================================
                BUY NOW MODAL
            ================================================== */}

            {isActive && (
                <BuyNowModal
                    isOpen={showBuyNowModal}
                    onClose={() =>
                        setShowBuyNowModal(false)
                    }
                    onConfirm={handleBuyNow}
                    auction={product}
                    loading={buying}
                />
            )}
        </Container>
    );
}

export default SingleProduct;