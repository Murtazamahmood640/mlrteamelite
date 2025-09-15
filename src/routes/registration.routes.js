import { Router } from 'express';
import { authorize, protect } from '../middlewares/auth.js';
import { approveRegistration, cancelRegistration, downloadTicket, eventRegistrations, myRegistrations, registerForEvent, rejectRegistration } from '../controllers/registration.controller.js';

const r = Router();

r.post('/', protect, authorize('participant','organizer','admin'), registerForEvent);
r.get('/me', protect, myRegistrations);
r.get('/event/:eventId', protect, authorize('organizer','admin'), eventRegistrations);
r.patch('/:id/approve', protect, authorize('admin','organizer'), approveRegistration);
r.patch('/:id/reject', protect, authorize('admin','organizer'), rejectRegistration);
r.get('/:id/ticket', protect, authorize('participant'), downloadTicket);
r.post('/:id/cancel', protect, cancelRegistration);

export default r;
