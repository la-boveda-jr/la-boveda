import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../utils/axiosInstance';
import { useLocation } from "react-router-dom";

export const useAuctions = (initialFilters = {}, options = {}) => {
    const { context = null } = options;
    const location = useLocation();
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pagination, setPagination] = useState(null);

    // Default filters
    const defaultFilters = {
        categories: [],
        status: 'active',
        search: '',
        priceMin: '',
        priceMax: '',
        location: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        make: '',
        model: '',
        yearMin: '',
        yearMax: '',
        transmission: '',
        fuelType: '',
        condition: '',
        auctionType: '',
        allowOffers: '',
        seller: '',
    };

    // Merge initialFilters with defaults
    const [filters, setFilters] = useState({ ...defaultFilters, ...initialFilters });

    // Refs to track changes
    const initialFiltersRef = useRef(initialFilters);
    const previousUrlRef = useRef('');
    const isFirstRender = useRef(true);

    const hasInitialFilters = Object.keys(initialFilters).length > 0;

    // Clean empty values from filters
    const cleanFilters = (currentFilters) => {
        return Object.fromEntries(
            Object.entries(currentFilters).filter(([key, value]) => {
                if (key === 'categories') {
                    return Array.isArray(value) && value.length > 0;
                }
                return value !== '' && value !== null && value !== undefined && value !== false;
            })
        );
    };

    // Core fetch function
    const fetchAuctions = async (page = 1, limit = 12, currentFilters = null) => {
        const filtersToUse = currentFilters || filters;
        const loadingState = page > 1 ? setLoadingMore : setLoading;
        loadingState(true);

        try {
            const clean = cleanFilters(filtersToUse);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...Object.fromEntries(
                    Object.entries(clean).filter(([key]) => key !== 'categories')
                )
            });

            if (context) {
                params.append('context', context);
            }

            if (clean.categories && Array.isArray(clean.categories) && clean.categories.length > 0) {
                clean.categories.forEach(cat => params.append('categories', cat));
            }

            const queryString = params.toString();
            const { data } = await axiosInstance.get(`/api/v1/auctions?${queryString}`);

            if (data.success) {
                if (page > 1) {
                    setAuctions(prev => [...prev, ...data.data.auctions]);
                } else {
                    setAuctions(data.data.auctions);
                }
                setPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching auctions:', error);
            toast.error('Failed to load auctions');
        } finally {
            loadingState(false);
        }
    };

    // Load more (pagination)
    const loadMoreAuctions = async () => {
        if (pagination?.currentPage < pagination?.totalPages) {
            const nextPage = pagination.currentPage + 1;
            await fetchAuctions(nextPage, 12, filters);
        }
    };

    // Update filters and refresh
    const updateFilters = (newFilters) => {
        const updatedFilters = { ...filters, ...newFilters };
        setFilters(updatedFilters);
        fetchAuctions(1, 12, updatedFilters);
    };

    // ----- EFFECT: Handle initialFilters and URL params -----
    useEffect(() => {
        if (hasInitialFilters) {
            // ---- CASE 1: initialFilters provided (e.g., Seller page) ----
            const current = initialFilters;
            const prev = initialFiltersRef.current;
            const currentStr = JSON.stringify(current);
            const prevStr = JSON.stringify(prev);

            if (currentStr !== prevStr || isFirstRender.current) {
                initialFiltersRef.current = current;
                const merged = { ...defaultFilters, ...current };
                setFilters(merged);
                fetchAuctions(1, 12, merged);
            }
        } else {
            // ---- CASE 2: No initialFilters → use URL params (Auctions page) ----
            const searchParams = new URLSearchParams(location.search);

            // Parse categories (comma-separated)
            let categories = [];
            const categoriesParam = searchParams.get('categories');
            if (categoriesParam) {
                categories = categoriesParam.split(',').filter(c => c.trim() !== '');
            }

            const urlFilters = {
                categories,
                status: searchParams.get('status') || 'active',
                search: searchParams.get('search') || '',
                priceMin: searchParams.get('priceMin') || '',
                priceMax: searchParams.get('priceMax') || '',
                location: searchParams.get('location') || '',
                make: searchParams.get('make') || '',
                model: searchParams.get('model') || '',
                yearMin: searchParams.get('yearMin') || '',
                yearMax: searchParams.get('yearMax') || '',
                transmission: searchParams.get('transmission') || '',
                fuelType: searchParams.get('fuelType') || '',
                condition: searchParams.get('condition') || '',
                auctionType: searchParams.get('auctionType') || '',
                allowOffers: searchParams.get('allowOffers') || '',
                sortBy: searchParams.get('sortBy') || 'createdAt',
                sortOrder: searchParams.get('sortOrder') || 'desc',
                seller: searchParams.get('seller') || '', // optional, if you ever want to pass seller in URL
            };

            const urlStr = JSON.stringify(urlFilters);
            if (urlStr !== previousUrlRef.current || isFirstRender.current) {
                previousUrlRef.current = urlStr;
                const merged = { ...defaultFilters, ...urlFilters };
                setFilters(merged);
                fetchAuctions(1, 12, merged);
            }
        }

        isFirstRender.current = false;
    }, [initialFilters, location.search]); // Re-run when initialFilters or URL changes

    return {
        auctions,
        loading,
        loadingMore,
        pagination,
        filters,
        fetchAuctions,
        loadMoreAuctions,
        updateFilters,
    };
};