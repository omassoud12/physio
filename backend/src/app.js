import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import testRoutes from './routes/testRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import physiotherapistRoutes from './routes/physiotherapistRoutes.js';
import { appointmentRoutes, physiotherapistDirectory, profileRoutes } from './routes/clinicRoutes.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    message: 'Physiotherapy Clinic API',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/physiotherapists', physiotherapistDirectory);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/physiotherapist', physiotherapistRoutes);
app.use('/api/profile', profileRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

export default app;
