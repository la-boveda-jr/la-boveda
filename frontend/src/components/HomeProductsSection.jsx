import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ShoppingBag,
    ArrowRight,
    Filter,
    Sparkles,
    PackageCheck,
} from "lucide-react";
import { Container, ProductCard, LoadingSpinner } from "./index";
import axiosInstance from "../utils/axiosInstance";

function HomeProductsSection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    const sectionRef = useRef(null);
    const navigate = useNavigate();

    // ============================================================
    // FETCH PRODUCTS
    // ============================================================

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const { data } = await axiosInstance.get(`/api/v1/auctions`, {
                    params: {
                        context: "product",
                        status: "active",
                        limit: 4,
                        sortBy: "createdAt",
                        sortOrder: "desc",
                    },
                });
                if (data.success) setProducts(data.data.auctions);
                else setProducts([]);
            } catch (err) {
                console.error("Fetch home products error:", err);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // ============================================================
    // INTERSECTION OBSERVER
    //
    // Only observe AFTER loading is finished, matching the
    // pattern used by CategoryIconsSection.
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

    const handleViewMore = () => navigate("/products");

    // ============================================================
    // LOADING SKELETON
    // ============================================================

    if (loading) {
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
            <div className="pointer-events-none absolute -left-40 top-20 h-[400px] w-[400px] rounded-full bg-[#C59D55]/[0.045] blur-[100px]" />

            <Container className="mt-14">
                {/* =================================================
                    HEADER
                ================================================== */}

                <div
                    className={`transition-all duration-1000 ease-out ${
                        visible
                            ? "translate-y-0 opacity-100"
                            : "translate-y-8 opacity-0"
                    }`}
                >
                    <div className="flex items-center justify-between flex-wrap gap-y-3">
                        <div>
                            {/* Eyebrow */}
                            {/* <div className="mb-4 flex items-center gap-3">
                                <span className="h-px w-10 bg-[#C59D55]" />
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A17B35]">
                                    Buy Now
                                </span>
                            </div> */}

                            {/* Heading */}
                            <h2 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-[-0.035em] text-[#111315] sm:text-5xl lg:text-[48px]">
                                Shop
                                <span className="ml-2 font-medium italic text-gray-400">
                                    Products.
                                </span>
                            </h2>
                        </div>

                        {/* Right-side badge */}
                        <div className="flex items-center gap-2 rounded-full border border-[#C59D55]/30 bg-[#C59D55]/[0.08] px-4 py-2 text-sm font-semibold text-[#A17B35] backdrop-blur-md">
                            <Sparkles size={15} />
                            Instantly Available
                        </div>
                    </div>

                    {/* Description */}
                    <p
                        className={`mt-5 max-w-3xl text-sm leading-7 text-gray-500 transition-all delay-150 duration-1000 ease-out md:text-base ${
                            visible
                                ? "translate-y-0 opacity-100"
                                : "translate-y-5 opacity-0"
                        }`}
                    >
                        Skip the bidding — purchase premium items directly with
                        a single click. Secure, verified, and ready to ship.
                    </p>
                </div>

                {/* =================================================
                    PRODUCT GRID
                ================================================== */}

                {products.length > 0 ? (
                    <>
                        <section className="mt-10 grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {products.map((product, index) => (
                                <div
                                    key={product._id}
                                    className={`transition-all duration-1000 ease-out ${
                                        visible
                                            ? "translate-y-0 opacity-100"
                                            : "translate-y-10 opacity-0"
                                    }`}
                                    style={{
                                        transitionDelay: `${300 + index * 150}ms`,
                                    }}
                                >
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </section>

                        {/* =================================================
                            VIEW MORE
                        ================================================== */}

                        <div
                            className={`mt-12 flex justify-center transition-all delay-[900ms] duration-1000 ease-out ${
                                visible
                                    ? "translate-y-0 opacity-100"
                                    : "translate-y-6 opacity-0"
                            }`}
                        >
                            <button
                                onClick={handleViewMore}
                                className="group flex items-center gap-2 rounded-lg bg-[#C59D55] px-8 py-3 font-medium text-white transition-all duration-300 hover:bg-[#D8B96F] hover:shadow-[0_0_35px_rgba(197,157,85,0.25)] focus:outline-none focus:ring-2 focus:ring-[#C59D55] focus:ring-offset-2"
                            >
                                <ShoppingBag size={17} />
                                <span>View More Products</span>
                                <ArrowRight
                                    size={18}
                                    className="transition-transform duration-300 group-hover:translate-x-1"
                                />
                            </button>
                        </div>

                        {/* Bottom meta strip — mirrors HowItWorks footer */}
                        <div
                            className={`mx-auto mt-14 max-w-4xl transition-all delay-[1100ms] duration-1000 ease-out ${
                                visible
                                    ? "translate-y-0 opacity-100"
                                    : "translate-y-8 opacity-0"
                            }`}
                        >
                            <div className="flex flex-col items-center justify-between gap-5 rounded-2xl border border-gray-100 bg-gray-100/60 px-6 py-5 sm:flex-row sm:px-8">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C59D55]/10">
                                        <PackageCheck
                                            size={17}
                                            className="text-[#A17B35]"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 sm:text-sm">
                                        One click. No bidding. Yours instantly.
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 text-[11px] font-medium text-gray-400">
                                    <span>Verified</span>
                                    <span className="h-1 w-1 rounded-full bg-[#C59D55]" />
                                    <span>Instant</span>
                                    <span className="h-1 w-1 rounded-full bg-[#C59D55]" />
                                    <span>Secure</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div
                        className={`mt-10 text-center py-16 text-gray-500 transition-all duration-1000 ease-out ${
                            visible
                                ? "translate-y-0 opacity-100"
                                : "translate-y-8 opacity-0"
                        }`}
                    >
                        <Filter
                            size={48}
                            className="mx-auto mb-4 text-gray-300"
                        />
                        <p className="text-lg font-medium">
                            No products available
                        </p>
                        <p className="text-sm">
                            Check back soon for new listings
                        </p>
                    </div>
                )}
            </Container>
        </section>
    );
}

export default HomeProductsSection;