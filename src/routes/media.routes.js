import { Router } from 'express';
import { authorize, protect } from '../middlewares/auth.js';
import { eventMedia, gallery, uploadMedia, getUserGallery, updateMedia, deleteMedia, likeMedia } from '../controllers/media.controller.js';

const r = Router();

r.get('/gallery', gallery);
r.get('/gallery/user/:userId', getUserGallery);
r.get('/event/:eventId', eventMedia);
r.post('/', protect, authorize('organizer','admin'), uploadMedia);
r.put('/:id', protect, updateMedia);
r.delete('/:id', protect, deleteMedia);
r.post('/:id/like', protect, likeMedia);

export default r;
