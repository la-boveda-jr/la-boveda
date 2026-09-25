import { useState, useEffect, useCallback } from "react";
import {
    BidderContainer, BidderHeader, BidderSidebar, AccountInactiveBanner,
    AuctionCard, AuctionListItem, LoadingSpinner,
    ProductCard
} from "../../components";
import {
    Tag, Search, SortAsc, ShoppingBag, Award, BarChart3, Loader, Grid, List
} from "lucide-react";
import { useAuctions } from "../../hooks/useAuctions";
import { useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";

function ActiveProducts() {
    const {
        auctions: products,
        loading,
        loadingMore,
        pagination,
        loadMoreAuctions,
        updateFilters,
    } = useAuctions({}, { context: 'product' });

    const location = useLocation();

    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [viewMode, setViewMode] = useState("grid");
    const [statusFilter, setStatusFilter] = useState("active");

    // Parent/subcategory dropdowns
    const [parentCategories, setParentCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [selectedParent, setSelectedParent] = useState("");

    // Debounce timer for search
    const [debounceTimer, setDebounceTimer] = useState(null);

    // Fetch parent categories once
    useEffect(() => {
        const fetchParents = async () => {
            try {
                const { data } = await axiosInstance.get('/api/v1/categories/public/parents');
                if (data.success) setParentCategories(data.data);
            } catch (err) {
                console.error('Failed to load categories', err);
            }
        };
        fetchParents();
    }, []);

    // Fetch subcategories when parent changes
    useEffect(() => {
        const fetchSubs = async () => {
            if (!selectedParent) {
                setSubCategories([]);
                return;
            }
            try {
                const { data } = await axiosInstance.get(
                    `/api/v1/categories/public/${selectedParent}/children`
                );
                if (data.success) setSubCategories(data.data.subcategories);
            } catch (err) {
                setSubCategories([]);
            }
        };
        fetchSubs();
    }, [selectedParent]);

    // Debounced search
    const debouncedUpdate = useCallback((filters) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const t = setTimeout(() => updateFilters(filters), 500);
        setDebounceTimer(t);
    }, [debounceTimer, updateFilters]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        debouncedUpdate({ search: value });
    };

    const handleCategoryChange = (e) => {
        const value = e.target.value;
        setCategoryFilter(value);

        // Update URL and filters
        const searchParams = new URLSearchParams(location.search);
        if (value && value !== "all") searchParams.set('categories', value);
        else searchParams.delete('categories');
        const newUrl = `${location.pathname}?${searchParams.toString()}`;
        window.history.replaceState(null, '', newUrl);

        updateFilters({
            categories: value && value !== "all" ? [value] : [],
        });
    };

    const handleSortChange = (e) => {
        const value = e.target.value;
        setSortBy(value);

        let sortByField = "createdAt";
        let sortOrder = "desc";

        switch (value) {
            case "newest": sortByField = "createdAt"; sortOrder = "desc"; break;
            case "oldest": sortByField = "createdAt"; sortOrder = "asc"; break;
            case "highest_price": sortByField = "currentPrice"; sortOrder = "desc"; break;
            case "lowest_price": sortByField = "currentPrice"; sortOrder = "asc"; break;
            default: break;
        }

        updateFilters({ sortBy: sortByField, sortOrder });
    };

    const handleStatusChange = (status) => {
        setStatusFilter(status);
        updateFilters({ status: status === "all" ? "" : status });
    };

    // Client-side filter for the two categories the API doesn't cover (the API already filters by status and categories)
    const filteredProducts = products.filter((p) => {
        const matchesSearch = !searchTerm ||
            p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = categoryFilter === "all" || (
            Array.isArray(p.categories) && p.categories.includes(categoryFilter)
        );

        return matchesSearch && matchesCategory;
    });

    const stats = {
        total: pagination?.totalAuctions || 0,
        shown: filteredProducts.length,
    };

    return (
        <section className="flex min-h-screen">
            <BidderSidebar />

            <div className="w-full relative">
                <BidderHeader />

                <BidderContainer>
                    <AccountInactiveBanner />

                    {/* Header */}
                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                                <ShoppingBag className="text-[#C59D55]" size={32} />
                                <h2 className="text-3xl md:text-4xl font-bold my-5">
                                    Active Products
                                </h2>
                            </div>
                            <div className="mt-4 md:mt-0">
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {stats.shown} items available
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats row */}
                    {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-500">Available Products</p>
                                    <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
                                    <p className="text-sm text-green-600 mt-1">Ready to buy</p>
                                </div>
                                <div className="p-3 rounded-lg bg-green-100 text-green-600">
                                    <ShoppingBag size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-500">Showing</p>
                                    <h3 className="text-2xl font-bold mt-1">{stats.shown}</h3>
                                    <p className="text-sm text-blue-600 mt-1">With current filters</p>
                                </div>
                                <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                                    <Tag size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-500">Sort</p>
                                    <h3 className="text-lg font-bold mt-1 capitalize">
                                        {sortBy.replace('_', ' ')}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">Current order</p>
                                </div>
                                <div className="p-3 rounded-lg bg-amber-100 text-amber-600">
                                    <SortAsc size={24} />
                                </div>
                            </div>
                        </div>
                    </div> */}

                    {/* Filters bar */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search products by title or description..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Sort */}
                                <div className="flex items-center gap-2">
                                    <SortAsc size={18} className="text-gray-500" />
                                    <select
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={sortBy}
                                        onChange={handleSortChange}
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                        <option value="highest_price">Price: High to Low</option>
                                        <option value="lowest_price">Price: Low to High</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Quick status filters */}
                        {/* <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => handleStatusChange("active")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${statusFilter === "active"
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                            >
                                Available
                            </button>
                            <button
                                onClick={() => handleStatusChange("sold")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${statusFilter === "sold"
                                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                            >
                                Sold
                            </button>
                            <button
                                onClick={() => handleStatusChange("all")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${statusFilter === "all"
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                            >
                                All
                            </button>
                        </div> */}
                    </div>

                    {/* Products grid/list */}
                    {loading ? (
                        <div className="flex justify-center items-center py-24">
                            <LoadingSpinner />
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <>
                            {viewMode === "grid" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
                                    {filteredProducts.map(product => (
                                        // <AuctionCard key={product._id} auction={product} />
                                        <ProductCard
                                            key={product?._id}
                                            product={product}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 mb-16">
                                    {filteredProducts.map(product => (
                                        <AuctionListItem key={product._id} auction={product} />
                                    ))}
                                </div>
                            )}

                            {/* Load more */}
                            {pagination?.currentPage < pagination?.totalPages && (
                                <div className="flex justify-center mt-12 mb-16">
                                    <button
                                        onClick={loadMoreAuctions}
                                        disabled={loadingMore}
                                        className="px-8 py-3 bg-[#C59D55] text-white rounded-lg hover:bg-[#C59D55]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader size={16} className="animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                Load More Products
                                                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                                    {pagination.totalAuctions - products.length} more
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {pagination?.currentPage >= pagination?.totalPages && products.length > 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <p>You've seen all {pagination.totalAuctions} products</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center mb-16">
                            <BarChart3 size={64} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                                No products found
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Try adjusting your search criteria or filters.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setCategoryFilter("all");
                                    setSelectedParent("");
                                    handleStatusChange("active");
                                }}
                                className="bg-[#C59D55] text-white hover:bg-[#C59D55]/90 px-6 py-2 rounded-lg transition-colors"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </BidderContainer>
            </div>
        </section>
    );
}

export default ActiveProducts;