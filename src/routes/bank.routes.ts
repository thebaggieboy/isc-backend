import { Router } from 'express';
import { bankController } from '../controllers/bank.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', bankController.addBank);
router.get('/', bankController.getBanks);
router.delete('/:id', bankController.deleteBank);
router.patch('/:id/default', bankController.setDefaultBank);

export const bankRoutes = router;
