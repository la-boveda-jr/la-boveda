import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, ArrowRight, Gavel } from "lucide-react";
import { Container, AuctionCard, LoadingSpinner } from "./index";
import axiosInstance from "../utils/axiosInstance";

function HomeAuctionsSection() {
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const [activeTab, setActiveTab] = useState("active");

    const sectionRef = useRef(null);
    const navigate = useNavigate();

    // ============================================================
    // TAB CONFIG
    // ============================================================

    const tabStatusMap = {
        active: "active",
        sold: "sold",
        approved: "approved",
    };

    const tabTitles = {
        active: "Live",
        sold: "Closed",
        approved: "Upcoming",
    };

    const tabDescriptions = {
        active:
            "Handpicked collectibles. Transparent bidding. Verified authenticity. — find your next treasure today.",
        sold:
            "Learn from past auctions — browse sold and reserve-not-met listings to bid smarter on your next piece.",
        approved:
            "Plan your next move — browse upcoming collectible auctions and build your bidding strategy in advance.",
    };

    // ============================================================
    // FETCH AUCTIONS
    // ============================================================

    const fetchAuctions = async (
        tab = activeTab,
        category = null,
        limit = 4,
        sortBy = "highestBid"
    ) => {
        setLoading(true);
        try {
            const status = tabStatusMap[tab];
            const params = new URLSearchParams();
            params.append("status", status);
            params.append("limit", limit.toString());
            params.append("sortBy", sortBy);
            if (category && category !== "all") {
                params.append("category", category);
            }

            const { data } = await axiosInstance.get(
                `/api/v1/auctions/top?${params}`
            );
            if (data.success) {
                setAuctions(data.data.auctions);
            } else {
                setAuctions([]);
            }
        } catch (err) {
            console.error("Fetch auctions error:", err);
            setAuctions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuctions("active");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        fetchAuctions(tab);
    };

    const handleLoadByStatus = () => {
        const status = tabStatusMap[activeTab];
        const params = new URLSearchParams();
        params.append("status", status);
        navigate(`/auctions?${params.toString()}`);
    };

    // ============================================================
    // INTERSECTION OBSERVER
    //
    // Only start observing AFTER loading has finished.
    // ============================================================

    useEffect(() => {
        if (loading) return;

        const element = sectionRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => setVisible(entry.isIntersecting),
            { threshold: 0.15 }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [loading]);

    // ============================================================
    // LOADING SKELETON
    // ============================================================

    if (loading && auctions.length === 0) {
        return (
            <Container className="my-14">
                <div className="mb-8">
                    <div className="h-10 w-72 animate-pulse rounded bg-gray-200" />
                    <div className="mt-3 h-4 w-96 animate-pulse rounded bg-gray-200" />
                </div>

                <div className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(4)].map((_, index) => (
                        <div
                            key={index}
                            className="flex flex-col gap-3 rounded-[24px] border border-gray-100 bg-white p-3 shadow-sm"
                        >
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
                    ))}
                </div>
            </Container>
        );
    }

    // ============================================================
    // MAIN SECTION
    // ============================================================

    return (
        <section ref={sectionRef} className="relative overflow-hidden">
            {/* Background accent */}
            <div className="pointer-events-none absolute -right-40 top-20 h-[450px] w-[450px] rounded-full bg-[#C59D55]/[0.045] blur-[100px]" />

            <Container className="mt-14">
                {/* =================================================
                    HEADER
                ================================================== */}

                <div
                    className={`transition-all duration-1000 ease-out ${visible
                        ? "translate-y-0 opacity-100"
                        : "translate-y-8 opacity-0"
                        }`}
                >
                    <div className="flex items-center justify-between flex-wrap gap-y-3">
                        <h2 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-[-0.035em] text-[#111315] sm:text-5xl lg:text-[48px]">
                            {tabTitles[activeTab]}
                            <span className="ml-2 font-medium italic text-gray-400">
                                Auctions
                            </span>
                        </h2>

                        {/* Tab Switcher */}
                        <div className="flex space-x-2 bg-white p-1 border border-gray-500/50 rounded-md text-sm">
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    name="home-auction-tabs"
                                    id="home-tab-active"
                                    className="hidden peer"
                                    checked={activeTab === "active"}
                                    onChange={() => handleTabChange("active")}
                                />
                                <label
                                    htmlFor="home-tab-active"
                                    className="cursor-pointer rounded py-2 px-4 sm:px-8 text-[#1e2d3b] transition-colors duration-200 peer-checked:bg-[#C59D55] peer-checked:text-white"
                                >
                                    Live
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    name="home-auction-tabs"
                                    id="home-tab-sold"
                                    className="hidden peer"
                                    checked={activeTab === "sold"}
                                    onChange={() => handleTabChange("sold")}
                                />
                                <label
                                    htmlFor="home-tab-sold"
                                    className="cursor-pointer rounded py-2 px-4 sm:px-8 text-gray-500 transition-colors duration-200 peer-checked:bg-[#C59D55] peer-checked:text-white"
                                >
                                    Closed
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    name="home-auction-tabs"
                                    id="home-tab-approved"
                                    className="hidden peer"
                                    checked={activeTab === "approved"}
                                    onChange={() => handleTabChange("approved")}
                                />
                                <label
                                    htmlFor="home-tab-approved"
                                    className="cursor-pointer rounded py-2 px-4 sm:px-8 text-gray-500 transition-colors duration-200 peer-checked:bg-[#C59D55] peer-checked:text-white"
                                >
                                    Upcoming
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <p
                        className={`mt-3 max-w-2xl text-sm leading-7 text-gray-500 transition-all delay-150 duration-1000 ease-out md:text-base ${visible
                            ? "translate-y-0 opacity-100"
                            : "translate-y-5 opacity-0"
                            }`}
                    >
                        {tabDescriptions[activeTab]}
                    </p>
                </div>

                {/* =================================================
                    AUCTION GRID
                ================================================== */}

                {auctions.length > 0 ? (
                    <>
                        <section className="mt-10 grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {auctions.map((auction, index) => (
                                <div
                                    key={auction._id}
                                    className={`transition-all duration-1000 ease-out ${visible
                                        ? "translate-y-0 opacity-100"
                                        : "translate-y-10 opacity-0"
                                        }`}
                                    style={{
                                        transitionDelay: `${300 + index * 150}ms`,
                                    }}
                                >
                                    <AuctionCard auction={auction} />
                                </div>
                            ))}
                        </section>

                        {/* =================================================
                            VIEW MORE
                        ================================================== */}

                        <div
                            className={`mt-12 flex justify-center transition-all delay-[900ms] duration-1000 ease-out ${visible
                                ? "translate-y-0 opacity-100"
                                : "translate-y-6 opacity-0"
                                }`}
                        >
                            <button
                                onClick={handleLoadByStatus}
                                className="group flex items-center gap-2 rounded-lg bg-[#C59D55] px-8 py-3 font-medium text-white transition-all duration-300 hover:bg-[#D8B96F] hover:shadow-[0_0_35px_rgba(197,157,85,0.25)] focus:outline-none focus:ring-2 focus:ring-[#C59D55] focus:ring-offset-2"
                            >
                                <Gavel size={17} />
                                <span>View More Products</span>
                                <ArrowRight
                                    size={18}
                                    className="transition-transform duration-300 group-hover:translate-x-1"
                                />
                            </button>
                        </div>
                    </>
                ) : (
                    <div
                        className={`mt-10 text-center py-16 text-gray-500 transition-all duration-1000 ease-out ${visible
                            ? "translate-y-0 opacity-100"
                            : "translate-y-8 opacity-0"
                            }`}
                    >
                        <Filter
                            size={48}
                            className="mx-auto mb-4 text-gray-300"
                        />
                        <p className="text-lg font-medium">
                            No auctions found
                        </p>
                        <p className="text-sm">
                            Try adjusting your filters or search terms
                        </p>
                    </div>
                )}
            </Container>
        </section>
    );
}

export default HomeAuctionsSection;