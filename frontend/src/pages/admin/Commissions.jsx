import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../utils/axiosInstance';
import { Crown, Save, Banknote, Percent, Settings, Gavel, ShoppingBag } from 'lucide-react';
import { AdminContainer, AdminHeader, AdminSidebar } from '../../components';

const CommissionCard = ({ scope, commission, onUpdate }) => {
    const [localCommission, setLocalCommission] = useState(commission || {
        commissionType: 'percentage', commissionValue: scope === 'product' ? 10 : 5
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (commission) setLocalCommission(commission); }, [commission]);

    const handleTypeChange = (type) => {
        setLocalCommission(prev => ({
            ...prev, commissionType: type,
            commissionValue: type === 'percentage' && prev.commissionValue > 100 ? 100 : prev.commissionValue
        }));
    };

    const handleValueChange = (value) => {
        const numValue = parseFloat(value) || 0;
        if (localCommission.commissionType === 'percentage' && numValue > 100) {
            toast.error('Percentage cannot exceed 100%');
            return;
        }
        setLocalCommission(prev => ({ ...prev, commissionValue: numValue }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const { data } = await axiosInstance.put(`/api/v1/commissions/${scope}`, {
                commissionType: localCommission.commissionType,
                commissionValue: localCommission.commissionValue
            });
            if (data.success) {
                toast.success(`${scope.charAt(0).toUpperCase() + scope.slice(1)} commission updated`);
                onUpdate?.(data.data.commission);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update commission");
        } finally { setSaving(false); }
    };

    const getDisplayValue = () => {
        const value = localCommission.commissionValue || 0;
        return localCommission.commissionType === 'fixed' ? `$${value}` : `${value}%`;
    };

    const isAuction = scope === 'auction';
    const headerBg = isAuction ? 'from-slate-900 to-slate-950' : 'from-emerald-800 to-emerald-950';
    const accentColor = isAuction ? 'text-orange-500' : 'text-emerald-600';
    const accentBg = isAuction ? 'bg-orange-100 text-orange-500' : 'bg-emerald-100 text-emerald-600';

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className={`bg-gradient-to-r ${headerBg} px-6 py-4`}>
                <div className="flex items-center gap-3">
                    {isAuction ? <Gavel size={24} className="text-white" /> : <ShoppingBag size={24} className="text-white" />}
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            {isAuction ? 'Auction Commission Rate' : 'Product Commission Rate'}
                        </h3>
                        <p className="text-gray-300 text-sm">
                            {isAuction ? 'Applies to all standard and reserve auction sales' : 'Applies to all Buy Now product sales'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Current Commission</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold">{getDisplayValue()}</span>
                            <span className="text-gray-500 text-sm">
                                {localCommission.commissionType === 'fixed' ? 'fixed amount' : 'of sale price'}
                            </span>
                        </div>
                    </div>
                    <div className={`p-4 rounded-full ${localCommission.commissionType === 'fixed' ? 'bg-green-100 text-green-600' : accentBg}`}>
                        {localCommission.commissionType === 'fixed' ? <Banknote size={28} /> : <Percent size={28} />}
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Commission Type</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleTypeChange('fixed')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${localCommission.commissionType === 'fixed'
                                ? 'border-green-600 bg-green-50 text-green-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                            <Banknote size={20} /><span className="font-medium">Fixed Amount</span>
                        </button>
                        <button onClick={() => handleTypeChange('percentage')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${localCommission.commissionType === 'percentage'
                                ? `border-current ${accentColor} ${isAuction ? 'bg-orange-50' : 'bg-emerald-50'}`
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                            <Percent size={20} /><span className="font-medium">Percentage</span>
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {localCommission.commissionType === 'fixed' ? 'Amount ($)' : 'Percentage (%)'}
                    </label>
                    <div className="relative">
                        <input type="number" min="0"
                            max={localCommission.commissionType === 'percentage' ? 100 : undefined}
                            step={localCommission.commissionType === 'percentage' ? "0.1" : "10"}
                            value={localCommission.commissionValue}
                            onChange={(e) => handleValueChange(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-lg" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                            {localCommission.commissionType === 'fixed' ? '$' : '%'}
                        </span>
                    </div>
                    {localCommission.commissionType === 'percentage' && (
                        <p className="mt-2 text-sm text-gray-500">Percentage of the final sale price (0-100%)</p>
                    )}
                </div>

                {localCommission.updatedAt && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                        <p>Last updated: {new Date(localCommission.updatedAt).toLocaleString()}</p>
                    </div>
                )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button onClick={handleSave} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-[#C59D55] text-white hover:bg-[#C59D55]/90 px-6 py-3 rounded-lg transition-colors disabled:opacity-50 font-medium">
                    {saving ? (
                        <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>Saving...</>
                    ) : (
                        <><Save size={20} />Save {isAuction ? 'Auction' : 'Product'} Commission</>
                    )}
                </button>
            </div>
        </div>
    );
};

const Commissions = () => {
    const [commissions, setCommissions] = useState({ auction: null, product: null });
    const [loading, setLoading] = useState(true);

    const fetchCommissions = async () => {
        try {
            setLoading(true);
            const { data } = await axiosInstance.get('/api/v1/commissions');
            if (data.success) setCommissions(data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to fetch commission settings");
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchCommissions(); }, []);

    return (
        <section className="flex min-h-screen bg-gray-50">
            <AdminSidebar />
            <div className="w-full relative">
                <AdminHeader />
                <AdminContainer>
                    <div className="max-w-full pt-16 pb-7 md:pt-0">
                        <div className="flex items-center gap-3 mb-2">
                            <Settings size={32} className="text-green-600" />
                            <h2 className="text-3xl md:text-4xl font-bold">Commission Settings</h2>
                        </div>
                        <p className="text-gray-600">Configure separate commission rates for auctions and products</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                        </div>
                    ) : (
                        <div className="max-w-full mx-auto">
                            <CommissionCard scope="auction" commission={commissions.auction}
                                onUpdate={(updated) => setCommissions(prev => ({ ...prev, auction: updated }))} />
                            <CommissionCard scope="product" commission={commissions.product}
                                onUpdate={(updated) => setCommissions(prev => ({ ...prev, product: updated }))} />
                        </div>
                    )}
                </AdminContainer>
            </div>
        </section>
    );
};

export default Commissions;