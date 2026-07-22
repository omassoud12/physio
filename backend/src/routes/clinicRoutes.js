import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import * as clinic from '../controllers/clinicController.js';

export const physiotherapistDirectory = express.Router();
physiotherapistDirectory.use(requireAuth);
physiotherapistDirectory.get('/', clinic.publicPhysiotherapists);
physiotherapistDirectory.get('/:id/available-slots', clinic.availableSlots);
physiotherapistDirectory.get('/:id', clinic.publicPhysiotherapists);

export const appointmentRoutes = express.Router();
appointmentRoutes.use(requireAuth, requireRole('patient'));
appointmentRoutes.post('/', clinic.bookAppointment);
appointmentRoutes.get('/my', clinic.myAppointments);
appointmentRoutes.patch('/:id/cancel', clinic.cancelAppointment);
appointmentRoutes.patch('/:id/reschedule', clinic.rescheduleAppointment);

export const profileRoutes = express.Router();
profileRoutes.use(requireAuth);
profileRoutes.route('/me').get(clinic.ownProfile).patch(clinic.ownProfile);
