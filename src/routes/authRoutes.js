import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register User (Customer or Vendor)
router.post('/register', async (req, res) => {
	try {
		const { name, email, password, phone, isVendor } =
			req.body;

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res
				.status(400)
				.json({ error: 'Email already in use' });
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Set roles dynamically
		const roles = ['Customer'];
		if (isVendor) roles.push('Vendor');

		// Create new user
		const user = new User({
			name,
			email,
			password: hashedPassword,
			phone,
			roles,
		});
		await user.save();

		// Generate JWT token
		const token = jwt.sign(
			{ id: user._id, roles },
			process.env.JWT_SECRET,
			{ expiresIn: '7d' },
		);

		res.status(201).json({
			token,
			user,
			message: 'Registration successful',
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Registration failed' });
	}
});

// Login User
router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		// Find user by email
		const user = await User.findOne({ email });
		if (
			!user ||
			!(await bcrypt.compare(password, user.password))
		) {
			return res
				.status(401)
				.json({ error: 'Invalid credentials' });
		}

		// Generate JWT token
		const token = jwt.sign(
			{ id: user._id, roles: user.roles },
			process.env.JWT_SECRET,
			{ expiresIn: '7d' },
		);

		res.json({
			token,
			user,
			message: 'Login successful',
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Login failed' });
	}
});

export default router;
