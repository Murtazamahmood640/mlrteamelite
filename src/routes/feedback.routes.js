import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import { eventFeedback, submitFeedback } from '../controllers/feedback.controller.js';

const r = Router();

r.post('/submit', protect, submitFeedback);
r.get('/event/:eventId', eventFeedback);

export default r;
