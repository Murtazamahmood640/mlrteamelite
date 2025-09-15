import { Router } from 'express';
import { authorize, protect } from '../middlewares/auth.js';
import { issueCertificate, myCertificates, requestCertificate, getAttendedEvents } from '../controllers/certificate.controller.js';

const r = Router();

r.post('/request', protect, requestCertificate);
r.get('/attended-events', protect, getAttendedEvents);
r.post('/', protect, authorize('organizer','admin'), issueCertificate);
r.get('/me', protect, myCertificates);

export default r;
