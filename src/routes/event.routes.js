import { Router } from 'express';
import { authorize, protect, optionalProtect } from '../middlewares/auth.js';
import { approveEvent, cancelEvent, createEvent, deleteEvent, getEvent, getMetrics, listEvents, rejectEvent, updateEvent } from '../controllers/event.controller.js';
import { getAvailableSeats } from '../controllers/registration.controller.js';

const r = Router();

r.get('/', optionalProtect, listEvents);
r.get('/:id', getEvent);
r.get('/:id/metrics', protect, authorize('organizer','admin'), getMetrics);
r.get('/:id/seats', protect, getAvailableSeats);

r.post('/', protect, authorize('organizer','admin'), createEvent);

r.patch('/:id', protect, authorize('organizer','admin'), updateEvent);

r.patch('/:id/approve', protect, authorize('admin'), approveEvent);

r.patch('/:id/reject', protect, authorize('admin'), rejectEvent);

r.post('/:id/cancel', protect, authorize('organizer','admin'), cancelEvent);

r.delete('/:id', protect, authorize('organizer','admin'), deleteEvent);

export default r;
