import { Router } from 'express';
import {
    getCommissions,
    updateCommission,
} from '../controllers/commission.controller.js';
import { authAdmin } from '../middlewares/auth.middleware.js';

const commissionRouter = Router();

// GET returns both scopes (auction + product) in one call
commissionRouter.get('/', getCommissions);

// PUT updates a single scope
commissionRouter.put('/:scope', authAdmin, updateCommission);

export default commissionRouter;