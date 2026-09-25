import React, { useEffect, useRef, useState } from "react";

const languages = [
    { code: "en", name: "English", flag: "https://flagcdn.com/us.svg" },
    { code: "es", name: "Spanish", flag: "https://flagcdn.com/es.svg" },
];

export default function LanguageSwitcher({ isScrolled }) {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState(languages[0]);
    const containerRef = useRef(null);

    // Check for existing translation on mount
    useEffect(() => {
        const match = document.cookie.match(/googtrans=\/en\/([^;]+)/);
        if (match) {
            const lang = languages.find(l => l.code === match[1]);
            if (lang) setCurrent(lang);
        }

        const removeBanner = () => {
            document.querySelectorAll(".goog-te-banner-frame").forEach(el => {
                el.style.display = "none";
            });
            document.body.style.top = "0px";
        };

        removeBanner();
        const interval = setInterval(removeBanner, 500);
        return () => clearInterval(interval);
    }, []);

    // Outside click — scoped to THIS instance via ref
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        if (open) {
            // pointerdown covers both mouse and touch reliably
            document.addEventListener("pointerdown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [open]);

    function changeLanguage(lang) {
        setCurrent(lang);
        setOpen(false);

        if (lang.code === "en") {
            resetTranslation();
            return;
        }

        triggerTranslation(lang.code);
    }

    function resetTranslation() {
        const domain = window.location.hostname;
        const paths = ['/', '/en/', '/us/', '/home/'];

        paths.forEach(path => {
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`;
            const rootDomain = domain.split('.').slice(-2).join('.');
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${rootDomain}`;
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
        });

        setTimeout(() => {
            window.location.reload();
        }, 200);
    }

    function triggerTranslation(targetLang) {
        const attemptTranslation = (retries = 10) => {
            const select = document.querySelector(".goog-te-combo");

            if (!select) {
                if (retries > 0) {
                    setTimeout(() => attemptTranslation(retries - 1), 500);
                } else {
                    console.error("Google Translate not loaded");
                    window.location.reload();
                }
                return;
            }

            select.value = targetLang;
            const event = new Event("change", { bubbles: true });
            select.dispatchEvent(event);

            if (window.google && window.google.translate) {
                try {
                    const translateElement = document.querySelector('.goog-te-gadget-simple');
                    if (translateElement) {
                        translateElement.style.display = 'none';
                        setTimeout(() => {
                            translateElement.style.display = '';
                        }, 50);
                    }
                } catch (e) {
                    console.log("Alternative translation method failed", e);
                }
            }
        };

        attemptTranslation();
    }

    return (
        <div ref={containerRef} className="lang-container relative">
            <button
                className="lang-button flex items-center gap-1 px-2 py-1 md:py-1.5 md:px-3 border rounded-md"
                onClick={() => setOpen(!open)}
            >
                <img
                    src={current.flag}
                    alt={current.name}
                    className="w-7 h-5 object-cover rounded-sm brightness-[85%]"
                />
                <span className={`hidden sm:inline ${isScrolled ? 'text-black' : 'text-white'}`}>
                    {current.name}
                </span>
                <span className={`text-sm ${isScrolled ? 'text-black' : 'text-white'}`}>▾</span>
            </button>

            {open && (
                <div className="lang-dropdown absolute top-full right-0 mt-1 bg-white border rounded-md shadow-lg z-50 min-w-[85px]">
                    {languages.map((lang) => (
                        <div
                            key={lang.code}
                            className="lang-option flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer whitespace-nowrap"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                changeLanguage(lang);
                            }}
                            onClick={(e) => {
                                if (e.detail === 0) changeLanguage(lang);
                            }}
                        >
                            <img
                                src={lang.flag}
                                alt={lang.name}
                                className="w-7 h-5 object-cover rounded-sm border"
                                loading="lazy"
                            />

                            {/* Mobile: show language code */}
                            <span className="inline sm:hidden text-xs font-semibold uppercase">
                                {lang.code}
                            </span>

                            {/* Desktop: show full language name */}
                            <span className="hidden sm:inline">
                                {lang.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}