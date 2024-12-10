import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User.js';
import {
  sendRegistrationEmail,
  sendPasswordResetEmail,
  sendContactEmail,
} from '../services/email/emailService.js';

// Register User Handler
export const registerUser = async (req, res, next) => {
  const { username, email, password, phone, address, role } = req.body;
  try {
    // Check for duplicate email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role && ['user', 'admin'].includes(role) ? role : 'user';

    // Create the new user with resetToken and resetTokenExpiry set to null
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      phone,
      address,
      role: assignedRole,
      resetToken: null,          // Ensure resetToken is null initially
      resetTokenExpiry: null     // Ensure resetTokenExpiry is null initially
    });

    // Create a JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create a refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    user.refreshToken = refreshToken; // Store the refresh token in the database
    await user.save();

    // Send registration email
    await sendRegistrationEmail(email, username, password);

    // Respond with success message and tokens
    res.status(201).json({
      message: 'User registered successfully.',
      user,
      token,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// Login User Handler
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    // Create a JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create a refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    user.refreshToken = refreshToken; // Store the refresh token in the database
    await user.save();

    // Respond with token and user data
    res.json({ message: 'Login successful.', token, refreshToken, user });
  } catch (error) {
    next(error);
  }
};

// Refresh Auth Token Handler
export const refreshAuthToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    // Hash the provided refresh token
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find the user with the hashed refresh token
    const user = await User.findOne({ where: { refreshToken: hashedToken } });

    if (!user) {
      console.error('Invalid refresh token:', refreshToken);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if the refresh token has expired
    if (user.refreshTokenExpiry < Date.now()) {
      console.error('Expired refresh token for user:', user.id);
      return res.status(401).json({ error: 'Refresh token has expired' });
    }

    // Generate a new access token
    const newAccessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Issue a new refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newHashedRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    
    // Save the new refresh token and expiry
    user.refreshToken = newHashedRefreshToken;
    user.refreshTokenExpiry = Date.now() + 86400000; // 24 hours
    await user.save();

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Error in refreshAuthToken:', error);
    next(error);
  }
};

// Get User Profile Handler
export const getUserProfile = async (req, res, next) => {
  const userId = req.user.id; // This will work because req.user is set by the JWT middleware

  try {
    // Find the user by their ID
    const user = await User.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Return the user's profile
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Contact Us Handler
export const contactUs = async (req, res, next) => {
  const { name, email, message } = req.body;
  try {
    // Validate the required fields
    if (!name || !email || !message) throw new Error('All fields are required.');

    // Send contact email
    await sendContactEmail(name, email, message);
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    next(error);
  }
};

// Forgot Password Handler
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(200).json({
        emailExists: false,
        message: 'If the email exists, a reset link has been sent.',
      });
    }

    // Create reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset_password/${resetToken}`;
    await sendPasswordResetEmail(user.email, resetLink);

    // Send response
    res.status(200).json({
      emailExists: true,
      message: 'If the email exists, a reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password Handler
export const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;
  try {
    // Hash the token to match with the stored one
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the user with the valid reset token and ensure it hasn't expired
    const user = await User.findOne({
      where: { resetToken: hashedToken, resetTokenExpiry: { [Op.gt]: Date.now() } },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    // Hash the new password and save it
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null; // Remove the reset token after use
    user.resetTokenExpiry = null; // Remove the expiry after use
    await user.save();

    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

// Update User Profile Handler
export const updateUserProfile = async (req, res) => {
  try {
    const { username, email, phone, address } = req.body;

    // Ensure `req.user.id` is set by the middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: No user ID provided' });
    }

    const userId = req.user.id;

    // Find the user by ID
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the username already exists and is not the same user
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Update user fields
    user.username = username || user.username;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;

    // Save the updated user
    await user.save();

    res.json({ user });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get User by ID Handler
export const getUserById = async (req, res) => {
  const { userId } = req.params; // Get the userId from the URL params

  try {
    // Use findByPk for Sequelize as 'id' is typically the primary key
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'phone', 'address'], // Return only selected attributes
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user }); // Return the user object to the frontend
  } catch (err) {
    console.error('Error fetching user:', err); // Log error for debugging
    res.status(500).json({ message: 'Server error', error: err });
  }
};

