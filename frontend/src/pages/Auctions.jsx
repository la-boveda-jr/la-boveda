import { useState, useEffect, useCallback } from "react";
import { Filter, ChevronDown, Search, SlidersHorizontal, X, Loader, Grid, List } from "lucide-react";
import { AuctionListItem, Container } from "../components";
import AuctionCard from "../components/AuctionCard";
import { useAuctions } from "../hooks/useAuctions";
import { useLocation } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

// Car filters that apply to ALL categories
const carFilters = {
    'ALL': {
        auction: [
            { name: 'auctionType', label: 'Auction Type', type: 'select', options: ['', 'standard', 'reserve', 'buy_now'] },
            { name: 'allowOffers', label: 'Accepts Offers', type: 'select', options: ['', 'true', 'false'] }
        ]
    }
};

// FiltersSection Component
const FiltersSection = ({
    uiFilters,
    setUiFilters,  // Add this
    categories,
    loadingCategories,
    handleFilterChange,
    handleRangeChange,
    resetFilters,
    toggleFilterSection,
    activeFilterSections,
    setShowMobileFilters,
    parentCategories,
    subCategories,
    selectedParent,
    setSelectedParent,
    updateFilters,  // Add this
    location  // Add this
}) => {
    const getCurrentCategoryFilters = () => {
        return carFilters['ALL'] || {};
    };

    // Handle parent category selection
    const handleParentChange = (e) => {
        const parentSlug = e.target.value;
        setSelectedParent(parentSlug);

        // Update filters with parent category only
        const newFilters = {
            ...uiFilters,
            categories: parentSlug ? [parentSlug] : [], // Set categories array with parent
            category: '' // Clear subcategory selection
        };

        setUiFilters(newFilters);
        updateFilters(newFilters);

        // Update URL
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

    // Handle subcategory selection
    const handleSubcategoryChange = (e) => {
        const subcategorySlug = e.target.value;

        // Update filters based on selection
        const newFilters = {
            ...uiFilters,
            categories: subcategorySlug ?
                [selectedParent, subcategorySlug] : // Both parent and subcategory
                (selectedParent ? [selectedParent] : []), // Only parent or empty
            category: subcategorySlug
        };

        setUiFilters(newFilters);
        updateFilters(newFilters);

        // Update URL
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

    const renderFilterInput = (filter) => {
        switch (filter.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        name={filter.name}
                        value={uiFilters[filter.name] || ''}
                        onChange={handleFilterChange}
                        placeholder={filter.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                );

            case 'select':
                return (
                    <select
                        name={filter.name}
                        value={uiFilters[filter.name] || ''}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="">Any {filter.label}</option>
                        {filter.options.filter(opt => opt !== '').map(option => (
                            <option key={option} value={option}>
                                {option === 'true' ? 'Yes' : option === 'false' ? 'No' : option}
                            </option>
                        ))}
                    </select>
                );

            case 'range':
                return (
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder={`Min ${filter.label.replace('Range', '')}`}
                            min={filter.min}
                            max={filter.max}
                            value={uiFilters[filter.fields[0]] || ''}
                            onChange={(e) => handleRangeChange(
                                filter.fields[0],
                                filter.fields[1],
                                e.target.value,
                                uiFilters[filter.fields[1]]
                            )}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <span className="self-center text-gray-400">-</span>
                        <input
                            type="number"
                            placeholder={`Max ${filter.label.replace('Range', '')}`}
                            min={filter.min}
                            max={filter.max}
                            value={uiFilters[filter.fields[1]] || ''}
                            onChange={(e) => handleRangeChange(
                                filter.fields[0],
                                filter.fields[1],
                                uiFilters[filter.fields[0]],
                                e.target.value
                            )}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    const statusOptions = [
        { value: "active", label: "Active" },
        { value: "", label: "All Status" },
        { value: "approved", label: "Upcoming" },
        { value: "ended", label: "Ended" },
        { value: "sold", label: "Sold" }
    ];

    const currentFilters = getCurrentCategoryFilters();

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
                            placeholder="Search auctions..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={uiFilters.search}
                            onChange={handleFilterChange}
                            name="search"
                        />
                    </div>
                </div>

                {/* Category Filter - Updated for Parent/Subcategory */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>

                    {/* Parent Category Dropdown */}
                    <select
                        name="parentCategory"
                        value={selectedParent}
                        onChange={handleParentChange} // Use the new handler
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
                        disabled={loadingCategories}
                    >
                        <option value="">Select Category</option>
                        {parentCategories.map(parent => (
                            <option key={parent.slug} value={parent.slug}>
                                {parent.name}
                            </option>
                        ))}
                    </select>

                    {/* Subcategory Dropdown */}
                    <select
                        name="category"
                        value={uiFilters.category}
                        onChange={handleSubcategoryChange} // Use the new handler
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={!selectedParent || loadingCategories}
                    >
                        <option value="">All Subcategories</option>
                        {subCategories.map(sub => (
                            <option key={sub.slug} value={sub.slug}>
                                {sub.name}
                            </option>
                        ))}
                    </select>

                    {/* Show loading state */}
                    {loadingCategories && (
                        <p className="text-xs text-gray-500 mt-1">Loading categories...</p>
                    )}
                </div>

                {/* Status Filter */}
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

                {/* Car-specific Filters (Always shown since all auctions are cars) */}
                {/* Auction Filters */}
                <div className="">
                    {/* Auction Type */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Auction Type
                        </label>
                        <select
                            name="auctionType"
                            value={uiFilters.auctionType || ''}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="">All Types</option>
                            <option value="standard">Standard Auction</option>
                            <option value="reserve">Reserve Auction</option>
                        </select>
                    </div>

                    {/* Allow Offers */}
                    {/* <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Accepts Offers
                        </label>
                        <select
                            name="allowOffers"
                            value={uiFilters.allowOffers || ''}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div> */}
                </div>
            </div>

            {/* Filter Actions */}
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

function Auctions() {
    const {
        auctions,
        loading,
        loadingMore,
        pagination,
        filters: apiFilters,
        loadMoreAuctions,
        updateFilters
    } = useAuctions({}, { context: 'auction' });

    const [uiFilters, setUiFilters] = useState({
        categories: [],
        status: "",
        search: "",
        priceMin: "",
        priceMax: "",
        location: "",
        sortBy: "createdAt",
        sortOrder: "desc",
        auctionType: "",
        allowOffers: "",
    });

    const [categories, setCategories] = useState([]);
    const location = useLocation();
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [activeFilterSections, setActiveFilterSections] = useState({});
    const [debounceTimer, setDebounceTimer] = useState(null);
    const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
    const [parentCategories, setParentCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [selectedParent, setSelectedParent] = useState('');
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Read URL parameters on page load
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const categoryParam = searchParams.get('category');
        const subcategoryParam = searchParams.get('subcategory');
        const statusParam = searchParams.get('status');
        const auctionTypeParam = searchParams.get('auctionType'); // Add this line
        const allowOffersParam = searchParams.get('allowOffers'); // Add this line

        const newFilters = { ...uiFilters };

        // Build categories array from URL params
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

        // Set auction type from URL if exists
        if (auctionTypeParam) {
            newFilters.auctionType = auctionTypeParam;
        }

        // Set allow offers from URL if exists
        if (allowOffersParam) {
            newFilters.allowOffers = allowOffersParam;
        }

        // IMPORTANT: Only set status from URL if it exists, otherwise keep 'active'
        if (statusParam) {
            newFilters.status = statusParam;
        } else {
            newFilters.status = 'active'; // Default to active
        }

        setUiFilters(newFilters);

        // Only update API filters if we have parameters
        if (categoryParam || subcategoryParam || statusParam || auctionTypeParam || allowOffersParam) {
            updateFilters(newFilters);
        }
    }, [location.search]);

    // Fetch parent categories on mount
    useEffect(() => {
        const fetchParentCategories = async () => {
            try {
                setLoadingCategories(true);
                const { data } = await axiosInstance.get('/api/v1/categories/public/parents');
                if (data.success) {
                    setParentCategories(data.data);
                }
            } catch (error) {
                console.error('Error fetching parent categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchParentCategories();
    }, []);

    useEffect(() => {
        const fetchSubCategories = async () => {
            if (!selectedParent) {
                setSubCategories([]);
                return;
            }

            try {
                setLoadingCategories(true);
                const { data } = await axiosInstance.get(`/api/v1/categories/public/${selectedParent}/children`);
                if (data.success) {
                    setSubCategories(data.data.subcategories);
                }
            } catch (error) {
                console.error('Error fetching subcategories:', error);
                setSubCategories([]);
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchSubCategories();
    }, [selectedParent]);

    // After subcategories load, set the category filter if we have a subcategory param
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const categoryParam = searchParams.get('category');
        const subcategoryParam = searchParams.get('subcategory');

        if (subcategoryParam && subCategories.length > 0) {
            // Check if the subcategory exists in the loaded subcategories
            const subcategoryExists = subCategories.some(sub => sub.slug === subcategoryParam);

            if (subcategoryExists) {
                // Build complete categories array
                const categorySlugs = [];
                if (categoryParam) {
                    categorySlugs.push(categoryParam);
                }
                categorySlugs.push(subcategoryParam);

                setUiFilters(prev => ({
                    ...prev,
                    categories: categorySlugs,
                    category: subcategoryParam
                }));

                // Update API filters
                updateFilters({
                    ...uiFilters,
                    categories: categorySlugs,
                    category: subcategoryParam
                });
            }
        }
    }, [subCategories, location.search]);

    // Sync UI filters with API filters
    useEffect(() => {
        setUiFilters(prev => ({
            ...prev,
            ...apiFilters
        }));
    }, [apiFilters]);

    const debouncedUpdateFilters = useCallback((newFilters) => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        const timer = setTimeout(() => {
            updateFilters(newFilters);
        }, 500);

        setDebounceTimer(timer);
    }, [debounceTimer, updateFilters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = {
            ...uiFilters,
            [name]: value
        };

        setUiFilters(newFilters);

        // Update URL with the new filter
        const searchParams = new URLSearchParams(location.search);
        if (value) {
            searchParams.set(name, value);
        } else {
            searchParams.delete(name);
        }
        const newUrl = `${location.pathname}?${searchParams.toString()}`;
        window.history.replaceState(null, '', newUrl);

        // Use debounce for text inputs, immediate for others
        if (['search', 'location', 'make', 'model'].includes(name)) {
            debouncedUpdateFilters(newFilters);
        } else {
            updateFilters(newFilters);
        }
    };

    const handleRangeChange = (minName, maxName, minValue, maxValue) => {
        const newFilters = {
            ...uiFilters,
            [minName]: minValue,
            [maxName]: maxValue
        };

        setUiFilters(newFilters);
        updateFilters(newFilters);
    };

    const resetFilters = () => {
        const resetFilters = {
            categories: [],
            status: "",
            search: "",
            priceMin: "",
            priceMax: "",
            location: "",
            sortBy: "createdAt",
            sortOrder: "desc",
            auctionType: "",
            allowOffers: "",
            make: "",
            model: "",
            yearMin: "",
            yearMax: "",
            transmission: "",
            fuelType: "",
            condition: ""
        };
        setUiFilters(resetFilters);
        updateFilters(resetFilters);
        setShowMobileFilters(false);
        // Reset URL
        window.history.replaceState(null, '', location.pathname);
    };

    const handleLoadMore = () => {
        loadMoreAuctions();
    };

    const toggleFilterSection = (section) => {
        setActiveFilterSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const sortOptions = [
        { value: "createdAt-desc", label: "Newest First" },
        { value: "createdAt-asc", label: "Oldest First" },
        { value: "endDate-asc", label: "Ending Soonest" },
        { value: "currentPrice-desc", label: "Price: High to Low" },
        { value: "currentPrice-asc", label: "Price: Low to High" },
        { value: "bidCount-desc", label: "Most Bids" }
    ];

    const handleSortChange = (e) => {
        const [sortBy, sortOrder] = e.target.value.split('-');
        const newFilters = {
            ...uiFilters,
            sortBy,
            sortOrder
        };
        setUiFilters(newFilters);
        updateFilters(newFilters);

        // Update URL with new sort parameters while preserving other filters
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
                                    Auctions.
                                </span>
                            </h2>
                        <p className="text-gray-600 mt-2">Browse through our selection of premium collectibles across all categories.</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="container mx-auto py-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Filters Sidebar */}
                        <div className="hidden lg:block lg:w-1/4 xl:w-1/5">
                            <FiltersSection
                                uiFilters={uiFilters}
                                setUiFilters={setUiFilters}  // Add this line
                                categories={categories}
                                loadingCategories={loadingCategories}
                                handleFilterChange={handleFilterChange}
                                handleRangeChange={handleRangeChange}
                                resetFilters={resetFilters}
                                toggleFilterSection={toggleFilterSection}
                                activeFilterSections={activeFilterSections}
                                setShowMobileFilters={setShowMobileFilters}
                                parentCategories={parentCategories}
                                subCategories={subCategories}
                                selectedParent={selectedParent}
                                setSelectedParent={setSelectedParent}
                                updateFilters={updateFilters}  // Add this line
                                location={location}  // Add this line
                            />
                        </div>

                        {/* Content Area */}
                        <div className="w-full lg:w-3/4 xl:w-4/5">
                            {/* Mobile Filter Toggle */}
                            <div className="flex flex-col md:flex-row gap-4 mb-8 lg:hidden">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search auctions..."
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

                            {/* Results Count and Sort */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
                                <p className="text-gray-600">
                                    {loading ? "Loading auctions..." : `Showing ${auctions.length} of ${pagination?.totalAuctions || 0} auctions`}
                                </p>

                                <div className="flex items-center gap-3">
                                    {/* Add view mode toggle */}
                                    {/* <div className="hidden md:flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setViewMode("grid")}
                                            className={`p-2 rounded transition-colors ${viewMode === "grid" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                                            title="Grid View"
                                        >
                                            <Grid size={18} className={viewMode === "grid" ? "text-orange-500" : "text-gray-500"} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode("list")}
                                            className={`p-2 rounded transition-colors ${viewMode === "list" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                                            title="List View"
                                        >
                                            <List size={18} className={viewMode === "list" ? "text-orange-500" : "text-gray-500"} />
                                        </button>
                                    </div> */}

                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600 text-sm">Sort by:</span>
                                        <select
                                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                            value={`${uiFilters.sortBy}-${uiFilters.sortOrder}`}
                                            onChange={handleSortChange}
                                        >
                                            {sortOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Auction Grid */}
                            {loading && auctions.length === 0 ? (
                                // Loading Skeleton based on view mode
                                viewMode === "grid" ? (
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
                                ) : (
                                    // List View Loading Skeleton
                                    <div className="space-y-2">
                                        {Array.from({ length: 3 }).map((_, index) => (
                                            <div key={index} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                                                <div className="flex flex-col lg:flex-row gap-5">
                                                    <div className="lg:w-64">
                                                        <div className="h-48 bg-gray-200 rounded-lg"></div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                            {Array.from({ length: 4 }).map((_, i) => (
                                                                <div key={i} className="space-y-2">
                                                                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                                                                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                                                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                                                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : auctions.length > 0 ? (
                                <>
                                    {viewMode === "grid" ? (
                                        // Grid View
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8 md:gap-y-12">
                                            {auctions.map(auction => (
                                                <AuctionCard
                                                    key={auction._id}
                                                    auction={auction}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        // List View
                                        <div className="space-y-2">
                                            {auctions.map((auction) => (
                                                <AuctionListItem
                                                    key={auction._id}
                                                    auction={auction}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Load More Button */}
                                    {pagination?.currentPage < pagination?.totalPages && (
                                        <div className="flex justify-center mt-12">
                                            <button
                                                onClick={handleLoadMore}
                                                disabled={loadingMore}
                                                className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                            >
                                                {loadingMore ? (
                                                    <>
                                                        <Loader size={16} className="animate-spin" />
                                                        Loading...
                                                    </>
                                                ) : (
                                                    <>
                                                        Load More Auctions
                                                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                                            {pagination.totalAuctions - auctions.length} more
                                                        </span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* End of Auctions Message */}
                                    {pagination?.currentPage >= pagination?.totalPages && auctions.length > 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>You've seen all {pagination.totalAuctions} auctions</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <Filter size={48} className="mx-auto text-gray-300 mb-4" />
                                    <h3 className="text-xl font-medium text-gray-700 mb-2">No auctions found</h3>
                                    <p className="text-gray-500">Try adjusting your filters to find what you're looking for.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Filters Overlay */}
                {showMobileFilters && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileFilters(false)}></div>
                        <div className="absolute left-0 top-0 h-full w-4/5 max-w-sm bg-white overflow-y-auto p-6">
                            <FiltersSection
                                uiFilters={uiFilters}
                                setUiFilters={setUiFilters}  // Add this line
                                categories={categories}
                                loadingCategories={loadingCategories}
                                handleFilterChange={handleFilterChange}
                                handleRangeChange={handleRangeChange}
                                resetFilters={resetFilters}
                                toggleFilterSection={toggleFilterSection}
                                activeFilterSections={activeFilterSections}
                                setShowMobileFilters={setShowMobileFilters}
                                parentCategories={parentCategories}
                                subCategories={subCategories}
                                selectedParent={selectedParent}
                                setSelectedParent={setSelectedParent}
                                updateFilters={updateFilters}  // Add this line
                                location={location}  // Add this line
                            />
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
}

export default Auctions;