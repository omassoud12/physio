import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import * as admin from '../controllers/adminController.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));
router.get('/dashboard', admin.dashboard);
router.route('/physiotherapists').get(admin.listPhysiotherapists).post(admin.createPhysiotherapist);
router.route('/physiotherapists/:id').patch(admin.updatePhysiotherapist).delete(admin.disablePhysiotherapist);
router.get('/patients', admin.listPatients);
router.route('/patients/:id').get(admin.getPatient).patch(admin.updatePatient).delete(admin.disablePatient);
router.route('/patient-assignments').get(admin.listAssignments).post(admin.createAssignment);
router.route('/patient-assignments/:id').patch(admin.changeAssignment).delete(admin.endAssignment);
export default router;
