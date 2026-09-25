import { useState, useEffect } from "react";
import { BidderContainer, BidderHeader, BidderSidebar, LoadingSpinner, AccountInactiveBanner } from "../../components";
import {
    ShoppingBag, Search, SortAsc, Banknote, Award, MessageCircle, Tag
} from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { Link } from "react-router-dom";

function PurchasedProducts() {
    const [products, setProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [statistics, setStatistics] = useState({
        totalPurchased: 0, totalSpent: 0, recentPurchases: 0
    });

    useEffect(() => { fetchPurchasedProducts(); }, []);

    const fetchPurchasedProducts = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data } = await axiosInstance.get(`/api/v1/auctions/won-auctions`, {
                params: { context: 'product' }
            });

            if (data.success) {
                // Filter to only buy_now products
                // const buyNowProducts = (data.data.auctions || []).filter(
                //     a => a.auctionType === 'buy_now'
                // );

                const buyNowProducts = data.data.auctions;

                setAllProducts(buyNowProducts);
                setProducts(buyNowProducts);

                const totalSpent = buyNowProducts.reduce(
                    (sum, p) => sum + (p.finalBid || p.finalPrice || 0), 0
                );
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const recentPurchases = buyNowProducts.filter(
                    p => new Date(p.endTime) > weekAgo
                ).length;

                setStatistics({
                    totalPurchased: buyNowProducts.length,
                    totalSpent,
                    recentPurchases
                });
            } else {
                setError("Failed to fetch purchased products");
            }
        } catch (err) {
            setError("Error loading purchased products");
            console.error("Fetch purchased products error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (allProducts.length === 0) return;

        let filtered = [...allProducts];

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case "newest":
                    return new Date(b.endTime) - new Date(a.endTime);
                case "highest_price":
                    return (b.finalBid || 0) - (a.finalBid || 0);
                case "lowest_price":
                    return (a.finalBid || 0) - (b.finalBid || 0);
                default:
                    return new Date(b.endTime) - new Date(a.endTime);
            }
        });

        setProducts(filtered);
    }, [searchTerm, sortBy, allProducts]);

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2
    }).format(amount || 0);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    if (loading) {
        return (
            <section className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
                <BidderSidebar />
                <div className="w-full relative">
                    <BidderHeader />
                    <BidderContainer>
                        <div className="flex justify-center items-center min-h-96">
                            <LoadingSpinner />
                        </div>
                    </BidderContainer>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
                <BidderSidebar />
                <div className="w-full relative">
                    <BidderHeader />
                    <BidderContainer>
                        <AccountInactiveBanner />
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                            <p className="text-red-600">{error}</p>
                            <button onClick={fetchPurchasedProducts}
                                className="mt-4 bg-[#C59D55] text-white hover:bg-[#C59D55]/90 px-4 py-2 rounded-lg">
                                Try Again
                            </button>
                        </div>
                    </BidderContainer>
                </div>
            </section>
        );
    }

    return (
        <section className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
            <BidderSidebar />
            <div className="w-full relative">
                <BidderHeader />
                <BidderContainer>
                    <AccountInactiveBanner />

                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <div className="flex items-center gap-3 mb-2">
                            <ShoppingBag className="text-[#C59D55]" size={32} />
                            <h2 className="text-3xl md:text-4xl font-bold">Bought Products</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#C59D55] text-white rounded-xl p-6 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-amber-100 text-sm">Total Purchases</p>
                                    <p className="text-3xl font-bold mt-1">{statistics.totalPurchased}</p>
                                    <p className="text-amber-200 text-xs mt-1">Products Bought</p>
                                </div>
                                <div className="p-3 bg-white/20 rounded-full">
                                    <ShoppingBag size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm">Total Spent</p>
                                    <p className="text-3xl font-bold mt-1">{formatCurrency(statistics.totalSpent)}</p>
                                    <p className="text-green-200 text-xs mt-1">On Products</p>
                                </div>
                                <div className="p-3 bg-white/20 rounded-full">
                                    <Banknote size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-xl p-6 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm">Recent Purchases</p>
                                    <p className="text-3xl font-bold mt-1">{statistics.recentPurchases}</p>
                                    <p className="text-blue-200 text-xs mt-1">This Week</p>
                                </div>
                                <div className="p-3 bg-white/20 rounded-full">
                                    <Award size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input type="text" placeholder="Search your bought products..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <SortAsc size={18} className="text-gray-500" />
                                <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="newest">Newest</option>
                                    <option value="highest_price">Highest Price</option>
                                    <option value="lowest_price">Lowest Price</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {products.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
                            {products.map((product) => (
                                <div key={product._id}
                                    className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transform hover:scale-[102%] transition-all duration-300">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                                                        {product.category}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900">{product.title}</h3>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {formatCurrency(product.finalBid || product.finalPrice)}
                                                    {product?.commissionAmount && (
                                                    <span className="text-sm font-semibold text-green-600"> (+ {formatCurrency(product.commissionAmount)})</span>
                                                )}
                                                </div>
                                                <div className="text-sm text-gray-500">Final Price + Fee</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Purchased On</p>
                                                <p className="font-semibold">{formatDate(product.winTime)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Product Price</p>
                                                <p className="font-semibold">{formatCurrency(product.startingBid)}</p>
                                            </div>
                                            {product.paymentStatus && (
                                                <div>
                                                    <p className="text-sm text-gray-500">Payment Status</p>
                                                    <p className="font-semibold capitalize text-blue-600">
                                                        {product.paymentStatus === 'completed'
                                                            ? 'Payment Received'
                                                            : product.paymentStatus}
                                                    </p>
                                                </div>
                                            )}
                                            {product.invoice && Object.keys(product.invoice).length > 0 && (
                                                <div>
                                                    <p className="text-sm text-gray-500">Invoice</p>
                                                    <Link target="_blank" to={product.invoice.url}
                                                        className="font-semibold underline">
                                                        View
                                                    </Link>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <Link to={`/product/${product._id}`} target="_blank"
                                                className="text-center bg-green-600 text-white hover:bg-green-700 py-3 rounded-lg font-semibold transition-all">
                                                View Product
                                            </Link>
                                            <Link to={`/bidder/communication/${product._id}`}
                                                className="text-center bg-[#C59D55] text-white hover:bg-[#C59D55]/90 py-3 rounded-lg font-semibold transition-all">
                                                Contact Admin
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center mb-16">
                            <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                                {searchTerm ? "No matching products found" : "No products bought yet"}
                            </h3>
                            <p className="text-gray-500 mb-6">
                                {searchTerm
                                    ? "Try adjusting your search criteria"
                                    : "Browse our products and purchase directly to see them here!"}
                            </p>
                            <Link to="/products"
                                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all">
                                Browse Products
                            </Link>
                        </div>
                    )}
                </BidderContainer>
            </div>
        </section>
    );
}

export default PurchasedProducts;