import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
    Search,
    ArrowRight,
    Trophy,
    Shirt,
    CircleDot,
    Sparkles,
    ShieldCheck,
    TrendingUp,
    Star,
    ChevronRight,
    Loader2,
    Clock,
} from "lucide-react";

import { Container } from "../components";
import { heroImg } from "../assets";
import axiosInstance from "../utils/axiosInstance";
import { extractYouTubeId } from "./YouTubeEmbed";

function Hero() {
    const navigate = useNavigate();
    const searchForm = useForm();
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchType, setSearchType] = useState("auction");

    const categories = [
        { name: "Sports Cards", icon: Trophy },
        { name: "Jerseys", icon: Shirt },
        { name: "Game Balls", icon: CircleDot },
        { name: "Memorabilia", icon: Sparkles },
    ];

    const [hotListing, setHotListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const videoId = hotListing?.videoLink ? extractYouTubeId(hotListing?.videoLink) : null;

    const formatPrice = (price) => {
        return price?.toFixed(2).toLocaleString();
    };

    // Helper: calculate remaining time from endDate
    const getTimeRemaining = (endDate) => {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        if (diff <= 0) return 'Ended';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (86400000)) / (3600000));
        if (days > 0) return `${days}d ${hours}h`;
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    const handleSearch = (data) => {
        if (!data.search?.trim()) return;

        const search = encodeURIComponent(data.search.trim());

        if (searchType === "seller") {
            navigate(`/sellers?search=${search}`);
        } else if (searchType === "product") {
            navigate(`/products?search=${search}`);
        } else {
            navigate(`/auctions?search=${search}`);
        }
    };

    const handleCategory = (category) => {
        setActiveCategory(category);

        if (category !== "All") {
            navigate(
                `/auctions?category=${encodeURIComponent(
                    category.toLowerCase()
                )}`
            );
        }
    };

    // Fetch hot listing on mount
    useEffect(() => {
        const fetchHotListing = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get(`/api/v1/auctions/hot`);
                if (response.data.success) {
                    setHotListing(response.data.data.auction);
                    setError(null);
                } else {
                    setError('No hot listing available');
                }
            } catch (err) {
                console.error('Failed to fetch hot listing:', err);
                setError('Unable to load hot item');
            } finally {
                setLoading(false);
            }
        };
        fetchHotListing();
    }, []);

    return (
        <section className="relative min-h-[760px] lg:min-h-screen overflow-hidden bg-[#080A0D] text-white">
            {/* =====================================================
                BACKGROUND
            ====================================================== */}

            <div className="absolute inset-0">
                {/* Main gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(197,157,85,0.16),transparent_35%),radial-gradient(circle_at_10%_90%,rgba(255,255,255,0.04),transparent_30%)]" />

                {/* Gold glow */}
                <div className="absolute -top-40 right-[15%] h-[500px] w-[500px] rounded-full bg-[#C59D55]/10 blur-[140px]" />

                {/* Bottom glow */}
                <div className="absolute -bottom-60 left-[25%] h-[500px] w-[500px] rounded-full bg-[#C59D55]/5 blur-[130px]" />

                {/* Grid */}
                <div
                    className="absolute inset-0 opacity-[0.035]"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)
                        `,
                        backgroundSize: "70px 70px",
                    }}
                />

                {/* Noise */}
                <div className="absolute inset-0 opacity-[0.025] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%22.7%22/%3E%3C/svg%3E')]" />
            </div>

            <Container>
                <div className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-16">
                    <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">

                        {/* =================================================
                            LEFT CONTENT
                        ================================================== */}

                        <div className="max-w-2xl">

                            {/* Eyebrow */}
                            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#C59D55]/25 bg-[#C59D55]/[0.07] px-4 py-2 backdrop-blur-md">
                                <Sparkles
                                    size={15}
                                    className="text-[#C59D55]"
                                />

                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D8C18E]">
                                    The Collectors Marketplace
                                </span>
                            </div>

                            {/* Heading */}
                            <h1 className="text-[46px] font-black leading-[0.95] tracking-[-0.045em] sm:text-6xl lg:text-[76px]">
                                Own a Piece
                                <span className="block text-white">
                                    of the
                                    <span className="ml-3 bg-gradient-to-r from-[#F2D18A] via-[#C59D55] to-[#8C6828] bg-clip-text text-transparent">
                                        Game.
                                    </span>
                                </span>
                            </h1>

                            {/* Description */}
                            <p className="mt-7 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
                                Bid on verified collectibles from one of the most trusted digital auction houses. Discover rare sports cards, signed jerseys, game-used balls, and other non-sports memorabilia.
                            </p>

                            {/* Search */}
                            <form
                                onSubmit={searchForm.handleSubmit(handleSearch)}
                                className="mt-9"
                            >
                                <div className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.055] p-2 shadow-2xl shadow-black/20 backdrop-blur-xl sm:flex-row">

                                    <div className="flex items-center border-b border-white/10 px-3 sm:border-b-0 sm:border-r">
                                        <select
                                            value={searchType}
                                            onChange={(e) => setSearchType(e.target.value)}
                                            className="h-14 cursor-pointer bg-transparent text-sm font-medium text-white outline-none min-w-20"
                                        >
                                            <option value="auction" className="bg-[#11161B]">
                                                Auctions
                                            </option>
                                            <option value="product" className="bg-[#11161B]">
                                                Products
                                            </option>
                                            <option value="seller" className="bg-[#11161B]">
                                                Sellers
                                            </option>
                                        </select>
                                    </div>

                                    <div className="relative flex-1">
                                        <Search
                                            size={20}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-[#C59D55]"
                                        />

                                        <input
                                            type="text"
                                            placeholder="Search seller's name, cards, jerseys, players..."
                                            className="h-14 w-full rounded-xl bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-white/30"
                                            {...searchForm.register("search")}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="group/button flex h-14 items-center justify-center gap-3 rounded-xl bg-[#C59D55] px-7 text-sm font-bold text-[#090A0C] transition-all duration-300 hover:bg-[#D8B96F] hover:shadow-[0_0_35px_rgba(197,157,85,0.25)]"
                                    >
                                        Explore
                                        <ArrowRight
                                            size={18}
                                            className="transition-transform duration-300 group-hover/button:translate-x-1"
                                        />
                                    </button>
                                </div>
                            </form>

                            {/* Popular */}
                            <div className="mt-5 flex flex-wrap items-center gap-2.5">
                                <span className="mr-1 text-xs font-medium text-white/35">
                                    Popular:
                                </span>

                                {[
                                    "Jerseys & Kits",
                                    "Signed Jerseys",
                                    "Game Balls",
                                    "Autographs"
                                ].map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        // onClick={() =>
                                        //     navigate(
                                        //         `/auctions?category=${encodeURIComponent(
                                        //             item.toLowerCase()
                                        //         )}`
                                        //     )
                                        // }
                                        className="rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-1.5 text-xs text-white/55 transition-all hover:border-[#C59D55]/40 hover:bg-[#C59D55]/10 hover:text-[#D8C18E]"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>

                            {/* Trust indicators */}
                            <div className="mt-10 flex flex-wrap gap-6 border-t border-white/[0.08] pt-7">
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck
                                        size={19}
                                        className="text-[#C59D55]"
                                    />

                                    <div>
                                        <div className="text-sm font-semibold">
                                            Verified Items
                                        </div>

                                        <div className="text-[11px] text-white/35">
                                            Authentic collectibles
                                        </div>
                                    </div>
                                </div>

                                <div className="h-9 w-px bg-white/10" />

                                <div className="flex items-center gap-2.5">
                                    <TrendingUp
                                        size={19}
                                        className="text-[#C59D55]"
                                    />

                                    <div>
                                        <div className="text-sm font-semibold">
                                            Live Bidding
                                        </div>

                                        <div className="text-[11px] text-white/35">
                                            Real-time auctions
                                        </div>
                                    </div>
                                </div>

                                <div className="h-9 w-px bg-white/10" />

                                <div>
                                    <div className="flex items-center gap-1">
                                        <Star
                                            size={14}
                                            fill="currentColor"
                                            className="text-[#C59D55]"
                                        />

                                        <span className="text-sm font-bold">
                                            4.9/5
                                        </span>
                                    </div>

                                    <div className="text-[11px] text-white/35">
                                        Collector rated
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* =================================================
                            RIGHT VISUAL
                        ================================================== */}

                        <div className="relative mx-auto hidden w-full max-w-[590px] lg:block">

                            {/* Decorative circle */}
                            <div className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C59D55]/10" />

                            <div className="absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C59D55]/10" />

                            {/* Gold glow */}
                            <div className="absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C59D55]/15 blur-[90px]" />

                            {/* Main collectible */}
                            <div className="relative z-10 mx-auto h-[520px] w-[390px] rotate-[3deg] overflow-hidden rounded-[28px] border border-white/15 bg-[#11161B] shadow-[0_40px_100px_rgba(0,0,0,0.55)] transition-transform duration-700 hover:rotate-0">

                                {loading ? (
                                    // Loading state
                                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center h-full">
                                        <Loader2 size={48} className="text-[#D19F3E] animate-spin mb-4" />
                                        <p className="text-gray-300">Loading hot listing...</p>
                                    </div>
                                ) : error || !hotListing ? (
                                    // Error / no listing state
                                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center h-full">
                                        <p className="text-gray-300 mb-4">{error || 'No hot listing available'}</p>
                                        <button
                                            onClick={() => navigate('/auctions')}
                                            className="bg-[#D19F3E] text-[#072342] px-6 py-2 rounded-lg font-medium"
                                        >
                                            Browse all listings
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <img
                                            src={hotListing ? hotListing?.photos[0]?.url : heroImg}
                                            alt="Hot collectible"
                                            className="h-full w-full object-cover opacity-80"
                                        />

                                        <div className="absolute inset-0 bg-gradient-to-t from-[#080A0D] via-transparent to-black/20" />

                                        <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[11px] font-semibold backdrop-blur-md">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#C59D55] shadow-[0_0_10px_#C59D55]" />
                                            HOT COLLECTIBLE
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-6">
                                            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[#C59D55]">
                                                Premium Collection
                                            </div>

                                            <h2 className="text-2xl font-bold">
                                                <Link to={`/auction/${hotListing?._id}`} className="text-white hover:text-[#F2D18A]">
                                                    {hotListing?.title || 'Legendary Memorabilia'}
                                                </Link>
                                            </h2>

                                            <div className="mt-4 flex items-end justify-between">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-wider text-white/40">
                                                        {hotListing?.bidCount > 0 ? 'Current Bid' : 'Starting Bid'}
                                                    </div>

                                                    <div className="mt-1 text-2xl font-bold text-[#F2D18A]">
                                                        ${hotListing?.currentPrice?.toLocaleString({ minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() =>
                                                        navigate(`/auction/${hotListing?._id}`)
                                                    }
                                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-110"
                                                >
                                                    <ArrowRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )


                                }</div>

                            {/* =================================================
                                FLOATING CARD — TOP LEFT
                            ================================================== */}

                            <div className="absolute -left-2 top-12 z-20 w-[175px] -rotate-[8deg] rounded-2xl border border-white/15 bg-[#151A1F]/90 p-3 shadow-2xl backdrop-blur-xl animate-[float_6s_ease-in-out_infinite]">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C59D55]/10">
                                        <Clock
                                            size={20}
                                            className="text-[#C59D55]"
                                        />
                                    </div>

                                    <Link to={`/auction/${hotListing?._id}`}>
                                        <div className="text-lg font-bold">
                                            {getTimeRemaining(hotListing?.endDate || new Date())}
                                        </div>

                                        <div className="text-[10px] text-white/35">
                                            {new Date(hotListing?.endDate || new Date()) > new Date() ? 'Ends in' : 'Ended'}
                                        </div>
                                    </Link>
                                </div>
                            </div>

                            {/* =================================================
                                FLOATING CARD — RIGHT
                            ================================================== */}

                            <div className="absolute -right-2 bottom-40 z-20 w-[190px] rotate-[7deg] rounded-2xl border border-white/15 bg-[#151A1F]/90 p-4 shadow-2xl backdrop-blur-xl animate-[float_6s_ease-in-out_2s_infinite]">
                                {/* <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#C59D55]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#C59D55]" />
                                    Live Auction
                                </div> */}

                                <Link to={`/auction/${hotListing?._id}`} className="mt- flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold capitalize">
                                            {hotListing?.categories[1]?.replace(/-/g, ' ')}
                                        </div>

                                        <div className="mt-1 text-xs text-white/35">
                                            {hotListing?.bidCount} {hotListing?.bidCount === 1 ? 'bid' : 'bids'}
                                        </div>
                                    </div>

                                    <ChevronRight
                                        size={17}
                                        className="text-white/30"
                                    />
                                </Link>
                            </div>

                            {/* =================================================
                                SMALL FLOATING ICON
                            ================================================== */}

                            <div className="absolute right-16 top-0 z-20 flex h-14 w-14 rotate-12 items-center justify-center rounded-2xl border border-[#C59D55]/20 bg-[#151A1F]/90 shadow-xl backdrop-blur-xl">
                                <CircleDot
                                    size={24}
                                    className="text-[#C59D55]"
                                />
                            </div>

                            {/* Bottom mini stats */}
                            <div className="absolute -bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5 rounded-full border border-white/10 bg-[#101419]/90 px-5 py-3 shadow-2xl backdrop-blur-xl">
                                <div className="text-center">
                                    <div className="text-sm font-bold">
                                        99%
                                    </div>
                                    <div className="text-[9px] uppercase tracking-wider text-white/30">
                                        Authentic
                                    </div>
                                </div>

                                <div className="h-7 w-px bg-white/10" />

                                <div className="text-center">
                                    <div className="text-sm font-bold">
                                        24/7
                                    </div>
                                    <div className="text-[9px] uppercase tracking-wider text-white/30">
                                        Bidding
                                    </div>
                                </div>

                                <div className="h-7 w-px bg-white/10" />

                                <div className="text-center">
                                    <div className="text-sm font-bold">
                                        100%
                                    </div>
                                    <div className="text-[9px] uppercase tracking-wider text-white/30">
                                        Secure
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =====================================================
                        CATEGORY STRIP
                    ====================================================== */}

                    {/* <div className="mt-20 hidden border-t border-white/[0.07] pt-7 lg:block">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                                    Explore Collections
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleCategory("All")}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                                        activeCategory === "All"
                                            ? "bg-white text-black"
                                            : "text-white/40 hover:text-white"
                                    }`}
                                >
                                    All
                                </button>

                                {categories.map((category) => {
                                    const Icon = category.icon;

                                    return (
                                        <button
                                            key={category.name}
                                            onClick={() =>
                                                handleCategory(category.name)
                                            }
                                            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-all ${
                                                activeCategory ===
                                                category.name
                                                    ? "border-[#C59D55]/40 bg-[#C59D55]/10 text-[#D8C18E]"
                                                    : "border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                                            }`}
                                        >
                                            <Icon size={14} />
                                            {category.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div> */}
                </div>
            </Container>

            {/* Bottom fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080A0D] to-transparent" />

            <style>{`
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0);
                    }

                    50% {
                        transform: translateY(-12px);
                    }
                }
            `}</style>
        </section>
    );
}

export default Hero;