import { signInUser, signUpUser } from '../services/authService.js';
import { getSupabasePublicConfig } from '../config/supabase.js';

export function authConfig(req, res) {
  return res.status(200).json({
    success: true,
    data: getSupabasePublicConfig(),
  });
}

export async function signUp(req, res) {
  try {
    const { firstName, lastName, email, password } = req.body;
    const gender =
      typeof req.body.gender === 'string'
        ? req.body.gender.trim().toLowerCase()
        : '';

    if (
      typeof firstName !== 'string' ||
      !firstName.trim() ||
      typeof lastName !== 'string' ||
      !lastName.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      !['female', 'male'].includes(gender) ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter your name, gender, a valid email, and a password of at least 8 characters',
      });
    }

    const data = await signUpUser({
      firstName,
      lastName,
      gender,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      message: data.requiresEmailConfirmation
        ? 'Account created. Check your email to confirm your account.'
        : 'Account created successfully',
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to create account',
    });
  }
}

export async function signIn(req, res) {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const data = await signInUser(email, password);

    return res.status(200).json({
      success: true,
      message: 'Sign in successful',
      data,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Unable to sign in';

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
