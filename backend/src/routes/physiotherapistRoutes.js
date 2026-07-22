import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import * as clinician from '../controllers/physiotherapistController.js';

const router = express.Router();
router.use(requireAuth, requireRole('physiotherapist'));
router.route('/me').get(clinician.me).patch(clinician.me);
router.route('/availability').get(clinician.availability).post(clinician.availability);
router.route('/availability/:id').patch(clinician.updateAvailability).delete(clinician.deleteAvailability);
router.route('/time-off').get(clinician.timeOff).post(clinician.timeOff);
router.delete('/time-off/:id', clinician.deleteTimeOff);
router.get('/appointments', clinician.appointments);
router.patch('/appointments/:id/status', clinician.updateAppointmentStatus);
router.get('/patients', clinician.patients);
router.get('/patients/:id', clinician.patients);
export default router;
