import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { AdminSidebar, AdminHeader, AdminContainer, LoadingSpinner } from "../../components";
import axiosInstance from "../../utils/axiosInstance";
import {
    ArrowLeft, Send, Paperclip, Download, User, Truck, Edit3, Users
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

const CommunicationDetail = () => {
    const { auctionId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [communication, setCommunication] = useState(null);
    const [activeTab, setActiveTab] = useState("seller"); // "seller" or "buyer"
    const [newMessage, setNewMessage] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [sending, setSending] = useState(false);
    const [shippingForm, setShippingForm] = useState({
        company: "",
        trackingNumber: "",
        estimatedDelivery: "",
        notes: "",
    });
    const [updatingShipping, setUpdatingShipping] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!auctionId || auctionId === "undefined") {
            setError("Invalid ID");
            setLoading(false);
            return;
        }
        fetchCommunication();
    }, [auctionId]);

    useEffect(() => {
        fetchCommunication();
    }, []);

    useEffect(() => {
        if (communication) {
            scrollToBottom();
            markRead();
        }
    }, [communication, activeTab]);

    const fetchCommunication = async () => {
        try {
            setLoading(true);
            const { data } = await axiosInstance.get(`/api/v1/communication/${auctionId}`);
            if (data.success) {
                setCommunication(data.data);
                if (data.data.shippingInfo) {
                    setShippingForm({
                        company: data.data.shippingInfo.company || "",
                        trackingNumber: data.data.shippingInfo.trackingNumber || "",
                        estimatedDelivery: data.data.shippingInfo.estimatedDelivery
                            ? format(new Date(data.data.shippingInfo.estimatedDelivery), "yyyy-MM-dd")
                            : "",
                        notes: data.data.shippingInfo.notes || "",
                    });
                }
            } else {
                setError("Failed to load communication");
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Error loading communication");
        } finally {
            setLoading(false);
        }
    };

    const markRead = async () => {
        try {
            await axiosInstance.post(`/api/v1/communication/${auctionId}/read`);
        } catch (err) {
            console.error("Mark read error:", err);
        }
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    // Filter messages based on active tab
    const getFilteredMessages = () => {
        if (!communication) return [];
        const allMessages = communication.messages;
        const sellerId = communication.seller?._id;
        const buyerId = communication.winningBidder?._id;

        if (activeTab === "seller") {
            return allMessages.filter(msg => {
                const senderId = msg.sender?._id;
                const isSeller = senderId === sellerId;
                const isAdminMsg = msg.senderRole === "admin";
                const recipient = msg.recipient;
                return isSeller || (isAdminMsg && recipient === sellerId);
            });
        } else {
            // buyer tab
            return allMessages.filter(msg => {
                const senderId = msg.sender?._id;
                const isBuyer = senderId === buyerId;
                const isAdminMsg = msg.senderRole === "admin";
                const recipient = msg.recipient;
                return isBuyer || (isAdminMsg && recipient === buyerId);
            });
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && attachments.length === 0) return;

        const recipientId = activeTab === "seller"
            ? communication.seller._id
            : communication.winningBidder._id;

        setSending(true);
        const formData = new FormData();
        formData.append("content", newMessage);
        formData.append("recipientId", recipientId);
        attachments.forEach((file) => {
            formData.append("attachments", file);
        });

        try {
            await toast.promise(
                axiosInstance.post(
                    `/api/v1/communication/${auctionId}/message`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                ),
                {
                    loading: `Sending message to ${activeTab === "seller" ? "Seller" : "Buyer"}...`,
                    success: (response) => {
                        if (response.data.success) {
                            // 🔁 Refresh from server to apply filtering
                            fetchCommunication();
                            setNewMessage("");
                            setAttachments([]);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                            return `Message sent to ${activeTab === "seller" ? "Seller" : "Buyer"} successfully!`;
                        } else {
                            throw new Error("Failed to send message");
                        }
                    },
                    error: (err) => {
                        console.error(err);
                        return err.response?.data?.message || "Error sending message";
                    },
                }
            );
        } catch (error) {
            console.error("Toast promise error:", error);
        } finally {
            setSending(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setAttachments((prev) => [...prev, ...files]);
    };

    const removeAttachment = (index) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleShippingUpdate = async (e) => {
        e.preventDefault();
        setUpdatingShipping(true);
        try {
            const payload = {
                company: shippingForm.company,
                trackingNumber: shippingForm.trackingNumber,
                estimatedDelivery: shippingForm.estimatedDelivery || undefined,
                notes: shippingForm.notes,
            };
            const { data } = await axiosInstance.put(
                `/api/v1/communication/${auctionId}/shipping`,
                payload
            );
            if (data.success) {
                // 🔁 Refresh from server to apply filtering
                fetchCommunication();
                toast.success("Shipping info updated");
            } else {
                alert("Failed to update shipping");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating shipping");
        } finally {
            setUpdatingShipping(false);
        }
    };

    if (loading) {
        return (
            <section className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
                <AdminSidebar />
                <div className="w-full relative">
                    <AdminHeader />
                    <AdminContainer>
                        <div className="flex justify-center items-center min-h-96">
                            <LoadingSpinner />
                        </div>
                    </AdminContainer>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
                <AdminSidebar />
                <div className="w-full relative">
                    <AdminHeader />
                    <AdminContainer>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                            <p className="text-red-600">{error}</p>
                            <button
                                onClick={fetchCommunication}
                                className="mt-4 bg-[#C59D55] text-white hover:bg-[#C59D55]/90 px-4 py-2 rounded-lg"
                            >
                                Try Again
                            </button>
                        </div>
                    </AdminContainer>
                </div>
            </section>
        );
    }

    if (!communication) return null;

    const filteredMessages = getFilteredMessages();
    const { auction, seller, winningBidder, shippingInfo } = communication;

    return (
        <section className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
            <AdminSidebar />
            <div className="w-full relative">
                <AdminHeader />
                <AdminContainer>
                    <div className="pt-16 md:pt-8">
                        {/* Back button and title */}
                        <div className="flex items-center gap-4 mb-6">
                            <Link
                                to="/admin/communications/all"
                                className="p-2 bg-white rounded-full shadow hover:shadow-md transition"
                            >
                                <ArrowLeft size={20} className="text-gray-700" />
                            </Link>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Communication</h2>
                                <p className="text-sm text-gray-500">
                                    <span className="font-medium">{auction?.title || "N/A"}</span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main chat area */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow border border-gray-200 flex flex-col h-[600px]">
                                {/* Tabs */}
                                <div className="border-b border-gray-200 flex">
                                    <button
                                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === "seller"
                                            ? "border-b-2 border-[#C59D55] text-[#C59D55]"
                                            : "text-gray-500 hover:text-gray-700"
                                            }`}
                                        onClick={() => setActiveTab("seller")}
                                    >
                                        <User size={16} className="inline mr-2" />
                                        Seller
                                    </button>
                                    <button
                                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === "buyer"
                                            ? "border-b-2 border-[#C59D55] text-[#C59D55]"
                                            : "text-gray-500 hover:text-gray-700"
                                            }`}
                                        onClick={() => setActiveTab("buyer")}
                                    >
                                        <User size={16} className="inline mr-2" />
                                        Buyer
                                    </button>
                                </div>

                                {/* Messages container */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {filteredMessages.length === 0 ? (
                                        <div className="text-center text-gray-500 py-8">
                                            <p>No messages with this {activeTab} yet.</p>
                                        </div>
                                    ) : (
                                        filteredMessages.map((msg, idx) => {
                                            const isAdminMsg = msg.senderRole === "admin";
                                            const senderName = msg.sender?.firstName
                                                ? `${msg.sender.firstName} ${msg.sender.lastName || ""}`
                                                : msg.sender?.username || "Unknown";
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex ${isAdminMsg ? "justify-start" : "justify-end"}`}
                                                >
                                                    <div
                                                        className={`max-w-[75%] rounded-lg p-3 ${isAdminMsg
                                                            ? "bg-[#C59D55] text-white"
                                                            : "bg-gray-100 text-gray-800"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 text-xs mb-1">
                                                            <span className="font-semibold">{senderName}</span>
                                                            <span className="text-gray-600 dark:text-gray-600">•</span>
                                                            <span className="text-gray-600 dark:text-gray-600">
                                                                {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                                                            </span>
                                                        </div>
                                                        {msg.content && <p className="text-sm break-words">{msg.content}</p>}
                                                        {msg.attachments.length > 0 && (
                                                            <div className="mt-2 space-y-1">
                                                                {msg.attachments.map((att, i) => (
                                                                    <a
                                                                        key={i}
                                                                        href={att.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 text-sm underline hover:text-blue-600 transition"
                                                                    >
                                                                        <Download size={14} />
                                                                        <span>{att.originalName}</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message input */}
                                <form
                                    onSubmit={handleSendMessage}
                                    className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl"
                                >
                                    <div className="flex items-center flex-wrap gap-2">
                                        <input
                                            type="text"
                                            placeholder={`Send message to ${activeTab === "seller" ? "Seller" : "Buyer"}...`}
                                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#C59D55] focus:border-transparent"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            disabled={sending}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                                        >
                                            <Paperclip size={20} />
                                        </button>
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                        />
                                        <button
                                            type="submit"
                                            disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                                            className="bg-[#C59D55] text-white px-4 py-2 rounded-lg hover:bg-[#C59D55]/90 transition disabled:opacity-50 flex items-center gap-2 grow sm:grow-0 w-auto justify-center"
                                        >
                                            <Send size={18} />
                                            Send
                                        </button>
                                    </div>
                                    {attachments.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {attachments.map((file, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 bg-white border border-gray-300 rounded-full px-2 py-1 text-xs"
                                                >
                                                    <span className="truncate max-w-[120px]">{file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachment(idx)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </form>
                            </div>

                            {/* Right sidebar */}
                            <div className="space-y-6">
                                {/* Shipping Info (admin can edit) */}
                                <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
                                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <Truck size={18} /> Shipping Information
                                    </h3>
                                    <form onSubmit={handleShippingUpdate} className="space-y-3">
                                        <div>
                                            <label className="block text-sm text-gray-600">Courier / Company</label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                value={shippingForm.company}
                                                onChange={(e) =>
                                                    setShippingForm({ ...shippingForm, company: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600">Tracking Number</label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                value={shippingForm.trackingNumber}
                                                onChange={(e) =>
                                                    setShippingForm({ ...shippingForm, trackingNumber: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600">Estimated Delivery</label>
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                value={shippingForm.estimatedDelivery}
                                                onChange={(e) =>
                                                    setShippingForm({ ...shippingForm, estimatedDelivery: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600">Notes</label>
                                            <textarea
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                rows="2"
                                                value={shippingForm.notes}
                                                onChange={(e) =>
                                                    setShippingForm({ ...shippingForm, notes: e.target.value })
                                                }
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={updatingShipping}
                                            className="w-full bg-[#C59D55] text-white py-2 rounded-lg hover:bg-[#C59D55]/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Edit3 size={16} />
                                            Update Shipping
                                        </button>
                                    </form>
                                    {/* {shippingInfo?.updatedBy && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Last updated by {shippingInfo.updatedBy.firstName || shippingInfo.updatedBy.username}
                                        </p>
                                    )} */}
                                </div>

                                {/* Auction summary */}
                                <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
                                    <h3 className="font-semibold text-gray-700 mb-2">Item Details</h3>
                                    <div className="text-sm space-y-1">
                                        <p><span className="text-gray-500">Title:</span> {auction?.title}</p>
                                        <p><span className="text-gray-500">Final Price:</span> ${auction?.finalPrice?.toLocaleString()}</p>
                                        <p><span className="text-gray-500">Status:</span> {auction?.status}</p>
                                    </div>
                                </div>

                                {/* Participants */}
                                {/* <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
                                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <Users size={18} /> Participants
                                    </h3>
                                    <div className="text-sm space-y-1">
                                        <p><span className="text-gray-500">Seller:</span> {seller?.firstName || seller?.username}</p>
                                        <p><span className="text-gray-500">Buyer:</span> {winningBidder?.firstName || winningBidder?.username}</p>
                                    </div>
                                </div> */}
                            </div>
                        </div>
                    </div>
                </AdminContainer>
            </div>
        </section>
    );
};

export default CommunicationDetail;