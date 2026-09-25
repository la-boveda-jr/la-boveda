import { useEffect, useState } from "react";
import {
    LoadingSpinner, StatCard, BidderContainer, BidderHeader, BidderSidebar,
    AccountInactiveBanner
} from "../../components";
import {
    Gavel, Award, Banknote, Bookmark, Hand, ShoppingBag
} from "lucide-react";
import { Link } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";

function Dashboard() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({});

    const fetchUserStats = async () => {
        try {
            const { data } = await axiosInstance.get('/api/v1/users/stats/bidder');
            if (data.success) {
                setLoading(true);
                setStats(data.data.statistics);
            }
        } catch (err) {
            console.error('Fetch stats error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUserStats(); }, []);

    const auctionStatsData = [
        {
            title: "Active Bids",
            value: stats?.activeBids?.toLocaleString('en-US'),
            change: "On Live Auctions",
            icon: <Gavel size={24} />,
            trend: "up",
            description: "Currently active"
        },
        {
            title: "Total Auctions",
            value: stats?.totalParticipatedAuctions?.toLocaleString('en-US'),
            change: "All Time",
            icon: <Hand size={24} />,
            trend: "up",
            description: "Participated in"
        },
        {
            title: "Auctions Won",
            value: stats?.wonAuctions?.toLocaleString('en-US'),
            change: "No. of Won Auctions",
            icon: <Award size={24} />,
            trend: "up",
            description: "Won auctions"
        },
        {
            title: "Watchlist Items",
            value: stats?.watchlistCount?.toLocaleString('en-US'),
            change: "Saved For Later",
            icon: <Bookmark size={24} />,
            trend: "up",
            description: "Auction watchlist"
        },
    ];

    const productStatsData = [
        {
            title: "Products Purchased",
            value: stats?.totalProductsPurchased?.toLocaleString('en-US'),
            change: "All Time",
            icon: <ShoppingBag size={24} />,
            trend: "up",
            description: "Total products bought"
        },
        {
            title: "Recent Purchases",
            value: stats?.recentPurchases?.toLocaleString('en-US'),
            change: "This Week",
            icon: <Award size={24} />,
            trend: "up",
            description: "Last 7 days"
        },
        {
            title: "Total Spent on Products",
            value: stats?.totalProductSpent?.toLocaleString('en-US'),
            change: "All Time",
            icon: <Banknote size={24} />,
            trend: "up",
            currency: "$",
            description: "Lifetime product spend"
        },
        {
            title: "Avg. Product Spend",
            value: stats?.avgProductSpent?.toLocaleString('en-US'),
            change: "Per Purchase",
            icon: <Banknote size={24} />,
            trend: "up",
            currency: "$",
            description: "Average per product"
        },
    ];

    return (
        <section className="flex min-h-[70vh]">
            <BidderSidebar />
            <div className="w-full relative">
                <BidderHeader />
                <BidderContainer>
                    <AccountInactiveBanner />
                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <h2 className="text-3xl md:text-4xl font-bold my-5">Bidder Dashboard</h2>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <>
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Gavel size={22} className="text-[#1e2d3b]" />
                                Auction Activity
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                {auctionStatsData.map(stat => (
                                    <StatCard key={stat.title} {...stat} />
                                ))}
                            </div>

                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <ShoppingBag size={22} className="text-[#1e2d3b]" />
                                Product Purchases
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                {productStatsData.map(stat => (
                                    <StatCard key={stat.title} {...stat} />
                                ))}
                            </div>

                            <div className="mt-8">
                                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Link to="/bidder/auctions/active"
                                        className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                                        <Gavel size={24} className="mx-auto mb-2 text-[#1e2d3b]" />
                                        <p className="text-sm font-medium">Browse Auctions</p>
                                    </Link>
                                    <Link to="/bidder/products/active"
                                        className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                                        <ShoppingBag size={24} className="mx-auto mb-2 text-[#1e2d3b]" />
                                        <p className="text-sm font-medium">Browse Products</p>
                                    </Link>
                                    <Link to="/bidder/watchlist"
                                        className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                                        <Bookmark size={24} className="mx-auto mb-2 text-[#1e2d3b]" />
                                        <p className="text-sm font-medium">View Watchlist</p>
                                    </Link>
                                    <Link to="/bidder/products/purchased"
                                        className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                                        <Award size={24} className="mx-auto mb-2 text-[#1e2d3b]" />
                                        <p className="text-sm font-medium">My Purchases</p>
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </BidderContainer>
            </div>
        </section>
    );
}

export default Dashboard;