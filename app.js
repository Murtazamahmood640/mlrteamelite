import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import eventRoutes from './src/routes/event.routes.js';
import registrationRoutes from './src/routes/registration.routes.js';
import attendanceRoutes from './src/routes/attendance.routes.js';
import feedbackRoutes from './src/routes/feedback.routes.js';
import certificateRoutes from './src/routes/certificate.routes.js';
import mediaRoutes from './src/routes/media.routes.js';
import utilRoutes from './src/routes/utils.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import announcementRoutes from './src/routes/announcement.routes.js';
import exportRoutes from './src/routes/export.routes.js';
import twoFactorRoutes from './src/routes/twoFactor.routes.js';
import bookmarksRoutes from './src/routes/bookmarks.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';
import statsRoutes from './src/routes/stats.routes.js';
import contactRoutes from './src/routes/contact.routes.js';
import aboutRoutes from './src/routes/about.routes.js';
import { errorHandler, notFound } from './src/middlewares/error.js';
import dotenv from "dotenv"

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['websocket', 'polling']
});

dotenv.config();
console.log(process.env.MONGODB_URI);
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Make io available in routes
app.set('io', io);

app.get('/', (req, res) => res.json({ status: 'ok', name: 'EventSphere API' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/utils', utilRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/about', aboutRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventsphere';

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user-specific room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  // Leave user-specific room
  socket.on('leave', (userId) => {
    socket.leave(userId);
    console.log(`User ${userId} left room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Export io for use in other modules
export { io };

connectDB(URI).then(()=>{
  server.listen(PORT, () => console.log(`API running on :${PORT}`));
}).catch((e)=>{
  console.error('DB connection failed', e);
  process.exit(1);
});

export default app;
