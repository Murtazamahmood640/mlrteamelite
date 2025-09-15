import { Router } from 'express';
import { getAboutData } from '../controllers/about.controller.js';

const router = Router();

// GET /api/about - Get about page data
router.get('/', getAboutData);

export default router;