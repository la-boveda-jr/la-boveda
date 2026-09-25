import { useEffect, useState } from "react";
import { QuickActions, StatCard, SellerContainer, SellerHeader, SellerSidebar } from "../../components";
import {
    TrendingUp, Gavel, Award, Heart, DollarSign, Clock, Eye, ShoppingBag, Tag
} from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";

function Dashboard() {
    const [stats, setStats] = useState({});

    const fetchUserStats = async () => {
        try {
            const { data } = await axiosInstance.get('/api/v1/users/stats/seller');
            if (data.success) setStats(data.data.statistics);
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    };

    useEffect(() => { fetchUserStats(); }, []);

    const auctionStatsData = [
        {
            title: "Auction Revenue", value: stats?.totalRevenue?.toLocaleString('en-US'),
            icon: <DollarSign size={24} />, trend: "up", currency: "$", description: "All time"
        },
        {
            title: "Active Auctions", value: stats?.activeAuctions,
            icon: <Clock size={24} />, trend: "up", description: "Live right now"
        },
        {
            title: "Auctions Sold", value: stats?.soldAuctions,
            icon: <Award size={24} />, trend: "up", description: "Previously sold"
        },
        {
            title: "Auction Success Rate", value: stats?.successRate,
            icon: <TrendingUp size={24} />, trend: "up", suffix: "%", description: "Sold % of completed"
        },
        {
            title: "Total Bids Received", value: stats?.totalBidsReceived,
            icon: <Gavel size={24} />, trend: "up", description: "All time"
        },
        {
            title: "Avg. Sale Price", value: stats?.avgSalePrice?.toLocaleString('en-US'),
            icon: <DollarSign size={24} />, trend: "up", currency: "$", description: "Per auction sold"
        },
        {
            title: "Auction Watchlists", value: stats?.totalWatchlists,
            icon: <Heart size={24} />, trend: "up", description: "Saved by users"
        },
        {
            title: "Auction Views", value: stats?.totalViews,
            icon: <Eye size={24} />, trend: "up", description: "All auctions"
        },
    ];

    const productStatsData = [
        {
            title: "Product Revenue", value: stats?.productRevenue?.toLocaleString('en-US'),
            icon: <DollarSign size={24} />, trend: "up", currency: "$", description: "All time"
        },
        {
            title: "Active Products", value: stats?.activeProducts,
            icon: <ShoppingBag size={24} />, trend: "up", description: "Available"
        },
        {
            title: "Sold Products", value: stats?.soldProducts,
            icon: <Award size={24} />, trend: "up", description: "Purchased by buyers"
        },
        {
            title: "Pending Products", value: stats?.draftProducts,
            icon: <Clock size={24} />, trend: "down", description: "Awaiting approval"
        },
        {
            title: "Product Success Rate", value: stats?.productSuccessRate,
            icon: <TrendingUp size={24} />, trend: "up", suffix: "%", description: "Sold / completed"
        },
        {
            title: "Avg. Product Price", value: stats?.avgProductPrice?.toLocaleString('en-US'),
            icon: <DollarSign size={24} />, trend: "up", currency: "$", description: "Per product sold"
        },
        {
            title: "Product Views", value: stats?.productViews,
            icon: <Eye size={24} />, trend: "up", description: "All products"
        },
    ];

    return (
        <section className="flex min-h-[70vh]">
            <SellerSidebar />
            <div className="w-full relative">
                <SellerHeader />
                <SellerContainer>
                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <h2 className="text-3xl md:text-4xl font-bold my-5">Seller Dashboard</h2>
                    </div>

                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Gavel size={22} className="text-[#1e2d3b]" />
                        Auctions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {auctionStatsData.map(stat => (
                            <StatCard key={stat.title} {...stat} />
                        ))}
                    </div>

                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Tag size={22} className="text-[#1e2d3b]" />
                        Products
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {productStatsData.map(stat => (
                            <StatCard key={stat.title} {...stat} />
                        ))}
                    </div>

                    <div className="space-y-6 mb-16">
                        <QuickActions />
                    </div>
                </SellerContainer>
            </div>
        </section>
    );
}

export default Dashboard;