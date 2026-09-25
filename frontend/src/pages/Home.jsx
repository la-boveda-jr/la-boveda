import { lazy, Suspense } from "react";
import { Hero, Container, LoadingSpinner } from "../components";

const CTA = lazy(() => import("../components/CTA"));
const CategoryIconsSection = lazy(() =>
    import("../components/CategoryIconsSection")
);
const HomeAuctionsSection = lazy(() =>
    import("../components/HomeAuctionsSection")
);
const HomeProductsSection = lazy(() =>
    import("../components/HomeProductsSection")
);
const TestimonialSection = lazy(() =>
    import("../components/TestimonialSection")
);
const About = lazy(() => import("../components/About"));
const HowItWorks = lazy(() => import("../components/HowItWorks"));

function Home() {
    return (
        <>
            <Hero />

            {/* Marquee section */}
            {/* <Container>
                <Marquee speed={50} gradient={false}>
                    <div className="flex gap-8 w-full my-14 mr-8">
                        {
                            trustedBrands.map(brand => (
                                <div key={brand.alt} className="flex items-center justify-center border rounded-lg shadow hover:shadow-lg transition-all border-slate-200 p-4 md:p-5 bg-white">
                                    <img
                                        src={brand.src}
                                        alt={brand.alt}
                                        className="h-6 sm:h-6 md:h-7 lg:h-8 xl:h-9 mix-blend-multiply"
                                    />
                                </div>
                            ))
                        }
                    </div>
                </Marquee>
            </Container> */}

            {/* Category section */}
            <Suspense fallback={<LoadingSpinner />}>
                <CategoryIconsSection />
            </Suspense>

            {/* Auctions section */}
            <Suspense fallback={<LoadingSpinner />}>
                <HomeAuctionsSection />
            </Suspense>

            {/* Products section */}
            <Suspense fallback={<LoadingSpinner />}>
                <HomeProductsSection />
            </Suspense>

            {/* Who we are section */}
            <Container className="mb-8 md:mb-0">
                <Suspense fallback={<LoadingSpinner />}>
                    <About />
                </Suspense>
            </Container>

            {/* How it works */}
            <Container>
                <Suspense fallback={<LoadingSpinner />}>
                    <HowItWorks />
                </Suspense>
            </Container>

            {/* Testimonials */}
            <Container>
                <Suspense fallback={<LoadingSpinner />}>
                    <TestimonialSection />
                </Suspense>
            </Container>

            <CTA />
        </>
    );
}

export default Home;