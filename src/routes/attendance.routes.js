import { Router } from 'express';
import { authorize, protect } from '../middlewares/auth.js';
import { eventAttendance, markAttendance } from '../controllers/attendance.controller.js';

const r = Router();

r.post('/', protect, authorize('organizer','admin'), markAttendance);
r.get('/event/:eventId', protect, authorize('organizer','admin'), eventAttendance);

export default r;
