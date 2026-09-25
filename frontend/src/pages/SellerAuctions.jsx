import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Search,
    Loader,
    MapPin,
    User,
    Star,
    Briefcase,
    BadgeCheck,
    Gavel,
    TrendingUp,
    CheckCircle2,
    Package,
    SlidersHorizontal,
    ChevronDown,
    ArrowUpRight,
    RefreshCcw,
} from 'lucide-react';

import { Container, AuctionCard, ProductCard, LoadingSpinner } from '../components';
import { useAuctions } from '../hooks/useAuctions';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-hot-toast';

function SellerAuctions() {
    const { sellerId } = useParams();

    const [seller, setSeller] = useState(null);
    const [loadingSeller, setLoadingSeller] = useState(true);

    // Auction controls
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('createdAt-desc');
    const [showFilters, setShowFilters] = useState(false);

    // Product controls
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [productSortBy, setProductSortBy] = useState('createdAt-desc');
    const [productStatus, setProductStatus] = useState('active');
    const [showProductFilters, setShowProductFilters] = useState(false);

    // ==================================================
    // AUCTIONS HOOK
    // ==================================================

    const {
        auctions,
        loading: loadingAuctions,
        loadingMore: loadingMoreAuctions,
        pagination: auctionPagination,
        filters: auctionFilters,
        updateFilters: updateAuctionFilters,
        loadMoreAuctions,
    } = useAuctions(
        {
            seller: sellerId,
            status: 'active',
        },
        { context: 'auction' }
    );

    // ==================================================
    // PRODUCTS HOOK
    // ==================================================

    const {
        auctions: products,
        loading: loadingProducts,
        loadingMore: loadingMoreProducts,
        pagination: productPagination,
        filters: productFilters,
        updateFilters: updateProductFilters,
        loadMoreAuctions: loadMoreProducts,
    } = useAuctions(
        {
            seller: sellerId,
            status: 'active',
        },
        { context: 'product' }
    );

    // --------------------------------------------------
    // Fetch seller
    // --------------------------------------------------

    useEffect(() => {
        const fetchSeller = async () => {
            try {
                setLoadingSeller(true);

                const { data } = await axiosInstance.get(
                    `/api/v1/users/${sellerId}`
                );

                if (data.success) {
                    setSeller(data.data.user);
                } else {
                    toast.error('Seller not found');
                }
            } catch (error) {
                console.error('Failed to fetch seller:', error);

                toast.error(
                    error?.response?.data?.message ||
                    'Failed to load seller'
                );
            } finally {
                setLoadingSeller(false);
            }
        };

        if (sellerId) {
            fetchSeller();
        }
    }, [sellerId]);

    // --------------------------------------------------
    // Auction handlers
    // --------------------------------------------------

    const handleSearch = (e) => {
        e.preventDefault();

        updateAuctionFilters({
            search: searchTerm,
            page: 1,
        });
    };

    const handleStatusChange = (status) => {
        updateAuctionFilters({
            seller: sellerId,
            status,
            page: 1,
        });
    };

    const handleSortChange = (e) => {
        const value = e.target.value;

        const [sortByField, sortOrder] = value.split('-');

        setSortBy(value);

        updateAuctionFilters({
            sortBy: sortByField,
            sortOrder,
            page: 1,
        });
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        updateAuctionFilters({
            [name]: value,
            page: 1,
        });
    };

    const resetFilters = () => {
        setSearchTerm('');
        setSortBy('createdAt-desc');

        updateAuctionFilters({
            seller: sellerId,
            status: 'active',
            search: '',
            priceMin: '',
            priceMax: '',
            location: '',
            auctionType: '',
            allowOffers: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            page: 1,
        });
    };

    // --------------------------------------------------
    // Product handlers
    // --------------------------------------------------

    const handleProductSearch = (e) => {
        e.preventDefault();

        updateProductFilters({
            search: productSearchTerm,
            page: 1,
        });
    };

    const handleProductSortChange = (e) => {
        const value = e.target.value;

        const [sortByField, sortOrder] = value.split('-');

        setProductSortBy(value);

        updateProductFilters({
            sortBy: sortByField,
            sortOrder,
            page: 1,
        });
    };

    const handleProductStatusChange = (status) => {
        setProductStatus(status);

        updateProductFilters({
            seller: sellerId,
            status: status === 'all' ? '' : status,
            page: 1,
        });
    };

    const handleProductFilterChange = (e) => {
        const { name, value } = e.target;

        updateProductFilters({
            [name]: value,
            page: 1,
        });
    };

    const resetProductFilters = () => {
        setProductSearchTerm('');
        setProductSortBy('createdAt-desc');
        setProductStatus('active');

        updateProductFilters({
            seller: sellerId,
            status: 'active',
            search: '',
            priceMin: '',
            priceMax: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            page: 1,
        });
    };

    // --------------------------------------------------
    // Loading seller
    // --------------------------------------------------

    if (loadingSeller) {
        return (
            <Container className="pt-32 pb-16 min-h-[70vh] flex items-center justify-center">
                <LoadingSpinner size="large" />
            </Container>
        );
    }

    // --------------------------------------------------
    // Seller not found
    // --------------------------------------------------

    if (!seller) {
        return (
            <Container className="pt-32 pb-16 min-h-[70vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-5">
                        <User className="w-9 h-9 text-gray-400" />
                    </div>

                    <h2 className="text-2xl font-semibold text-gray-800">
                        Seller not found
                    </h2>

                    <p className="text-gray-500 mt-2">
                        This seller may no longer be available.
                    </p>

                    <Link
                        to="/sellers"
                        className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition"
                    >
                        Back to Sellers
                    </Link>
                </div>
            </Container>
        );
    }

    // --------------------------------------------------
    // Seller information
    // --------------------------------------------------

    const fullName = `${seller.firstName || ''} ${seller.lastName || ''}`.trim();

    const displayName =
        seller.companyName ||
        fullName ||
        seller.username ||
        'Seller';

    const stats = seller.stats || {};

    const listedCount =
        stats.listed ??
        stats.listedCount ??
        ((stats.auctions?.listed || 0) + (stats.products?.listed || 0));

    const activeCount =
        stats.active ??
        stats.activeCount ??
        ((stats.auctions?.active || 0) + (stats.products?.active || 0));

    const soldCount =
        stats.sold ??
        stats.soldCount ??
        ((stats.auctions?.sold || 0) + (stats.products?.sold || 0));

    // Auction-only counts
    const auctionActiveCount = stats.auctions?.active || 0;
    const auctionSoldCount = stats.auctions?.sold || 0;
    const auctionListedCount = stats.auctions?.listed || 0;

    const successRate = Math.min(
        100,
        Math.max(
            0,
            Number(
                stats.successRate ??
                stats.salesSuccess ??
                0
            )
        )
    );

    const rating = Number(seller.rating || 0);

    const memberSince = seller.createdAt
        ? new Date(seller.createdAt).getFullYear()
        : null;

    const locationParts = [
        seller.address?.city,
        seller.address?.country || seller.countryName,
    ].filter(Boolean);

    const location = locationParts.join(', ');

    // --------------------------------------------------
    // Auction status tabs
    // --------------------------------------------------

    const statusTabs = [
        {
            label: 'Active',
            value: 'active',
            count: auctionActiveCount,
        },
        {
            label: 'Upcoming',
            value: 'approved',
        },
        {
            label: 'Sold',
            value: 'sold',
            count: auctionSoldCount,
        },
        {
            label: 'Ended',
            value: 'ended',
        },
        {
            label: 'All Listings',
            value: '',
            count: auctionListedCount,
        },
    ];

    // --------------------------------------------------
    // Product status tabs
    // --------------------------------------------------

    const productStatusTabs = [
        {
            label: 'Available',
            value: 'active',
            count: stats.products?.active || 0,
        },
        {
            label: 'Sold',
            value: 'sold',
            count: stats.products?.sold || 0,
        },
        {
            label: 'All',
            value: 'all',
            count: stats.products?.listed || 0,
        },
    ];

    return (
        <Container className="pt-28 md:pt-32 pb-16 min-h-[70vh]">

            {/* =====================================================
                SELLER HERO
            ====================================================== */}

            <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm mb-8">

                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C59D55] via-[#E5C47A] to-[#C59D55]" />

                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#C59D55]/5 blur-3xl pointer-events-none" />

                <div className="relative p-5 sm:p-7 md:p-8">

                    <div className="flex flex-col lg:flex-row gap-7">

                        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 flex-1 min-w-0">

                            <div className="relative flex-shrink-0">

                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">

                                    {seller.image ? (
                                        <img
                                            src={seller.image}
                                            alt={displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-9 h-9 text-gray-400" />
                                        </div>
                                    )}

                                </div>

                                {seller.isVerified && (
                                    <div className="absolute -right-2 -bottom-2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center">
                                        <BadgeCheck
                                            size={22}
                                            className="text-blue-500 fill-blue-50"
                                        />
                                    </div>
                                )}

                            </div>

                            <div className="min-w-0 flex-1">

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">

                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                                        {displayName}
                                    </h1>

                                </div>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 mt-2 text-sm text-gray-500">

                                    {location && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin size={15} />
                                            {location}
                                        </span>
                                    )}

                                    {seller.userType && (
                                        <span className="inline-flex items-center gap-1.5 capitalize">
                                            <Briefcase size={15} />
                                            {seller.userType}
                                        </span>
                                    )}

                                    {memberSince && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <User size={15} />
                                            Member since {memberSince}
                                        </span>
                                    )}

                                </div>

                                <div className="flex flex-wrap items-center gap-4 mt-4">

                                    {rating > 0 && (
                                        <div className="flex items-center gap-2">

                                            <div className="flex items-center gap-1">

                                                <Star
                                                    size={17}
                                                    className="text-[#C59D55] fill-[#C59D55]"
                                                />

                                                <span className="font-semibold text-gray-900">
                                                    {rating.toFixed(1)}
                                                </span>

                                            </div>

                                            <span className="text-sm text-gray-400">
                                                Seller rating
                                            </span>

                                        </div>
                                    )}

                                    {successRate > 0 && (
                                        <div className="flex items-center gap-2">

                                            <CheckCircle2
                                                size={17}
                                                className="text-emerald-500"
                                            />

                                            <span className="font-semibold text-gray-900">
                                                {successRate}%
                                            </span>

                                            <span className="text-sm text-gray-400">
                                                sales success
                                            </span>

                                        </div>
                                    )}

                                </div>

                                {seller.bio && (
                                    <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
                                        {seller.bio}
                                    </p>
                                )}

                            </div>

                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:w-[520px] border border-gray-100 rounded-xl overflow-hidden bg-gray-50/70">

                            <SellerStat
                                icon={<Package size={18} />}
                                label="Listed"
                                value={listedCount}
                            />

                            <SellerStat
                                icon={<TrendingUp size={18} />}
                                label="Active"
                                value={activeCount}
                            />

                            <SellerStat
                                icon={<CheckCircle2 size={18} />}
                                label="Sold"
                                value={soldCount}
                            />

                        </div>

                    </div>

                    {successRate > 0 && (
                        <div className="mt-7 pt-6 border-t border-gray-100">

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">

                                <div className="flex items-center gap-2">

                                    <TrendingUp
                                        size={16}
                                        className="text-emerald-500"
                                    />

                                    <span className="text-sm font-semibold text-gray-800">
                                        Sales Success
                                    </span>

                                </div>

                                <span className="text-sm font-semibold text-gray-700">
                                    {successRate}%
                                </span>

                            </div>

                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">

                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                                    style={{
                                        width: `${successRate}%`,
                                    }}
                                />

                            </div>

                            <p className="text-xs text-gray-400 mt-2">
                                Based on the seller's completed listings across auctions and products.
                            </p>

                        </div>
                    )}

                </div>
            </section>


            {/* =====================================================
                AUCTIONS SECTION
            ====================================================== */}

            <div className="mb-5">

                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">

                    <div>

                        <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#C59D55] mb-1">
                            Live Auctions
                        </p>

                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            Auctions by {displayName}
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            Browse current and past auction listings from this seller.
                        </p>

                    </div>

                    <div className="text-sm text-gray-500">
                        {loadingAuctions && auctions.length === 0
                            ? 'Loading auctions...'
                            : `${auctionPagination?.totalAuctions || 0} auctions`}
                    </div>

                </div>

            </div>

            <div className="border-b border-gray-200 mb-5 overflow-x-auto">

                <div className="flex items-center overflow-hidden gap-1 min-w-max">

                    {statusTabs.map((tab) => {

                        const isActive =
                            (auctionFilters.status || 'active') === tab.value;

                        return (
                            <button
                                key={tab.value || 'all'}
                                onClick={() =>
                                    handleStatusChange(tab.value)
                                }
                                className={`
                                    relative px-4 py-3 text-sm font-medium
                                    transition-colors whitespace-nowrap
                                    ${isActive
                                        ? 'text-gray-900'
                                        : 'text-gray-500 hover:text-gray-800'
                                    }
                                `}
                            >

                                <span className="flex items-center gap-2">

                                    {tab.label}

                                    {typeof tab.count === 'number' && (
                                        <span
                                            className={`
                                                min-w-[22px] px-1.5 py-0.5
                                                rounded-full text-[11px]
                                                font-semibold text-center
                                                ${isActive
                                                    ? 'bg-[#C59D55]/15 text-[#A47D38]'
                                                    : 'bg-gray-100 text-gray-500'
                                                }
                                            `}
                                        >
                                            {tab.count}
                                        </span>
                                    )}

                                </span>

                                {isActive && (
                                    <span className="absolute left-2 right-2 -bottom-[1px] h-0.5 bg-[#C59D55] rounded-full" />
                                )}

                            </button>
                        );
                    })}

                </div>

            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm mb-4">

                <div className="flex flex-col lg:flex-row gap-3">

                    <form
                        onSubmit={handleSearch}
                        className="flex-1 flex gap-2"
                    >

                        <div className="relative flex-1">

                            <Search
                                size={19}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                type="text"
                                placeholder="Search this seller's auctions..."
                                value={searchTerm}
                                onChange={(e) =>
                                    setSearchTerm(e.target.value)
                                }
                                className="
                                    w-full
                                    pl-10 pr-4 py-2.5
                                    bg-gray-50
                                    border border-gray-200
                                    rounded-lg
                                    text-sm
                                    text-gray-900
                                    placeholder:text-gray-400
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-[#C59D55]/20
                                    focus:border-[#C59D55]
                                    transition
                                "
                            />

                        </div>

                        <button
                            type="submit"
                            className="
                                px-5 py-2.5
                                rounded-lg
                                bg-gray-900
                                text-white
                                text-sm
                                font-medium
                                hover:bg-gray-800
                                transition
                            "
                        >
                            Search
                        </button>

                    </form>

                    <div className="flex items-center gap-2">

                        <div className="relative flex-1 sm:flex-none">

                            <select
                                value={sortBy}
                                onChange={handleSortChange}
                                className="
                                    appearance-none
                                    w-full
                                    sm:w-auto
                                    min-w-[180px]
                                    pl-3 pr-9 py-2.5
                                    bg-gray-50
                                    border border-gray-200
                                    rounded-lg
                                    text-sm
                                    text-gray-700
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-[#C59D55]/20
                                    focus:border-[#C59D55]
                                "
                            >
                                <option value="createdAt-desc">
                                    Newest First
                                </option>

                                <option value="createdAt-asc">
                                    Oldest First
                                </option>

                                <option value="endDate-asc">
                                    Ending Soonest
                                </option>

                                <option value="currentPrice-desc">
                                    Price: High to Low
                                </option>

                                <option value="currentPrice-asc">
                                    Price: Low to High
                                </option>

                                <option value="bidCount-desc">
                                    Most Bids
                                </option>
                            </select>

                            <ChevronDown
                                size={16}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            />

                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setShowFilters((prev) => !prev)
                            }
                            className={`
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                px-3.5
                                py-2.5
                                rounded-lg
                                border
                                text-sm
                                font-medium
                                transition
                                ${showFilters
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }
                            `}
                        >
                            <SlidersHorizontal size={17} />
                            <span className="hidden sm:inline">
                                Filters
                            </span>
                        </button>

                    </div>

                </div>

            </div>

            {showFilters && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">

                    <div className="flex items-center justify-between mb-4">

                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                                More Filters
                            </h3>

                            <p className="text-xs text-gray-400 mt-0.5">
                                Narrow down this seller's auctions.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={resetFilters}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition"
                        >
                            <RefreshCcw size={13} />
                            Reset
                        </button>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        <FilterInput
                            label="Minimum Price"
                            name="priceMin"
                            type="number"
                            value={auctionFilters.priceMin || ''}
                            onChange={handleFilterChange}
                            placeholder="e.g. 1000"
                        />

                        <FilterInput
                            label="Maximum Price"
                            name="priceMax"
                            type="number"
                            value={auctionFilters.priceMax || ''}
                            onChange={handleFilterChange}
                            placeholder="e.g. 50000"
                        />

                        <div>

                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                Listing Type
                            </label>

                            <div className="relative">

                                <select
                                    name="auctionType"
                                    value={auctionFilters.auctionType || ''}
                                    onChange={handleFilterChange}
                                    className="
                                        appearance-none
                                        w-full
                                        px-3
                                        pr-9
                                        py-2.5
                                        bg-gray-50
                                        border border-gray-200
                                        rounded-lg
                                        text-sm
                                        focus:outline-none
                                        focus:ring-2
                                        focus:ring-[#C59D55]/20
                                        focus:border-[#C59D55]
                                    "
                                >
                                    <option value="">
                                        All Types
                                    </option>

                                    <option value="standard">
                                        Standard
                                    </option>

                                    <option value="reserve">
                                        Reserve
                                    </option>
                                </select>

                                <ChevronDown
                                    size={15}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                />

                            </div>

                        </div>

                    </div>

                </div>
            )}

            <div className="flex items-center justify-between gap-3 mb-5">

                <p className="text-sm text-gray-500">

                    {loadingAuctions && auctions.length === 0 ? (
                        'Loading auctions...'
                    ) : (
                        <>
                            Showing{' '}
                            <span className="font-semibold text-gray-800">
                                {auctions.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-gray-800">
                                {auctionPagination?.totalAuctions || 0}
                            </span>{' '}
                            auctions
                        </>
                    )}

                </p>

                {(auctionFilters.search ||
                    auctionFilters.priceMin ||
                    auctionFilters.priceMax ||
                    auctionFilters.auctionType) && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-xs font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
                        >
                            <RefreshCcw size={13} />
                            Clear filters
                        </button>
                    )}

            </div>

            {loadingAuctions && auctions.length === 0 ? (

                <div className="flex justify-center py-16">
                    <LoadingSpinner size="large" />
                </div>

            ) : auctions.length === 0 ? (

                <div className="border border-gray-200 bg-white rounded-2xl py-16 px-6 text-center">

                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-5">

                        <Gavel
                            size={28}
                            className="text-gray-400"
                        />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">
                        No auctions found
                    </h3>

                    <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
                        This seller doesn't have any auctions matching
                        your current filters.
                    </p>

                    <button
                        type="button"
                        onClick={resetFilters}
                        className="
                            inline-flex
                            items-center
                            gap-2
                            mt-6
                            px-5
                            py-2.5
                            rounded-lg
                            border
                            border-gray-200
                            bg-white
                            text-sm
                            font-medium
                            text-gray-700
                            hover:bg-gray-50
                            transition
                        "
                    >
                        <RefreshCcw size={15} />
                        Reset Filters
                    </button>

                </div>

            ) : (

                <>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                        {auctions.map((auction) => (
                            <AuctionCard
                                key={auction._id}
                                auction={auction}
                            />
                        ))}

                    </div>

                    {auctionPagination?.currentPage <
                        auctionPagination?.totalPages && (

                            <div className="flex justify-center mt-10">

                                <button
                                    onClick={loadMoreAuctions}
                                    disabled={loadingMoreAuctions}
                                    className="
                                    group
                                    inline-flex
                                    items-center
                                    gap-2
                                    px-6
                                    py-3
                                    rounded-lg
                                    bg-gray-900
                                    text-white
                                    text-sm
                                    font-medium
                                    hover:bg-gray-800
                                    disabled:opacity-50
                                    disabled:cursor-not-allowed
                                    transition
                                "
                                >

                                    {loadingMoreAuctions ? (
                                        <>
                                            <Loader
                                                size={17}
                                                className="animate-spin"
                                            />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            Load More

                                            <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                                                {Math.max(
                                                    0,
                                                    (auctionPagination.totalAuctions || 0) -
                                                    auctions.length
                                                )}
                                            </span>

                                            <ArrowUpRight
                                                size={16}
                                                className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                                            />
                                        </>
                                    )}

                                </button>

                            </div>
                        )}

                </>
            )}


            {/* =====================================================
                PRODUCTS SECTION
            ====================================================== */}

            <section className="mt-16">

                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">

                    <div>

                        <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#C59D55] mb-1">
                            Buy Now
                        </p>

                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            Products by {displayName}
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            Browse products available for instant purchase from this seller.
                        </p>

                    </div>

                    <div className="text-sm text-gray-500">
                        {loadingProducts && products.length === 0
                            ? 'Loading products...'
                            : `${productPagination?.totalAuctions || 0} products`}
                    </div>

                </div>

                <div className="border-b border-gray-200 mb-5 overflow-x-auto">

                    <div className="flex items-center overflow-hidden gap-1 min-w-max">

                        {productStatusTabs.map((tab) => {

                            const isActive = productStatus === tab.value;

                            return (
                                <button
                                    key={tab.value || 'all'}
                                    onClick={() =>
                                        handleProductStatusChange(tab.value)
                                    }
                                    className={`
                                    relative px-4 py-3 text-sm font-medium
                                    transition-colors whitespace-nowrap
                                    ${isActive
                                            ? 'text-gray-900'
                                            : 'text-gray-500 hover:text-gray-800'
                                        }
                                `}
                                >

                                    <span className="flex items-center gap-2">

                                        {tab.label}

                                        {typeof tab.count === 'number' && (
                                            <span
                                                className={`
                                                min-w-[22px] px-1.5 py-0.5
                                                rounded-full text-[11px]
                                                font-semibold text-center
                                                ${isActive
                                                        ? 'bg-[#C59D55]/15 text-[#A47D38]'
                                                        : 'bg-gray-100 text-gray-500'
                                                    }
                                            `}
                                            >
                                                {tab.count}
                                            </span>
                                        )}

                                    </span>

                                    {isActive && (
                                        <span className="absolute left-2 right-2 -bottom-[1px] h-0.5 bg-[#C59D55] rounded-full" />
                                    )}

                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Product toolbar */}
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm mb-4">

                    <div className="flex flex-col lg:flex-row gap-3">

                        <form
                            onSubmit={handleProductSearch}
                            className="flex-1 flex gap-2"
                        >

                            <div className="relative flex-1">

                                <Search
                                    size={19}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <input
                                    type="text"
                                    placeholder="Search this seller's products..."
                                    value={productSearchTerm}
                                    onChange={(e) =>
                                        setProductSearchTerm(e.target.value)
                                    }
                                    className="
                                        w-full
                                        pl-10 pr-4 py-2.5
                                        bg-gray-50
                                        border border-gray-200
                                        rounded-lg
                                        text-sm
                                        text-gray-900
                                        placeholder:text-gray-400
                                        focus:outline-none
                                        focus:ring-2
                                        focus:ring-[#C59D55]/20
                                        focus:border-[#C59D55]
                                        transition
                                    "
                                />

                            </div>

                            <button
                                type="submit"
                                className="
                                    px-5 py-2.5
                                    rounded-lg
                                    bg-gray-900
                                    text-white
                                    text-sm
                                    font-medium
                                    hover:bg-gray-800
                                    transition
                                "
                            >
                                Search
                            </button>

                        </form>

                        <div className="flex items-center gap-2">

                            <div className="relative flex-1 sm:flex-none">

                                <select
                                    value={productSortBy}
                                    onChange={handleProductSortChange}
                                    className="
                                        appearance-none
                                        w-full
                                        sm:w-auto
                                        min-w-[180px]
                                        pl-3 pr-9 py-2.5
                                        bg-gray-50
                                        border border-gray-200
                                        rounded-lg
                                        text-sm
                                        text-gray-700
                                        focus:outline-none
                                        focus:ring-2
                                        focus:ring-[#C59D55]/20
                                        focus:border-[#C59D55]
                                    "
                                >
                                    <option value="createdAt-desc">
                                        Newest First
                                    </option>

                                    <option value="createdAt-asc">
                                        Oldest First
                                    </option>

                                    <option value="currentPrice-desc">
                                        Price: High to Low
                                    </option>

                                    <option value="currentPrice-asc">
                                        Price: Low to High
                                    </option>
                                </select>

                                <ChevronDown
                                    size={16}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                />

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowProductFilters((prev) => !prev)
                                }
                                className={`
                                    inline-flex
                                    items-center
                                    justify-center
                                    gap-2
                                    px-3.5
                                    py-2.5
                                    rounded-lg
                                    border
                                    text-sm
                                    font-medium
                                    transition
                                    ${showProductFilters
                                        ? 'bg-gray-900 text-white border-gray-900'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <SlidersHorizontal size={17} />
                                <span className="hidden sm:inline">
                                    Filters
                                </span>
                            </button>

                        </div>

                    </div>

                </div>

                {/* Product More Filters panel */}
                {showProductFilters && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">

                        <div className="flex items-center justify-between mb-4">

                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                    More Filters
                                </h3>

                                <p className="text-xs text-gray-400 mt-0.5">
                                    Narrow down this seller's products.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={resetProductFilters}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition"
                            >
                                <RefreshCcw size={13} />
                                Reset
                            </button>

                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">

                            <FilterInput
                                label="Minimum Price"
                                name="priceMin"
                                type="number"
                                value={productFilters.priceMin || ''}
                                onChange={handleProductFilterChange}
                                placeholder="e.g. 100"
                            />

                            <FilterInput
                                label="Maximum Price"
                                name="priceMax"
                                type="number"
                                value={productFilters.priceMax || ''}
                                onChange={handleProductFilterChange}
                                placeholder="e.g. 5000"
                            />

                        </div>

                    </div>
                )}

                {/* Product results meta */}
                <div className="flex items-center justify-between gap-3 mb-5">

                    <p className="text-sm text-gray-500">

                        {loadingProducts && products.length === 0 ? (
                            'Loading products...'
                        ) : (
                            <>
                                Showing{' '}
                                <span className="font-semibold text-gray-800">
                                    {products.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-gray-800">
                                    {productPagination?.totalAuctions || 0}
                                </span>{' '}
                                products
                            </>
                        )}

                    </p>

                    {(productFilters.search ||
                        productFilters.priceMin ||
                        productFilters.priceMax) && (
                            <button
                                type="button"
                                onClick={resetProductFilters}
                                className="text-xs font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
                            >
                                <RefreshCcw size={13} />
                                Clear filters
                            </button>
                        )}

                </div>

                {loadingProducts && products.length === 0 ? (

                    <div className="flex justify-center py-16">
                        <LoadingSpinner size="large" />
                    </div>

                ) : products.length === 0 ? (

                    <div className="border border-gray-200 bg-white rounded-2xl py-16 px-6 text-center">

                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-5">

                            <Package
                                size={28}
                                className="text-gray-400"
                            />

                        </div>

                        <h3 className="text-xl font-semibold text-gray-800">
                            No products found
                        </h3>

                        <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
                            This seller doesn't have any products matching your current filters.
                        </p>

                        {(productFilters.search ||
                            productFilters.priceMin ||
                            productFilters.priceMax ||
                            productStatus !== 'active') && (
                                <button
                                    type="button"
                                    onClick={resetProductFilters}
                                    className="
                                    inline-flex
                                    items-center
                                    gap-2
                                    mt-6
                                    px-5
                                    py-2.5
                                    rounded-lg
                                    border
                                    border-gray-200
                                    bg-white
                                    text-sm
                                    font-medium
                                    text-gray-700
                                    hover:bg-gray-50
                                    transition
                                "
                                >
                                    <RefreshCcw size={15} />
                                    Reset Filters
                                </button>
                            )}

                    </div>

                ) : (

                    <>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                            {products.map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                />
                            ))}

                        </div>

                        {productPagination?.currentPage <
                            productPagination?.totalPages && (

                                <div className="flex justify-center mt-10">

                                    <button
                                        onClick={loadMoreProducts}
                                        disabled={loadingMoreProducts}
                                        className="
                                        group
                                        inline-flex
                                        items-center
                                        gap-2
                                        px-6
                                        py-3
                                        rounded-lg
                                        bg-gray-900
                                        text-white
                                        text-sm
                                        font-medium
                                        hover:bg-gray-800
                                        disabled:opacity-50
                                        disabled:cursor-not-allowed
                                        transition
                                    "
                                    >

                                        {loadingMoreProducts ? (
                                            <>
                                                <Loader
                                                    size={17}
                                                    className="animate-spin"
                                                />
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                Load More

                                                <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                                                    {Math.max(
                                                        0,
                                                        (productPagination.totalAuctions || 0) -
                                                        products.length
                                                    )}
                                                </span>

                                                <ArrowUpRight
                                                    size={16}
                                                    className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                                                />
                                            </>
                                        )}

                                    </button>

                                </div>
                            )}

                    </>
                )}

            </section>

        </Container>
    );
}


// ============================================================
// SELLER STAT
// ============================================================

function SellerStat({ icon, label, value }) {
    return (
        <div className="p-4 sm:p-5 text-center border-r border-b sm:border-b-0 border-gray-100 last:border-r-0">

            <div className="flex justify-center mb-2 text-[#C59D55]">
                {icon}
            </div>

            <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {Number(value || 0).toLocaleString()}
            </p>

            <p className="text-xs text-gray-500 mt-0.5">
                {label}
            </p>

        </div>
    );
}


// ============================================================
// FILTER INPUT
// ============================================================

function FilterInput({
    label,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
}) {
    return (
        <div>

            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {label}
            </label>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="
                    w-full
                    px-3
                    py-2.5
                    bg-gray-50
                    border border-gray-200
                    rounded-lg
                    text-sm
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#C59D55]/20
                    focus:border-[#C59D55]
                    transition
                "
            />

        </div>
    );
}

export default SellerAuctions;