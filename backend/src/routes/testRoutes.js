import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { error } = await supabase
      .from('_connection_test')
      .select('*')
      .limit(1);

    // A missing test table still proves Supabase received the request.
    if (error && !['PGRST205', '42P01'].includes(error.code)) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      database: {
        connected: true,
        provider: 'Supabase',
      },
      message: 'Database connected',
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      database: {
        connected: false,
        provider: 'Supabase',
      },
      message: 'Database unavailable',
      error: error.message,
    });
  }
});

export default router;
