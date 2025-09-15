import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  addEventBookmark,
  removeEventBookmark,
  addMediaBookmark,
  removeMediaBookmark,
  getBookmarkedEvents,
  getBookmarkedMedia,
  checkEventBookmark,
  checkMediaBookmark,
  getBookmarkStats
} from '../controllers/bookmarks.controller.js';

const r = Router();

// All routes require authentication
r.use(protect);

// Event bookmark routes
r.post('/events/:eventId', addEventBookmark);
r.delete('/events/:eventId', removeEventBookmark);
r.get('/events/:eventId/check', checkEventBookmark);

// Media bookmark routes
r.post('/media/:mediaId', addMediaBookmark);
r.delete('/media/:mediaId', removeMediaBookmark);
r.get('/media/:mediaId/check', checkMediaBookmark);

// Get user's bookmarks
r.get('/events', getBookmarkedEvents);
r.get('/media', getBookmarkedMedia);

// Get bookmark statistics
r.get('/stats', getBookmarkStats);

export default r;