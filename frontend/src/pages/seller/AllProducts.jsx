import { useEffect, useState, useRef } from "react";
import { LoadingSpinner, SellerContainer, SellerHeader, SellerSidebar } from "../../components";
import { Award, BarChart3, Search, SortAsc, MoreVertical, Tag } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { Link } from "react-router-dom";

function AllProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1, totalPages: 1, totalAuctions: 0
    });

    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [activeDropdown, setActiveDropdown] = useState(null);

    const dropdownRef = useRef();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchProducts = async (page = 1, loadMore = false) => {
        try {
            if (loadMore) setLoadingMore(true);
            else setLoading(true);

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '12',
                status: '',
                context: 'product'
            });

            const { data } = await axiosInstance.get(`/api/v1/auctions/user/my-auctions?${params}`);

            if (data.success) {
                if (loadMore) setProducts(prev => [...prev, ...data.data.auctions]);
                else setProducts(data.data.auctions);
                setPagination(data.data.pagination);
            }
        } catch (err) {
            console.error('Fetch products error:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => { fetchProducts(); }, []);

    const filteredProducts = products
        .filter(product => {
            const matchesSearch = searchTerm === "" ||
                product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesStatus = true;
            switch (filter) {
                case "active":
                    matchesStatus = product.status === 'active';
                    break;
                case "upcoming":
                    matchesStatus = product.status === 'approved' || product.status === 'draft';
                    break;
                case "pending":
                    matchesStatus = product.status === 'draft';
                    break;
                case "sold":
                    matchesStatus = product.status === 'sold';
                    break;
                case "cancelled":
                    matchesStatus = product.status === 'cancelled';
                    break;
                default:
                    matchesStatus = true;
            }

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "highest_price":
                    return (b.buyNowPrice || 0) - (a.buyNowPrice || 0);
                case "lowest_price":
                    return (a.buyNowPrice || 0) - (b.buyNowPrice || 0);
                case "newest":
                    return new Date(b.createdAt) - new Date(a.createdAt);
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

    const getStatusBadge = (product) => {
        switch (product.status) {
            case 'active':
                return { class: "bg-green-100 text-green-800", text: "Available" };
            case 'draft':
                return { class: "bg-blue-100 text-blue-800", text: "Pending Approval" };
            case 'sold':
                return { class: "bg-gray-100 text-gray-800", text: "Sold" };
            case 'cancelled':
                return { class: "bg-red-100 text-red-800", text: "Cancelled" };
            default:
                return { class: "bg-gray-100 text-gray-800", text: product.status };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    return (
        <section className="flex min-h-[70vh]">
            <SellerSidebar />

            <div className="w-full relative">
                <SellerHeader />

                <SellerContainer>
                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <h2 className="text-3xl md:text-4xl font-bold my-5">All Products</h2>
                            <Link to="/seller/products/create"
                                className="bg-[#C59D55] text-white hover:bg-[#C59D55]/90 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors w-fit">
                                <Tag size={18} />Create Product
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input type="text"
                                        placeholder="Search your products by title or description..."
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

                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => setFilter("all")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "all" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                All
                            </button>
                            <button onClick={() => setFilter("active")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "active" ? "bg-green-100 text-green-800 border border-green-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                Active
                            </button>
                            <button onClick={() => setFilter("pending")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "pending" ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                Pending
                            </button>
                            <button onClick={() => setFilter("sold")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "sold" ? "bg-gray-200 text-gray-800 border border-gray-300" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                Sold
                            </button>
                            <button onClick={() => setFilter("cancelled")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === "cancelled" ? "bg-red-100 text-red-800 border border-red-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                Cancelled
                            </button>
                        </div>
                    </div>

                    <div ref={dropdownRef} className="bg-white rounded-xl shadow-sm border border-gray-100 mb-16 min-h-[300px]">
                        {loading ? (
                            <div className="flex justify-center items-center py-12 min-h-[300px]">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <div className="overflow-x-auto min-h-[300px]">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listed</th>
                                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredProducts.map((product) => {
                                            const statusConfig = getStatusBadge(product);
                                            return (
                                                <tr key={product._id} className="hover:bg-gray-50">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-lg flex items-center justify-center">
                                                                {product.photos && product.photos.length > 0 ? (
                                                                    <img src={product.photos[0].url} alt={product.title}
                                                                        className="h-10 w-10 object-cover rounded-lg" />
                                                                ) : (
                                                                    <Tag size={18} className="text-gray-500" />
                                                                )}
                                                            </div>
                                                            <div className="ml-4">
                                                                <Link to={`/product/${product._id}`} target="_blank"
                                                                    className="font-medium text-gray-900 hover:underline">{product.title}</Link>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-gray-900">
                                                        ${(product.buyNowPrice || product.startPrice)?.toLocaleString('en-US')}
                                                    </td>
                                                    <td className="py-4 px-6 text-sm">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.class}`}>
                                                            {statusConfig.text}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-gray-900">
                                                        {formatDate(product.createdAt)}
                                                    </td>
                                                    <td className="py-4 px-6 text-sm font-medium text-center">
                                                        <div className="relative inline-block">
                                                            <MoreVertical className="cursor-pointer mx-auto"
                                                                onClick={() => setActiveDropdown(activeDropdown === product._id ? null : product._id)} />
                                                            {activeDropdown === product._id && (
                                                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg py-2 z-50 rounded-md min-w-[180px]">
                                                                    <div className="flex flex-col">
                                                                        <Link to={`/product/${product._id}`} target="_blank"
                                                                            className="px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                                                            onClick={() => setActiveDropdown(null)}>
                                                                            View
                                                                        </Link>
                                                                        <Link to={`/seller/products/edit/${product._id}`}
                                                                            className="px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                                                            onClick={() => setActiveDropdown(null)}>
                                                                            Edit
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {filteredProducts.length === 0 && !loading && (
                                    <div className="text-center py-12 min-h-[200px]">
                                        <BarChart3 size={48} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-500">
                                            {products.length === 0 ? "No products found" : "No products match your filters"}
                                        </p>
                                        {products.length > 0 && (
                                            <button onClick={() => { setSearchTerm(""); setFilter("all"); }}
                                                className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                                                Clear filters
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </SellerContainer>
            </div>
        </section>
    );
}

export default AllProducts;