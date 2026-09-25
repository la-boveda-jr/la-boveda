import { useState, useEffect } from "react";
import { LoadingSpinner, SellerContainer, SellerHeader, SellerSidebar } from "../../components";
import { Award, Calendar, Clock, User, Shield, Package, Tag } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { Link } from "react-router-dom";

function SoldProducts() {
    const [productsData, setProductsData] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSoldProducts = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data } = await axiosInstance.get("/api/v1/auctions/sold-auctions", {
                params: { context: 'product' }
            });

            if (data.success) {
                setProductsData(data.data.auctions);
                if (data.data.auctions.length > 0) setSelectedProduct(data.data.auctions[0]);
            } else {
                setError("Failed to fetch sold products");
            }
        } catch (err) {
            setError("Error loading sold products");
            console.error("Fetch sold products error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSoldProducts(); }, []);

    const formatTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount || 0);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    if (loading) {
        return (
            <section className="flex min-h-screen bg-gray-50">
                <SellerSidebar />
                <div className="w-full relative">
                    <SellerHeader />
                    <SellerContainer>
                        <div className="flex justify-center items-center h-64">
                            <LoadingSpinner />
                        </div>
                    </SellerContainer>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="flex min-h-screen bg-gray-50">
                <SellerSidebar />
                <div className="w-full relative">
                    <SellerHeader />
                    <SellerContainer>
                        <div className="flex justify-center items-center h-64">
                            <div className="text-center text-red-600">
                                <p>{error}</p>
                                <button onClick={fetchSoldProducts}
                                    className="mt-4 bg-[#C59D55] text-white px-4 py-2 rounded-lg hover:bg-[#C59D55]/90">
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </SellerContainer>
                </div>
            </section>
        );
    }

    if (productsData.length === 0) {
        return (
            <section className="flex min-h-screen bg-gray-50">
                <SellerSidebar />
                <div className="w-full relative">
                    <SellerHeader />
                    <SellerContainer>
                        <div className="max-w-full pt-16 pb-7 md:pt-0">
                            <h2 className="text-3xl md:text-4xl font-bold my-5 text-gray-800">Sold Products</h2>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <Tag size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Sold Products Yet</h3>
                            <p className="text-gray-500">Products that have been sold will appear here once they are completed.</p>
                        </div>
                    </SellerContainer>
                </div>
            </section>
        );
    }

    return (
        <section className="flex min-h-screen bg-gray-50">
            <SellerSidebar />
            <div className="w-full relative">
                <SellerHeader />
                <SellerContainer>
                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <h2 className="text-3xl md:text-4xl font-bold my-5 text-gray-800">Sold Products</h2>
                    </div>

                    <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Completed Product</label>
                        <select className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                            value={selectedProduct?.id || ""}
                            onChange={(e) => setSelectedProduct(productsData.find(p => p.id === e.target.value))}>
                            {productsData.map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.title} - Sold for {formatCurrency(product.winningBid)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedProduct && (
                        <>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Tag size={20} className="text-blue-600" />
                                            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                                {selectedProduct.category}
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">
                                            <Link to={`/product/${selectedProduct.id}`} target="_blank">{selectedProduct.title}</Link>
                                        </h3>
                                        <div className="flex flex-wrap gap-4 mt-4">
                                            <div>
                                                <div className="text-sm text-gray-500">Product Price</div>
                                                <div className="font-medium">{formatCurrency(selectedProduct.startingBid)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-xl">
                                        <div className="text-sm font-medium">Final Price</div>
                                        <div className="text-2xl font-bold">{formatCurrency(selectedProduct.winningBid)} <span className="text-[12px]">(+{formatCurrency(selectedAuction?.commissionAmount)})</span></div>
                                        <div className="text-xs mt-1">Product sold</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                                    <div className="flex items-center">
                                        <Calendar size={20} className="text-blue-500 mr-3" />
                                        <div>
                                            <div className="text-sm text-gray-500">Listed</div>
                                            <div className="font-medium">{formatDate(selectedProduct.startTime)}</div>
                                            <div className="text-sm text-gray-500">{formatTime(selectedProduct.startTime)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar size={20} className="text-blue-500 mr-3" />
                                        <div>
                                            <div className="text-sm text-gray-500">Sold</div>
                                            <div className="font-medium">{formatDate(selectedProduct.endTime)}</div>
                                            <div className="text-sm text-gray-500">{formatTime(selectedProduct.endTime)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                                <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                                    <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                                        <Award className="mr-2" size={20} />Buyer
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="flex-shrink-0">
                                            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                                                {selectedProduct.winner?.image ?
                                                    <img src={selectedProduct.winner.image} alt="buyer" className="object-cover" /> :
                                                    <User size={24} className="text-blue-600" />}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xl font-bold text-gray-900">{selectedProduct.winner?.name}</h4>
                                            <p className="text-gray-600">{selectedProduct.winner?.username}</p>
                                            <div className="flex flex-wrap gap-4 mt-3">
                                                <div>
                                                    <div className="text-sm text-gray-500">Final Price</div>
                                                    <div className="font-medium text-green-600">{formatCurrency(selectedProduct.winningBid)}</div>
                                                </div>
                                            </div>
                                            {selectedProduct?.paymentStatus && (
                                                <div className="flex flex-wrap gap-4 mt-3">
                                                    <div>
                                                        <div className="text-sm text-gray-500">Payment Status</div>
                                                        <div className="font-bold text-green-600">{selectedProduct?.paymentStatus}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <Link to={`/seller/communication/${selectedProduct.id}`}
                                            className="flex-1 text-center border border-[#C59D55] text-[#C59D55] hover:bg-[#C59D55] hover:text-white py-3 px-6 rounded-lg font-semibold transition-all">
                                            Contact Admin
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SellerContainer>
            </div>
        </section>
    );
}

export default SoldProducts;