import User from '../models/userModel.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username, email and password' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: password, // In production, hash password using bcrypt
      isOnline: true
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & return profile
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    user.isOnline = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me/:id
// @access  Public
export const getMe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
