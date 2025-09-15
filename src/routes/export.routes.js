import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import {
  exportUsersToPDF,
  exportUsersToExcel,
  exportEventsToPDF,
  exportEventsToExcel
} from '../controllers/export.controller.js';

const r = Router();

// All routes require authentication
r.use(protect);

// User export routes (Admin only for all users, Organizer for participants)
r.get('/users/pdf', authorize('organizer', 'admin'), exportUsersToPDF);
r.get('/users/excel', authorize('organizer', 'admin'), exportUsersToExcel);

// Event export routes (Admin for all events, Organizer for their events)
r.get('/events/pdf', authorize('organizer', 'admin'), exportEventsToPDF);
r.get('/events/excel', authorize('organizer', 'admin'), exportEventsToExcel);

export default r;