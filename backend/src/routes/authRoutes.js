import express from 'express';
import { authConfig, signIn, signUp } from '../controllers/authController.js';

const router = express.Router();

router.get('/config', authConfig);
router.post('/signin', signIn);
router.post('/signup', signUp);

export default router;
