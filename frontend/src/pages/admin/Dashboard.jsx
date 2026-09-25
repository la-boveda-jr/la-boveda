import { useEffect, useState } from "react";
import { LoadingSpinner, AdminContainer, AdminHeader, AdminSidebar } from "../../components";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import {
    TrendingUp, Users, Gavel, Banknote, Settings, Crown, Heart, MessageCircle,
    Hand, Store, UserCog, CheckSquare, Tag, Clock, ShoppingBag
} from "lucide-react";
import { Link } from "react-router-dom";

function Dashboard() {
    const [loading, setLoading] = useState(false);
    const [adminStats, setAdminStats] = useState({
        totalUsers: 0, totalAuctions: 0, totalProducts: 0,
        totalAuctionRevenue: 0, totalProductRevenue: 0,
        activeAuctions: 0, activeProducts: 0,
        pendingAuctionModeration: 0, pendingProductModeration: 0,
    });

    const fetchAdminStats = async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get('/api/v1/admin/stats');
            if (data.success) setAdminStats(data.data);
        } catch (err) {
            console.error('Fetch admin stats error:', err);
            toast.error("Failed to load admin dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAdminStats(); }, []);

    const userStatsData = [
        {
            title: "Total Users", value: adminStats.totalUsers?.toLocaleString('en-US'),
            icon: <Users size={24} />, trend: "up", description: "Registered Users"
        },
        {
            title: "Total Bidders", value: adminStats?.userTypeStats?.bidder?.toLocaleString('en-US') || 0,
            icon: <Hand size={24} />, trend: "up", description: "Registered Bidders"
        },
        {
            title: "Total Sellers", value: adminStats?.userTypeStats?.seller?.toLocaleString('en-US') || 0,
            icon: <Store size={24} />, trend: "up", description: "Registered Sellers"
        },
        {
            title: "Total Admins", value: adminStats?.userTypeStats?.admin?.toLocaleString('en-US') || 0,
            icon: <UserCog size={24} />, trend: "up", description: "Registered Admins"
        },
    ];

    const auctionStatsData = [
        {
            title: "Total Auctions", value: adminStats.totalAuctions?.toLocaleString('en-US'),
            icon: <Gavel size={24} />, trend: "up", description: "All Auctions"
        },
        {
            title: "Active Auctions", value: adminStats.activeAuctions?.toLocaleString('en-US'),
            icon: <Gavel size={24} />, trend: "up", description: "Live Auctions"
        },
        {
            title: "Sold Auctions", value: adminStats.totalSoldAuctions?.toLocaleString('en-US'),
            icon: <Gavel size={24} />, trend: "up", description: "Won By Bidders"
        },
        {
            title: "Pending Auctions", value: adminStats?.pendingAuctionModeration?.toLocaleString('en-US') || 0,
            icon: <CheckSquare size={24} />, trend: "down", description: "Need Approval"
        },
        {
            title: "Auction Revenue", value: adminStats.totalAuctionRevenue?.toLocaleString('en-US'),
            icon: <Banknote size={24} />, trend: "up", currency: "$", description: "All-time"
        },
        {
            title: "Auctions Ending Today", value: adminStats.auctionsEndingToday?.toLocaleString('en-US') || 0,
            icon: <Clock size={24} />, trend: "up", description: "Within 24 hours"
        },
        {
            title: "Auction Success Rate", value: adminStats.auctionSuccessRate || 0,
            icon: <TrendingUp size={24} />, trend: "up", suffix: "%", description: "Sold / completed"
        },
        {
            title: "Auction Commission", value: adminStats.totalAuctionCommission?.toLocaleString('en-US') || 0,
            icon: <Banknote size={24} />, trend: "up", currency: "$", description: "All-time commission"
        },
    ];

    const productStatsData = [
        {
            title: "Total Products", value: adminStats.totalProducts?.toLocaleString('en-US') || 0,
            icon: <ShoppingBag size={24} />, trend: "up", description: "All Products"
        },
        {
            title: "Active Products", value: adminStats.activeProducts?.toLocaleString('en-US') || 0,
            icon: <Tag size={24} />, trend: "up", description: "Available"
        },
        {
            title: "Sold Products", value: adminStats.totalSoldProducts?.toLocaleString('en-US') || 0,
            icon: <Tag size={24} />, trend: "up", description: "Purchased"
        },
        {
            title: "Pending Products", value: adminStats?.pendingProductModeration?.toLocaleString('en-US') || 0,
            icon: <CheckSquare size={24} />, trend: "down", description: "Need Approval"
        },
        {
            title: "Product Revenue", value: adminStats.totalProductRevenue?.toLocaleString('en-US') || 0,
            icon: <Banknote size={24} />, trend: "up", currency: "$", description: "All-time"
        },
        {
            title: "Product Success Rate", value: adminStats.productSuccessRate || 0,
            icon: <TrendingUp size={24} />, trend: "up", suffix: "%", description: "Sold / completed"
        },
    ];

    const engagementStatsData = [
        {
            title: "Total Comments", value: adminStats?.totalComments?.toLocaleString('en-US'),
            icon: <MessageCircle size={24} />, trend: "up", description: "By The Users"
        },
        {
            title: "Watchlist", value: adminStats?.totalWatchlists?.toLocaleString('en-US'),
            icon: <Heart size={24} />, trend: "up", description: "Saved to Watch Later"
        },
        {
            title: "Total Bids", value: adminStats?.totalBids?.toLocaleString('en-US'),
            icon: <Gavel size={24} />, trend: "up", description: "On all auctions"
        },
        {
            title: "Recent Bids", value: adminStats?.recentBids?.toLocaleString('en-US'),
            icon: <Gavel size={24} />, trend: "up", description: "Last 24h"
        },
    ];

    const renderStatGrid = (stats) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(stat => (
                <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-gray-500">{stat.title}</p>
                            <h3 className="text-2xl font-bold mt-1">
                                {stat.currency && <span>{stat.currency}</span>}
                                {stat.value}
                                {stat.suffix && <span>{stat.suffix}</span>}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {stat.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <section className="flex min-h-screen bg-gray-50">
            <AdminSidebar />
            <div className="w-full relative">
                <AdminHeader />
                <AdminContainer>
                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <div className="flex items-center gap-3 mb-2">
                            <Crown size={32} className="text-[#1e2d3b]" />
                            <h2 className="text-3xl md:text-4xl font-bold">Admin Dashboard</h2>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-12"><LoadingSpinner /></div>
                    ) : (
                        <>
                            <h3 className="text-xl font-semibold mb-4">Users Overview</h3>
                            <div className="mb-8">{renderStatGrid(userStatsData)}</div>

                            <h3 className="text-xl font-semibold mb-4 mt-8">Auctions</h3>
                            <div className="mb-8">{renderStatGrid(auctionStatsData)}</div>

                            <h3 className="text-xl font-semibold mb-4 mt-8">Products</h3>
                            <div className="mb-8">{renderStatGrid(productStatsData)}</div>

                            <h3 className="text-xl font-semibold mb-4 mt-8">Engagement</h3>
                            <div className="mb-8">{renderStatGrid(engagementStatsData)}</div>

                            {adminStats.highestSaleAuction && (
                                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 shadow-sm border border-purple-200 mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Crown size={20} className="text-[#1e2d3b]" />
                                        <h3 className="text-lg font-semibold text-[#1e2d3b]">Highest Auction Sale</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-[#1e2d3b]">
                                        ${adminStats.highestSaleAuction.amount?.toLocaleString('en-US')}
                                    </p>
                                    <p className="text-sm text-[#1e2d3b] mt-1">{adminStats.highestSaleAuction.title}</p>
                                </div>
                            )}

                            {adminStats.highestSaleProduct && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 shadow-sm border border-green-200 mb-8">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShoppingBag size={20} className="text-green-700" />
                                        <h3 className="text-lg font-semibold text-green-700">Highest Product Sale</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-green-700">
                                        ${adminStats.highestSaleProduct.amount?.toLocaleString('en-US')}
                                    </p>
                                    <p className="text-sm text-green-700 mt-1">{adminStats.highestSaleProduct.title}</p>
                                </div>
                            )}

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-16">
                                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Link to="/admin/users"
                                        className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors group">
                                        <Users size={24} className="mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
                                        <p className="text-sm font-medium text-blue-800">User Management</p>
                                    </Link>
                                    <Link to="/admin/auctions/all"
                                        className="bg-green-50 border border-green-200 rounded-lg p-4 text-center hover:bg-green-100 transition-colors group">
                                        <Gavel size={24} className="mx-auto mb-2 text-green-600 group-hover:scale-110 transition-transform" />
                                        <p className="text-sm font-medium text-green-800">Auction Oversight</p>
                                    </Link>
                                    <Link to="/admin/products/all"
                                        className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center hover:bg-purple-100 transition-colors group">
                                        <ShoppingBag size={24} className="mx-auto mb-2 text-purple-600 group-hover:scale-110 transition-transform" />
                                        <p className="text-sm font-medium text-purple-800">Product Oversight</p>
                                    </Link>
                                    <Link to="/admin/commissions"
                                        className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center hover:bg-amber-100 transition-colors group">
                                        <Settings size={24} className="mx-auto mb-2 text-amber-600 group-hover:scale-110 transition-transform" />
                                        <p className="text-sm font-medium text-amber-800">Commission Settings</p>
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </AdminContainer>
            </div>
        </section>
    );
}

export default Dashboard;