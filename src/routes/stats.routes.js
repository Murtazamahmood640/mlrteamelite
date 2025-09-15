import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import {
  getAdminStats,
  getOrganizerStats,
  getParticipantStats,
  getPublicStats
} from '../controllers/stats.controller.js';

const r = Router();

// Public stats - no authentication required
r.get('/public', getPublicStats);

// All routes below require authentication
r.use(protect);

// Admin stats - admin only
r.get('/admin', authorize('admin'), getAdminStats);

// Organizer stats - organizer only
r.get('/organizer', authorize('organizer'), getOrganizerStats);

// Participant stats - participant only
r.get('/participant', authorize('participant'), getParticipantStats);

export default r;