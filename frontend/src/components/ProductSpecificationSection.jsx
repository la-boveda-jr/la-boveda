import {
    Settings,
    FileText,
    Calendar,
    Gauge,
    Fuel,
    Key,
    PoundSterling,
    Shield,
    Wrench,
    Users,
    Award,
    CheckCircle,
    XCircle,
    Clock,
    Tag,
    PaintBucket,
    AlertCircle,
    Car,
} from "lucide-react";
import { useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";

// --------------------------------------------------
// Icon mapping
// --------------------------------------------------

const ICON_MAP = {
    make: Car,
    model: Car,
    vehicle_type: Car,
    body_type: Car,

    year: Calendar,
    registration_year: Calendar,
    manufacture_year: Calendar,

    mileage: Gauge,
    kilometers: Gauge,
    kilometres: Gauge,
    odometer: Gauge,

    fuel: Fuel,
    fuel_type: Fuel,

    transmission: Settings,
    gearbox: Settings,

    keys: Key,
    number_of_keys: Key,

    price: PoundSterling,
    value: PoundSterling,

    condition: Shield,
    condition_report: FileText,

    service_history: Wrench,
    service: Wrench,

    seats: Users,
    seating_capacity: Users,

    warranty: Award,

    colour: PaintBucket,
    color: PaintBucket,
    exterior_colour: PaintBucket,
    interior_colour: PaintBucket,

    age: Clock,

    category: Tag,

    verified: CheckCircle,

    damage: AlertCircle,
};

// Default icon
const DefaultIcon = FileText;


// --------------------------------------------------
// Helper
// --------------------------------------------------

const getFieldIcon = (key, fieldType) => {
    const normalizedKey = key
        ?.toLowerCase()
        ?.trim()
        ?.replace(/\s+/g, "_");

    if (ICON_MAP[normalizedKey]) {
        return ICON_MAP[normalizedKey];
    }

    if (fieldType === "boolean") {
        return CheckCircle;
    }

    if (fieldType === "date") {
        return Calendar;
    }

    if (
        normalizedKey?.includes("year") ||
        normalizedKey?.includes("date")
    ) {
        return Calendar;
    }

    if (
        normalizedKey?.includes("price") ||
        normalizedKey?.includes("cost") ||
        normalizedKey?.includes("value")
    ) {
        return PoundSterling;
    }

    if (
        normalizedKey?.includes("mileage") ||
        normalizedKey?.includes("kilometer") ||
        normalizedKey?.includes("odometer")
    ) {
        return Gauge;
    }

    return DefaultIcon;
};


// --------------------------------------------------
// Product Specification Section
// --------------------------------------------------

const ProductSpecificationSection = ({ auction }) => {
    const [groupedFields, setGroupedFields] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCategoryFields = async () => {
            if (
                !auction?.categories ||
                auction.categories.length === 0
            ) {
                return;
            }

            const categorySlug =
                auction.categories[
                auction.categories.length - 1
                ];

            try {
                setLoading(true);

                const { data } = await axiosInstance.get(
                    `/api/v1/categories/public/by-slug/${categorySlug}/fields`
                );

                if (
                    data.success &&
                    data.data.fields
                ) {
                    const fieldConfigMap = {};

                    data.data.fields.forEach((field) => {
                        fieldConfigMap[field.name] = {
                            group:
                                field.group ||
                                "General",
                            label:
                                field.label ||
                                field.name,
                            unit:
                                field.unit || "",
                            fieldType:
                                field.fieldType,
                        };
                    });

                    const grouped = {};

                    if (auction.specifications) {
                        const specs =
                            auction.specifications.get
                                ? Array.from(
                                    auction.specifications.entries()
                                )
                                : Object.entries(
                                    auction.specifications
                                );

                        specs.forEach(
                            ([key, value]) => {
                                if (
                                    value === undefined ||
                                    value === null ||
                                    value === ""
                                ) {
                                    return;
                                }

                                const config =
                                    fieldConfigMap[
                                    key
                                    ] || {
                                        group: "General",
                                        label: key
                                            .split(
                                                "_"
                                            )
                                            .map(
                                                (
                                                    word
                                                ) =>
                                                    word
                                                        .charAt(
                                                            0
                                                        )
                                                        .toUpperCase() +
                                                    word.slice(
                                                        1
                                                    )
                                            )
                                            .join(
                                                " "
                                            ),
                                        unit: "",
                                    };

                                if (
                                    !grouped[
                                    config.group
                                    ]
                                ) {
                                    grouped[
                                        config.group
                                    ] = [];
                                }

                                grouped[
                                    config.group
                                ].push({
                                    key,
                                    value,
                                    label:
                                        config.label,
                                    unit:
                                        config.unit,
                                    fieldType:
                                        config.fieldType,
                                });
                            }
                        );
                    }

                    setGroupedFields(grouped);
                }
            } catch (error) {
                console.error(
                    "Error fetching category fields:",
                    error
                );

                // Fallback
                const fallbackGrouped = {
                    General: [],
                };

                if (auction.specifications) {
                    const specs =
                        auction.specifications.get
                            ? Array.from(
                                auction.specifications.entries()
                            )
                            : Object.entries(
                                auction.specifications
                            );

                    specs.forEach(
                        ([key, value]) => {
                            if (
                                value === undefined ||
                                value === null ||
                                value === ""
                            ) {
                                return;
                            }

                            fallbackGrouped.General.push(
                                {
                                    key,
                                    value,
                                    label: key
                                        .split("_")
                                        .map(
                                            (word) =>
                                                word
                                                    .charAt(
                                                        0
                                                    )
                                                    .toUpperCase() +
                                                word.slice(
                                                    1
                                                )
                                        )
                                        .join(" "),
                                    unit: "",
                                    fieldType:
                                        "text",
                                }
                            );
                        }
                    );
                }

                setGroupedFields(
                    fallbackGrouped
                );
            } finally {
                setLoading(false);
            }
        };

        fetchCategoryFields();
    }, [auction]);

    // --------------------------------------------------
    // No specifications
    // --------------------------------------------------

    if (!auction?.specifications) {
        return null;
    }

    if (
        Object.keys(groupedFields).length === 0 &&
        !loading
    ) {
        return null;
    }

    // --------------------------------------------------
    // Format values
    // --------------------------------------------------

    const formatValue = (
        value,
        fieldType,
        unit
    ) => {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        if (fieldType === "boolean") {
            return value ? "Yes" : "No";
        }

        if (typeof value === "number") {
            return unit
                ? `${value.toLocaleString()} ${unit}`
                : value.toLocaleString();
        }

        if (
            fieldType === "date" ||
            (typeof value === "string" &&
                value.match(
                    /^\d{4}-\d{2}-\d{2}/
                ))
        ) {
            try {
                const date = new Date(value);

                return date.toLocaleDateString(
                    "en-GB",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    }
                );
            } catch (e) {
                return value;
            }
        }

        if (typeof value === "string") {
            return unit
                ? `${value} ${unit}`
                : value;
        }

        return value;
    };

    // --------------------------------------------------
    // Derived layout values
    // --------------------------------------------------

    const groupEntries = Object.entries(groupedFields);

    const isSingleGroup = groupEntries.length === 1;

    const totalFields = groupEntries.reduce(
        (total, [, fields]) => total + fields.length,
        0
    );

    // --------------------------------------------------
    // Loading
    // --------------------------------------------------

    if (loading) {
        return (
            <section className="mt-12">
                {/* Heading */}

                <div className="mb-8">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#C59D55]">
                        Product Information
                    </p>

                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                        Specifications
                    </h2>
                </div>

                {/* Skeleton */}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {[0, 1].map((cardIndex) => (
                        <div
                            key={cardIndex}
                            className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white"
                        >
                            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-4 sm:px-6">
                                <div className="h-10 w-10 rounded-xl bg-gray-200/70" />

                                <div className="space-y-2">
                                    <div className="h-3 w-28 rounded bg-gray-200/70" />
                                    <div className="h-2.5 w-16 rounded bg-gray-100" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-2">
                                {[0, 1, 2, 3].map(
                                    (fieldIndex) => (
                                        <div
                                            key={fieldIndex}
                                            className="flex items-start gap-3 bg-white px-5 py-4"
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-gray-100" />

                                            <div className="flex-1 space-y-2">
                                                <div className="h-2.5 w-16 rounded bg-gray-100" />
                                                <div className="h-3 w-24 rounded bg-gray-200/70" />
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // --------------------------------------------------
    // Render
    // --------------------------------------------------

    return (
        <section className="mt-12">
            {/* Section heading */}

            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#C59D55]">
                        Product Information
                    </p>

                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                        Specifications
                    </h2>
                </div>

                <div className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm sm:self-auto">
                    <Settings
                        size={14}
                        className="text-[#C59D55]"
                    />

                    {totalFields} specifications
                </div>
            </div>

            {/* Specification groups */}

            <div
                className={`grid grid-cols-1 gap-6 ${isSingleGroup
                    ? ""
                    : "lg:grid-cols-2"
                    }`}
            >
                {groupEntries.map(
                    ([groupName, fields]) => {
                        const GroupIcon =
                            getFieldIcon(
                                groupName,
                                null
                            );

                        return (
                            <div
                                key={groupName}
                                className="group/card relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C59D55]/30 hover:shadow-lg hover:shadow-[#C59D55]/5"
                            >
                                {/* Gold accent line */}

                                <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#C59D55] via-[#e3cb98] to-transparent" />

                                {/* Group header */}

                                <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-4 sm:px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C59D55]/10 text-[#9b783b] ring-1 ring-[#C59D55]/20 transition-transform duration-300 group-hover/card:scale-105">
                                            <GroupIcon
                                                size={18}
                                                strokeWidth={
                                                    1.8
                                                }
                                            />
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-bold tracking-tight text-gray-900">
                                                {
                                                    groupName
                                                }
                                            </h3>

                                            <p className="mt-0.5 text-xs text-gray-400">
                                                {
                                                    fields.length
                                                }{" "}
                                                {fields.length ===
                                                    1
                                                    ? "item"
                                                    : "items"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Fields grid */}

                                <div
                                    className={`grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-2 ${isSingleGroup
                                        ? "xl:grid-cols-3"
                                        : ""
                                        }`}
                                >
                                    {fields.map(
                                        ({
                                            key,
                                            value,
                                            label,
                                            unit,
                                            fieldType,
                                        }) => {
                                            const formattedValue =
                                                formatValue(
                                                    value,
                                                    fieldType,
                                                    unit
                                                );

                                            const FieldIcon =
                                                getFieldIcon(
                                                    key,
                                                    fieldType
                                                );

                                            const isBoolean =
                                                fieldType ===
                                                "boolean";

                                            const booleanValue =
                                                isBoolean &&
                                                Boolean(
                                                    value
                                                );

                                            return (
                                                <div
                                                    key={
                                                        key
                                                    }
                                                    className="group/field flex items-start gap-3 bg-white px-5 py-4 transition-colors duration-200 hover:bg-[#C59D55]/[0.05]"
                                                >
                                                    {/* Icon */}

                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors duration-200 group-hover/field:bg-[#C59D55]/15 group-hover/field:text-[#9b783b]">
                                                        <FieldIcon
                                                            size={
                                                                16
                                                            }
                                                            strokeWidth={
                                                                1.8
                                                            }
                                                        />
                                                    </div>

                                                    {/* Label + value */}

                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                                            {
                                                                label
                                                            }
                                                        </p>

                                                        {isBoolean ? (
                                                            <span
                                                                className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${booleanValue
                                                                    ? "bg-green-50 text-green-700"
                                                                    : "bg-gray-100 text-gray-500"
                                                                    }`}
                                                            >
                                                                {booleanValue ? (
                                                                    <CheckCircle
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <XCircle
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
                                                                )}

                                                                {booleanValue
                                                                    ? "Yes"
                                                                    : "No"}
                                                            </span>
                                                        ) : (
                                                            <p className="mt-1 break-words text-sm font-semibold capitalize text-gray-900">
                                                                {
                                                                    formattedValue
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        );
                    }
                )}
            </div>
        </section>
    );
};

export default ProductSpecificationSection;