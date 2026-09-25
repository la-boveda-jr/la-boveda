import { useState, useEffect, useCallback } from "react";
import { Filter, Search, SlidersHorizontal, X, Loader } from "lucide-react";
import { AuctionListItem, Container, ProductCard } from "../components";
import AuctionCard from "../components/AuctionCard";
import { useAuctions } from "../hooks/useAuctions";
import { useLocation } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

// Products don't have auction types — no auction-specific filters
const productFilters = {
    ALL: {}
};

// FiltersSection — same shape as auctions, minus auction-type
const FiltersSection = ({
    uiFilters,
    setUiFilters,
    loadingCategories,
    handleFilterChange,
    resetFilters,
    setShowMobileFilters,
    parentCategories,
    subCategories,
    selectedParent,
    setSelectedParent,
    updateFilters,
    location,
}) => {
    const handleParentChange = (e) => {
        const parentSlug = e.target.value;
        setSelectedParent(parentSlug);

        const newFilters = {
            ...uiFilters,
            categories: parentSlug ? [parentSlug] : [],
            category: '',
        };

        setUiFilters(newFilters);
        updateFilters(newFilters);

        const searchParams = new URLSearchParams(location.search);
        if (parentSlug) {
            searchParams.set('category', parentSlug);
            searchParams.delete('subcategory');
        } else {
            searchParams.delete('category');
            searchParams.delete('subcategory');
        }
        const newUrl = `${location.pathname}?${searchParams.toString()}`;
        window.history.replaceState(null, '', newUrl);
    };

    const handleSubcategoryChange = (e) => {
        const subcategorySlug = e.target.value;

        const newFilters = {
            ...uiFilters,
            categories: subcategorySlug
                ? [selectedParent, subcategorySlug]
                : (selectedParent ? [selectedParent] : []),
            category: subcategorySlug,
        };

        setUiFilters(newFilters);
        updateFilters(newFilters);

        const searchParams = new URLSearchParams(location.search);
        if (selectedParent) {
            searchParams.set('category', selectedParent);
            if (subcategorySlug) {
                searchParams.set('subcategory', subcategorySlug);
            } else {
                searchParams.delete('subcategory');
            }
        }
        const newUrl = `${location.pathname}?${searchParams.toString()}`;
        window.history.replaceState(null, '', newUrl);
    };

    const statusOptions = [
        { value: 'active', label: 'Available' },
        { value: '', label: 'All Status' },
        { value: 'sold', label: 'Sold' },
    ];

    return (
        <div className="bg-white px-4 py-6 rounded-lg shadow-md h-fit">
            <div className="flex justify-between items-center mb-6 lg:hidden">
                <h2 className="text-xl font-semibold">Filters</h2>
                <button onClick={() => setShowMobileFilters(false)}>
                    <X size={24} />
                </button>
            </div>

            <div className="space-y-6">
                {/* Search */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={uiFilters.search}
                            onChange={handleFilterChange}
                            name="search"
                        />
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                        name="parentCategory"
                        value={selectedParent}
                        onChange={handleParentChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
                        disabled={loadingCategories}
                    >
                        <option value="">Select Category</option>
                        {parentCategories.map(parent => (
                            <option key={parent.slug} value={parent.slug}>{parent.name}</option>
                        ))}
                    </select>

                    <select
                        name="category"
                        value={uiFilters.category}
                        onChange={handleSubcategoryChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={!selectedParent || loadingCategories}
                    >
                        <option value="">All Subcategories</option>
                        {subCategories.map(sub => (
                            <option key={sub.slug} value={sub.slug}>{sub.name}</option>
                        ))}
                    </select>

                    {loadingCategories && (
                        <p className="text-xs text-gray-500 mt-1">Loading categories...</p>
                    )}
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                        name="status"
                        value={uiFilters.status}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        {statusOptions.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>
                </div>

                {/* Price Range */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Min"
                            min="0"
                            name="priceMin"
                            value={uiFilters.priceMin}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <span className="self-center text-gray-400">-</span>
                        <input
                            type="number"
                            placeholder="Max"
                            min="0"
                            name="priceMax"
                            value={uiFilters.priceMax}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                        type="text"
                        placeholder="City, State or Country"
                        name="location"
                        value={uiFilters.location}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3 mt-8">
                <button
                    onClick={resetFilters}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Reset All Filters
                </button>
            </div>
        </div>
    );
};

function Products() {
    const {
        auctions: products,
        loading,
        loadingMore,
        pagination,
        filters: apiFilters,
        loadMoreAuctions,
        updateFilters,
    } = useAuctions({}, { context: 'product' }); // <-- key line

    const [uiFilters, setUiFilters] = useState({
        categories: [],
        status: '',
        search: '',
        priceMin: '',
        priceMax: '',
        location: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        category: '',
    });

    const location = useLocation();
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState(null);
    const [parentCategories, setParentCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [selectedParent, setSelectedParent] = useState('');
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Read URL params on load
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const categoryParam = searchParams.get('category');
        const subcategoryParam = searchParams.get('subcategory');
        const statusParam = searchParams.get('status');
        const searchParam = searchParams.get('search');

        const newFilters = { ...uiFilters };

        if (categoryParam || subcategoryParam) {
            const categorySlugs = [];
            if (categoryParam) {
                categorySlugs.push(categoryParam);
                setSelectedParent(categoryParam);
            }
            if (subcategoryParam) {
                categorySlugs.push(subcategoryParam);
                newFilters.category = subcategoryParam;
            }
            newFilters.categories = categorySlugs;
        }

        if (statusParam) newFilters.status = statusParam;
        else newFilters.status = 'active';

        if (searchParam) newFilters.search = searchParam;

        setUiFilters(newFilters);

        if (categoryParam || subcategoryParam || statusParam || searchParam) {
            updateFilters(newFilters);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    // Parent categories
    useEffect(() => {
        const fetchParentCategories = async () => {
            try {
                setLoadingCategories(true);
                const { data } = await axiosInstance.get('/api/v1/categories/public/parents');
                if (data.success) setParentCategories(data.data);
            } catch (error) {
                console.error('Error fetching parent categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchParentCategories();
    }, []);

    // Subcategories
    useEffect(() => {
        const fetchSubCategories = async () => {
            if (!selectedParent) {
                setSubCategories([]);
                return;
            }
            try {
                setLoadingCategories(true);
                const { data } = await axiosInstance.get(`/api/v1/categories/public/${selectedParent}/children`);
                if (data.success) setSubCategories(data.data.subcategories);
            } catch (error) {
                console.error('Error fetching subcategories:', error);
                setSubCategories([]);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchSubCategories();
    }, [selectedParent]);

    // Sync UI filters with API filters
    useEffect(() => {
        setUiFilters(prev => ({ ...prev, ...apiFilters }));
    }, [apiFilters]);

    const debouncedUpdateFilters = useCallback((newFilters) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const timer = setTimeout(() => updateFilters(newFilters), 500);
        setDebounceTimer(timer);
    }, [debounceTimer, updateFilters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...uiFilters, [name]: value };
        setUiFilters(newFilters);

        const searchParams = new URLSearchParams(location.search);
        if (value) searchParams.set(name, value);
        else searchParams.delete(name);
        const newUrl = `${location.pathname}?${searchParams.toString()}`;
        window.history.replaceState(null, '', newUrl);

        if (['search', 'location'].includes(name)) {
            debouncedUpdateFilters(newFilters);
        } else {
            updateFilters(newFilters);
        }
    };

    const resetFilters = () => {
        const reset = {
            categories: [],
            status: '',
            search: '',
            priceMin: '',
            priceMax: '',
            location: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            category: '',
        };
        setUiFilters(reset);
        updateFilters(reset);
        setSelectedParent('');
        setShowMobileFilters(false);
        window.history.replaceState(null, '', location.pathname);
    };

    const handleLoadMore = () => loadMoreAuctions();

    const sortOptions = [
        { value: 'createdAt-desc', label: 'Newest First' },
        { value: 'createdAt-asc', label: 'Oldest First' },
        { value: 'currentPrice-desc', label: 'Price: High to Low' },
        { value: 'currentPrice-asc', label: 'Price: Low to High' },
    ];

    const handleSortChange = (e) => {
        const [sortBy, sortOrder] = e.target.value.split('-');
        const newFilters = { ...uiFilters, sortBy, sortOrder };
        setUiFilters(newFilters);
        updateFilters(newFilters);

        const searchParams = new URLSearchParams(location.search);
        searchParams.set('sortBy', sortBy);
        searchParams.set('sortOrder', sortOrder);
        const newUrl = `${location.pathname}?${searchParams.toString()}`;
        window.history.replaceState(null, '', newUrl);
    };

    return (
        <Container>
            <div className="min-h-screen pt-16 md:pt-32 pb-16 bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-8">
                    <div className="container mx-auto">
                        <h2 className="text-4xl font-black tracking-[-0.04em] text-gray-950 md:text-5xl">
                            All
                            <span className="ml-2 font-medium italic text-gray-400">
                                Products.
                            </span>
                        </h2>
                        <p className="text-gray-600 mt-2">
                            Browse our selection of premium products. Buy now, instantly.
                        </p>
                    </div>
                </div>

                {/* Main */}
                <div className="container mx-auto py-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Filters (desktop) */}
                        <div className="hidden lg:block lg:w-1/4 xl:w-1/5">
                            <FiltersSection
                                uiFilters={uiFilters}
                                setUiFilters={setUiFilters}
                                loadingCategories={loadingCategories}
                                handleFilterChange={handleFilterChange}
                                resetFilters={resetFilters}
                                setShowMobileFilters={setShowMobileFilters}
                                parentCategories={parentCategories}
                                subCategories={subCategories}
                                selectedParent={selectedParent}
                                setSelectedParent={setSelectedParent}
                                updateFilters={updateFilters}
                                location={location}
                            />
                        </div>

                        {/* Content */}
                        <div className="w-full lg:w-3/4 xl:w-4/5">
                            {/* Mobile search + filter toggle */}
                            <div className="flex flex-col md:flex-row gap-4 mb-8 lg:hidden">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        value={uiFilters.search}
                                        onChange={handleFilterChange}
                                        name="search"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowMobileFilters(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 md:w-auto font-medium"
                                >
                                    <SlidersHorizontal size={20} />
                                    <span>Filters</span>
                                </button>
                            </div>

                            {/* Count + sort */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
                                <p className="text-gray-600">
                                    {loading
                                        ? "Loading products..."
                                        : `Showing ${products.length} of ${pagination?.totalAuctions || 0} products`}
                                </p>

                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600 text-sm">Sort by:</span>
                                    <select
                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                        value={`${uiFilters.sortBy}-${uiFilters.sortOrder}`}
                                        onChange={handleSortChange}
                                    >
                                        {sortOptions.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Grid / loading / empty */}
                            {loading && products.length === 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8 md:gap-y-12">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="border border-gray-200 p-4 bg-white rounded-xl shadow-sm h-96 animate-pulse">
                                            <div className="bg-gray-200 h-56 rounded-tr-3xl rounded-bl-3xl"></div>
                                            <div className="my-3 h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="my-2 h-3 bg-gray-200 rounded w-1/2"></div>
                                            <div className="my-2 h-3 bg-gray-200 rounded w-2/3"></div>
                                            <div className="flex gap-3 items-center mt-4">
                                                <div className="h-10 bg-gray-200 rounded-lg flex-grow"></div>
                                                <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : products.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8 md:gap-y-12">
                                        {products.map(product => (
                                            // <AuctionCard key={product._id} auction={product} />
                                            <ProductCard
                                            key={product?._id}
                                                product={product}
                                            />
                                        ))}
                                    </div>

                                    {pagination?.currentPage < pagination?.totalPages && (
                                        <div className="flex justify-center mt-12">
                                            <button
                                                onClick={handleLoadMore}
                                                disabled={loadingMore}
                                                className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                            >
                                                {loadingMore ? (
                                                    <><Loader size={16} className="animate-spin" />Loading...</>
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
                                <div className="text-center py-12">
                                    <Filter size={48} className="mx-auto text-gray-300 mb-4" />
                                    <h3 className="text-xl font-medium text-gray-700 mb-2">No products found</h3>
                                    <p className="text-gray-500">Try adjusting your filters to find what you're looking for.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile filters overlay */}
                {showMobileFilters && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileFilters(false)}></div>
                        <div className="absolute left-0 top-0 h-full w-4/5 max-w-sm bg-white overflow-y-auto p-6">
                            <FiltersSection
                                uiFilters={uiFilters}
                                setUiFilters={setUiFilters}
                                loadingCategories={loadingCategories}
                                handleFilterChange={handleFilterChange}
                                resetFilters={resetFilters}
                                setShowMobileFilters={setShowMobileFilters}
                                parentCategories={parentCategories}
                                subCategories={subCategories}
                                selectedParent={selectedParent}
                                setSelectedParent={setSelectedParent}
                                updateFilters={updateFilters}
                                location={location}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
}

export default Products;