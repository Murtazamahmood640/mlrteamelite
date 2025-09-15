import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus,
  getActiveAnnouncements
} from '../controllers/announcement.controller.js';

const r = Router();

// All routes require authentication
r.use(protect);

// Get active announcements for current user (simplified endpoint)
r.get('/active', getActiveAnnouncements);

// Get all announcements with pagination and filtering
r.get('/', getAnnouncements);

// Get specific announcement by ID
r.get('/:id', getAnnouncement);

// Create new announcement (admin only)
r.post('/', authorize('admin'), createAnnouncement);

// Update announcement (admin only)
r.patch('/:id', authorize('admin'), updateAnnouncement);

// Toggle announcement active status (admin only)
r.patch('/:id/toggle-status', authorize('admin'), toggleAnnouncementStatus);

// Delete announcement (admin only)
r.delete('/:id', authorize('admin'), deleteAnnouncement);

export default r;