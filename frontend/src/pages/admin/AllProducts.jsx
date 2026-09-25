import { useEffect, useState } from "react";
import { AdminContainer, AdminHeader, AdminSidebar, LoadingSpinner, PaymentStatusDropdown } from "../../components";
import { Search, Filter, Tag, Clock, Eye, Edit, MoreVertical, Trash2, AlertTriangle, CheckCircle, Plus, FileText, Banknote, MessagesSquare } from "lucide-react";
import { about } from "../../assets";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { Link, useNavigate } from "react-router-dom";

function AllProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, sold: 0 });
    const [pagination, setPagination] = useState({
        currentPage: 1, totalPages: 1, totalAuctions: 0, hasNext: false, hasPrev: false
    });

    useEffect(() => {
        function handleClickOutside(event) {
            if (!event.target.closest('.relative')) setActiveDropdown(null);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchProducts = async (page = 1, search = searchTerm, productFilter = filter) => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get(`/api/v1/admin/auctions`, {
                params: {
                    page, limit: 10, search,
                    filter: productFilter !== 'all' ? productFilter : undefined,
                    context: 'product'
                }
            });
            if (data.success) {
                setProducts(data.data.auctions);
                setStats(data.data.stats);
                setPagination(data.data.pagination);
            }
        } catch (err) {
            console.error('Fetch products error:', err);
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const fetchProductDetails = async (productId) => {
        try {
            const { data } = await axiosInstance.get(`/api/v1/admin/auctions/${productId}`);
            if (data.success) {
                setSelectedProduct(data.data.auction);
                setIsModalOpen(true);
            }
        } catch (err) {
            toast.error("Failed to load product details");
        }
    };

    const approveProduct = async (productId) => {
        try {
            await toast.promise(
                axiosInstance.patch(`/api/v1/admin/auctions/${productId}/approve`),
                { loading: 'Approving product...', success: 'Product approved successfully!', error: 'Failed to approve product' }
            );
            fetchProducts();
        } catch (err) { console.error(err); }
    };

    const suspendProduct = async (productId) => {
        try {
            const { data } = await axiosInstance.patch(`/api/v1/admin/auctions/${productId}/status`, { status: 'cancelled' });
            if (data.success) { toast.success(data.message); fetchProducts(); }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to cancel product");
        }
    };

    const activateProduct = async (productId) => {
        try {
            const { data } = await axiosInstance.patch(`/api/v1/admin/auctions/${productId}/status`, { status: 'active' });
            if (data.success) { toast.success(data.message); fetchProducts(); }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to activate product");
        }
    };

    const deleteProduct = async (productId, productTitle) => {
        if (!window.confirm(`Are you sure you want to delete "${productTitle}"? This action cannot be undone.`)) return;
        try {
            const { data } = await axiosInstance.delete(`/api/v1/admin/auctions/${productId}`);
            if (data.success) { toast.success(data.message); fetchProducts(); }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete product");
        }
    };

    const handleUpdatePaymentStatus = async (productId, formData) => {
        try {
            const fd = new FormData();
            fd.append('paymentStatus', formData.paymentStatus);
            if (formData.paymentMethod) fd.append('paymentMethod', formData.paymentMethod);
            if (formData.transactionId) fd.append('transactionId', formData.transactionId);
            if (formData.notes) fd.append('notes', formData.notes);
            if (formData.invoiceFile) fd.append('invoice', formData.invoiceFile);

            const { data } = await axiosInstance.put(`/api/v1/admin/${productId}/payment-status`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (data.success) {
                toast.success('Payment status updated successfully');
                fetchProducts();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update payment status');
        }
    };

    useEffect(() => { fetchProducts(); }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchProducts(1, searchTerm, filter), 500);
        return () => clearTimeout(t);
    }, [searchTerm, filter]);

    const openProductModal = (product) => fetchProductDetails(product._id);
    const closeProductModal = () => { setIsModalOpen(false); setSelectedProduct(null); };
    const handleEditProduct = (product) => navigate(`/admin/products/edit/${product._id}`);

    const getStatusBadge = (status) => {
        const config = {
            active: { color: "bg-green-100 text-green-800", text: "Available" },
            draft: { color: "bg-amber-100 text-amber-800", text: "Pending" },
            sold: { color: "bg-blue-100 text-blue-800", text: "Sold" },
            cancelled: { color: "bg-red-100 text-red-800", text: "Cancelled" },
        };
        const { color, text } = config[status] || { color: "bg-gray-100 text-gray-800", text: status };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{text}</span>;
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount || 0);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <section className="flex min-h-screen bg-gray-50">
            <AdminSidebar />
            <div className="w-full relative">
                <AdminHeader />
                <AdminContainer>
                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold my-5">Product Management</h2>
                            </div>
                            <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {pagination.totalAuctions} products found
                                </div>
                                <Link to="/admin/products/create"
                                    className="bg-[#C59D55] text-white hover:bg-[#C59D55]/90 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
                                    <Plus size={18} />Create Product
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                            <div className="text-2xl font-bold text-gray-900">{stats.total?.toLocaleString('en-US')}</div>
                            <div className="text-sm text-gray-500">Total Products</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                            <div className="text-2xl font-bold text-green-600">{stats.active?.toLocaleString('en-US')}</div>
                            <div className="text-sm text-gray-500">Active</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                            <div className="text-2xl font-bold text-amber-600">{stats.pending?.toLocaleString('en-US')}</div>
                            <div className="text-sm text-gray-500">Pending</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                            <div className="text-2xl font-bold text-blue-600">{stats.sold?.toLocaleString('en-US')}</div>
                            <div className="text-sm text-gray-500">Sold</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input type="text" placeholder="Search products by title, seller, or category..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={18} className="text-gray-500" />
                                <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={filter} onChange={(e) => setFilter(e.target.value)}>
                                    <option value="all">All Products</option>
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="sold">Sold</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-16">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold">All Products</h3>
                        </div>
                        {loading ? (
                            <div className="flex justify-center items-center py-12"><LoadingSpinner /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                            <th className="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {products.map((product) => (
                                            <tr key={product._id} className="hover:bg-gray-50">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center">
                                                        <img src={product.photos?.[0]?.url || about} alt={product.title}
                                                            className="w-12 h-12 rounded-lg object-cover mr-3 border border-gray-200" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 truncate w-48"
                                                                onClick={() => openProductModal(product)} title={product.title}>
                                                                {product.title}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="text-lg text-green-600">
                                                        {formatCurrency(product.buyNowPrice || product.startPrice)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Listed: {formatDate(product.createdAt)}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {getStatusBadge(product.status)}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <PaymentStatusDropdown
                                                        auction={product}
                                                        onStatusUpdate={handleUpdatePaymentStatus}
                                                        disabled={product.status !== 'sold' && product.status !== 'sold_buy_now'}
                                                    />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {product?.status === 'sold' && (
                                                            <Link to={`/admin/communication/${product._id}`}
                                                                className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                                                                <MessagesSquare size={16} />
                                                            </Link>
                                                        )}
                                                        <button onClick={() => openProductModal(product)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                                            title="View Details">
                                                            <Eye size={16} />
                                                        </button>
                                                        <button onClick={() => handleEditProduct(product)}
                                                            className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                                                            title="Edit Product">
                                                            <Edit size={16} />
                                                        </button>
                                                        <div className="relative">
                                                            <button onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdown(activeDropdown === product._id ? null : product._id);
                                                            }}
                                                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                                                <MoreVertical size={16} />
                                                            </button>
                                                            {activeDropdown === product._id && (
                                                                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-40 py-1">
                                                                    {product?.invoice?.url && (
                                                                        <Link to={product.invoice.url} target="_blank" rel="noopener noreferrer"
                                                                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-blue-600 hover:bg-green-50 transition-colors">
                                                                            <FileText size={16} /><span>View Invoice</span>
                                                                        </Link>
                                                                    )}
                                                                    {product.status === "draft" && (
                                                                        <button onClick={() => { approveProduct(product._id); setActiveDropdown(null); }}
                                                                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors">
                                                                            <CheckCircle size={16} /><span>Approve Product</span>
                                                                        </button>
                                                                    )}
                                                                    {product.status === "active" && (
                                                                        <button onClick={() => { suspendProduct(product._id); setActiveDropdown(null); }}
                                                                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors">
                                                                            <AlertTriangle size={16} /><span>Cancel Product</span>
                                                                        </button>
                                                                    )}
                                                                    {product.status === "cancelled" && (
                                                                        <button onClick={() => { activateProduct(product._id); setActiveDropdown(null); }}
                                                                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors">
                                                                            <CheckCircle size={16} /><span>Activate Product</span>
                                                                        </button>
                                                                    )}
                                                                    <div className="border-t border-gray-100 my-1"></div>
                                                                    <button onClick={() => {
                                                                        if (window.confirm(`Are you sure you want to delete "${product.title}"?`)) {
                                                                            deleteProduct(product._id, product.title);
                                                                            setActiveDropdown(null);
                                                                        }
                                                                    }}
                                                                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                                                        <Trash2 size={16} /><span>Delete Product</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {products.length === 0 && (
                                    <div className="text-center py-12">
                                        <Tag size={48} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-500">No products found matching your criteria</p>
                                        <button onClick={() => { setSearchTerm(""); setFilter("all"); }}
                                            className="text-blue-600 hover:text-blue-800 mt-2">Clear filters</button>
                                    </div>
                                )}
                                {pagination.totalPages > 1 && (
                                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                                        <div className="text-sm text-gray-700">
                                            Showing page {pagination.currentPage} of {pagination.totalPages}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => fetchProducts(pagination.currentPage - 1)}
                                                disabled={!pagination.hasPrev}
                                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Previous</button>
                                            <button onClick={() => fetchProducts(pagination.currentPage + 1)}
                                                disabled={!pagination.hasNext}
                                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Next</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {isModalOpen && selectedProduct && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Product Details</h3>
                                    <button onClick={closeProductModal} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-start gap-4 mb-6">
                                        <img src={selectedProduct.photos?.[0]?.url || about} alt={selectedProduct.title}
                                            className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                                        <div className="flex-1">
                                            <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedProduct.title}</h4>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {getStatusBadge(selectedProduct.status)}
                                            </div>
                                            <div className="text-gray-600 prose">
                                                <div dangerouslySetInnerHTML={{ __html: selectedProduct.description }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-3">
                                            <h5 className="font-semibold text-gray-900">Pricing</h5>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Price</span>
                                                <span className="font-bold text-green-600">
                                                    {formatCurrency(selectedProduct.buyNowPrice || selectedProduct.startPrice)}
                                                </span>
                                            </div>
                                            {selectedProduct.finalPrice && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Final Price</span>
                                                    <span className="font-bold text-green-600">{formatCurrency(selectedProduct.finalPrice)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Views</span>
                                                <span className="font-medium">{selectedProduct.views}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Location</span>
                                                <span className="font-medium">{selectedProduct.location}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <h5 className="font-semibold text-gray-900">Participants</h5>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Seller</span>
                                                <span className="font-medium">{selectedProduct.seller?.username}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Seller Email</span>
                                                <span className="font-medium text-blue-600">{selectedProduct.seller?.email}</span>
                                            </div>
                                            {selectedProduct.winner && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Buyer</span>
                                                    <span className="font-medium text-green-600">{selectedProduct.winner?.username}</span>
                                                </div>
                                            )}
                                            {selectedProduct.status === 'sold' && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Payment</span>
                                                    <span className="font-medium capitalize">{selectedProduct?.paymentStatus}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Listed</span>
                                                <span className="font-medium">{formatDate(selectedProduct.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                                        <div className="mb-6">
                                            <h5 className="font-semibold text-gray-900 mb-3">Specifications</h5>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                                                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                                                        <div className="text-sm font-medium text-gray-500 capitalize">
                                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                                        </div>
                                                        <div className="text-sm text-gray-900">{value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-6 border-t border-gray-200">
                                        <button onClick={() => handleEditProduct(selectedProduct)}
                                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                            <Edit size={18} />Edit Product
                                        </button>
                                        <Link to={`/product/${selectedProduct._id}`} target="_blank"
                                            className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-center">
                                            View Product Page
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </AdminContainer>
            </div>
        </section>
    );
}

export default AllProducts;