import { Router } from 'express';
import { authorize, protect } from '../middlewares/auth.js';
import { listUsers, removeUser, setRole, createOrganizer, listOrganizers, updateOrganizer, deleteOrganizer, toggleUserBlock, upgradeToOrganizer } from '../controllers/admin.controller.js';

const r = Router();

r.use(protect, authorize('admin'));
r.get('/users', listUsers);
r.patch('/users/:id/role', setRole);
r.patch('/users/:id/block', toggleUserBlock);
r.patch('/users/:id/upgrade', upgradeToOrganizer);
r.delete('/users/:id', removeUser);

// Organizer management routes
r.post('/organizers', createOrganizer);
r.get('/organizers', listOrganizers);
r.patch('/organizers/:id', updateOrganizer);
r.delete('/organizers/:id', deleteOrganizer);

export default r;
