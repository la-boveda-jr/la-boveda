import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { Container, LoadingSpinner } from '../components';
import axiosInstance from '../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';

const CategoryCarousel = lazy(() => import('../components/CategoryCarousel'));

const CategoryIconsSection = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    const sectionRef = useRef(null);

    const navigate = useNavigate();

    const handleCategoryClick = (categorySlug) => {
        navigate(`/auctions?category=${categorySlug}`);
    };

    /*
     * ============================================================
     * FETCH CATEGORIES
     * ============================================================
     */

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await axiosInstance.get(
                    '/api/v1/categories/public/parents/with-images'
                );

                if (data.success) {
                    setCategories(data.data);
                } else {
                    setCategories([]);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
                setCategories([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    /*
     * ============================================================
     * INTERSECTION OBSERVER
     *
     * IMPORTANT:
     * Only start observing AFTER loading has finished.
     * ============================================================
     */

    useEffect(() => {
        if (loading) return;

        const element = sectionRef.current;

        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setVisible(entry.isIntersecting);
            },
            {
                threshold: 0.15,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [loading]);

    /*
     * ============================================================
     * LOADING STATE
     * ============================================================
     */

    if (loading) {
        return (
            <Container className="mb-14">
                <div className="grid grid-cols-2 gap-5 sm:gap-7 md:grid-cols-4 lg:grid-cols-5">
                    {[...Array(5)].map((_, index) => (
                        <div
                            key={index}
                            className="flex flex-col items-center justify-center rounded-lg p-3 shadow-md"
                        >
                            <div className="h-24 w-24 animate-pulse rounded-lg bg-gray-200" />

                            <div className="mt-2 h-5 w-20 animate-pulse rounded bg-gray-200" />
                        </div>
                    ))}
                </div>
            </Container>
        );
    }

    /*
     * ============================================================
     * MAIN SECTION
     * ============================================================
     */

    return (
        <section
            ref={sectionRef}
            className="relative overflow-hidden"
        >
            <Container className="mt-14">

                {/* =================================================
                    HEADER
                ================================================== */}

                <div
                    className={`mb-8 transition-all duration-1000 ease-out ${visible
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-8 opacity-0'
                        }`}
                >
                    <h2 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-[-0.035em] text-[#111315] sm:text-5xl lg:text-[48px]">
                        Categories
                    </h2>

                    <p
                        className={`mt-3 text-sm text-gray-500 transition-all duration-1000 ease-out delay-150 md:text-base ${visible
                                ? 'translate-y-0 opacity-100'
                                : 'translate-y-5 opacity-0'
                            }`}
                    >
                        Browse by Category — sports cards, signed jerseys,
                        game-used balls, autographed photos, and more. All
                        verified. All in one place.
                    </p>
                </div>

                {/* =================================================
                    CATEGORY CAROUSEL
                ================================================== */}

                <div
                    className={`transition-all duration-1000 ease-out delay-300 ${visible
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-10 opacity-0'
                        }`}
                >
                    <Suspense fallback={<LoadingSpinner />}>
                        <CategoryCarousel
                            categories={categories}
                            onCategoryClick={handleCategoryClick}
                        />
                    </Suspense>
                </div>

            </Container>
        </section>
    );
};

export default CategoryIconsSection;