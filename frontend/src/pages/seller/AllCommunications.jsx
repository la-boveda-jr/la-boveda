import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    SellerSidebar, SellerHeader, SellerContainer, LoadingSpinner,
} from "../../components";
import axiosInstance from "../../utils/axiosInstance";
import { Search, MessageCircle, Eye, User, Calendar, Tag, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

const AllCommunications = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [communications, setCommunications] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchCommunications();
    }, []);

    const fetchCommunications = async () => {
        try {
            setLoading(true);
            const { data } = await axiosInstance.get("/api/v1/communication/seller/all");
            if (data.success) {
                setCommunications(data.data);
            } else {
                setError("Failed to load communications");
            }
        } catch (err) {
            console.error(err);
            setError("Error loading communications");
        } finally {
            setLoading(false);
        }
    };

    const filtered = communications.filter((comm) => {
        const title = comm.auction?.title?.toLowerCase() || "";
        const bidder = comm.winningBidder?.username?.toLowerCase() || "";
        const term = searchTerm.toLowerCase();
        return title.includes(term) || bidder.includes(term);
    });

    const isProduct = (comm) => comm.auction?.auctionType === "buy_now";

    if (loading) {
        return (
            <section className="flex min-h-screen bg-gray-50">
                <SellerSidebar />
                <div className="w-full relative">
                    <SellerHeader />
                    <SellerContainer>
                        <div className="flex justify-center items-center min-h-96">
                            <LoadingSpinner />
                        </div>
                    </SellerContainer>
                </div>
            </section>
        );
    }

    return (
        <section className="flex min-h-screen bg-gray-50">
            <SellerSidebar />
            <div className="w-full relative">
                <SellerHeader />
                <SellerContainer>
                    <div className="pt-16 md:pt-0">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                                    My Communications
                                </h2>
                                <p className="text-secondary mt-1">
                                    Chat with the admin about items you've sold.
                                </p>
                            </div>
                            <div className="relative mt-3 md:mt-0">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by item or buyer..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C59D55] focus:border-transparent w-full md:w-80"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 mb-4">
                                {error}{" "}
                                <button onClick={fetchCommunications} className="underline ml-2">
                                    Retry
                                </button>
                            </div>
                        )}

                        {filtered.length === 0 ? (
                            <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
                                <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-700">
                                    No communications yet
                                </h3>
                                <p className="text-gray-500 mt-1">
                                    Once one of your auctions is won or a product is purchased,
                                    your conversations with the admin will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Item
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Buyer
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Final Price
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Last Activity
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filtered.map((comm) => (
                                                <tr key={comm._id} className="hover:bg-gray-50 transition">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isProduct(comm)
                                                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                                    : "bg-[#C59D55]/10 text-[#A17B35] border border-[#C59D55]/30"
                                                                }`}>
                                                                {isProduct(comm) ? (
                                                                    <><ShoppingBag size={11} /> Product</>
                                                                ) : (
                                                                    <><Tag size={11} /> Auction</>
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-900 mt-1">
                                                            {comm.auction?.title || "N/A"}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {comm?.auction?.categories?.[0] || ""}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <User size={14} className="text-gray-400 mr-1" />
                                                            <span className="text-sm">
                                                                {comm?.winningBidder?.username || "Unknown"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            ${comm?.auction?.finalPrice?.toLocaleString() || "0"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex items-center">
                                                            <Calendar size={14} className="mr-1" />
                                                            {comm?.lastMessageAt
                                                                ? format(new Date(comm.lastMessageAt), "MMM d, h:mm a")
                                                                : "—"}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <Link
                                                            to={`/seller/communication/${comm?.auction?._id}`}
                                                            className="inline-flex items-center px-3 py-1 bg-[#C59D55] text-white rounded-lg hover:bg-[#C59D55]/90 transition"
                                                        >
                                                            <Eye size={16} className="mr-1" />
                                                            Open
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </SellerContainer>
            </div>
        </section>
    );
};

export default AllCommunications;