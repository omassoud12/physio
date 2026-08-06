import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import * as medical from '../controllers/medicalRecordController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
const uploadOne = (req, res, next) => upload.single('file')(req, res, (error) => {
  if (!error) return next();
  return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
    success: false,
    message: error.code === 'LIMIT_FILE_SIZE'
      ? 'File too large (8 MB max.) / حجم الملف كبير جداً (الحد الأقصى 8 ميغابايت)'
      : 'Invalid upload / عملية الرفع غير صالحة',
    errors: [],
  });
});

router.use(requireAuth);
router.get('/me', requireRole('patient'), medical.myRecord);
router.put('/me', requireRole('patient'), medical.saveRecord);
router.post('/documents', requireRole('patient'), uploadOne, medical.uploadDocument);
router.delete('/documents/:id', requireRole('patient'), medical.removeDocument);
router.get('/documents/:id/url', medical.documentUrl);
router.get('/patient/:patientId', requireRole('physiotherapist', 'admin'), medical.patientRecord);

export default router;
