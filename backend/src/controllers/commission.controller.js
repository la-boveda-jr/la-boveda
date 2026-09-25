import Commission from '../models/commission.model.js';

const VALID_SCOPES = ['auction', 'product'];
const DEFAULT_VALUES = { auction: 5, product: 10 };

const getOrCreateCommission = async (scope) => {
    let commission = await Commission.findOne({ scope });
    if (!commission) {
        commission = await Commission.create({
            scope,
            commissionType: 'percentage',
            commissionValue: DEFAULT_VALUES[scope],
        });
    }
    return commission;
};

// GET / — return both scopes
export const getCommissions = async (req, res) => {
    try {
        const [auction, product] = await Promise.all([
            getOrCreateCommission('auction'),
            getOrCreateCommission('product'),
        ]);

        res.status(200).json({
            success: true,
            data: { auction, product },
        });
    } catch (error) {
        console.error('Get commissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching commission settings',
        });
    }
};

// PUT /:scope — update a single scope
export const updateCommission = async (req, res) => {
    try {
        const { scope } = req.params;
        const { commissionType, commissionValue } = req.body;

        if (!VALID_SCOPES.includes(scope)) {
            return res.status(400).json({
                success: false,
                message: `Invalid scope. Must be one of: ${VALID_SCOPES.join(', ')}`,
            });
        }

        if (!commissionType || !['fixed', 'percentage'].includes(commissionType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid commission type. Must be "fixed" or "percentage"',
            });
        }

        if (commissionValue === undefined || commissionValue < 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid commission value is required',
            });
        }

        if (commissionType === 'percentage' && commissionValue > 100) {
            return res.status(400).json({
                success: false,
                message: 'Percentage commission cannot exceed 100%',
            });
        }

        let commission = await Commission.findOne({ scope });

        if (commission) {
            commission.commissionType = commissionType;
            commission.commissionValue = commissionValue;
            commission.updatedBy = req.user._id;
            await commission.save();
        } else {
            commission = await Commission.create({
                scope,
                commissionType,
                commissionValue,
                updatedBy: req.user._id,
            });
        }

        res.status(200).json({
            success: true,
            message: `${scope.charAt(0).toUpperCase() + scope.slice(1)} commission updated successfully`,
            data: { commission },
        });
    } catch (error) {
        console.error('Update commission error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating commission settings',
        });
    }
};