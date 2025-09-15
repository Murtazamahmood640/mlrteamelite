import { Router } from 'express';
import { icsForEvent, shareMessage } from '../controllers/utils.controller.js';

const r = Router();

r.get('/calendar/:eventId.ics', icsForEvent);
r.get('/share/:eventId', shareMessage);

export default r;
