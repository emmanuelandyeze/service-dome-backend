import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Page from '../models/Page.js';

const JWT_SECRET =
	process.env.JWT_SECRET || 'defaultsecret';

// Signup Controller
export const signup = async (req, res) => {
	try {
		const { name, email, password, phone, roles } =
			req.body;

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res
				.status(400)
				.json({ message: 'Email already in use' });
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12);

		// Create user
		const newUser = new User({
			name,
			email,
			password: hashedPassword,
			phone,
			roles,
			isVendor: roles.includes('Vendor'),
		});

		if (roles.includes('Vendor')) {
			newUser.vendorProfile = {
				membershipTier: 'Free',
				subscriptionStatus: 'Expired',
			};
		} else if (roles.includes('Customer')) {
			newUser.customerProfile = {
				address: '',
				location: {
					latitude: null,
					longitude: null,
					address: '',
				},
			};
		}

		await newUser.save();

		// Generate token
		const token = jwt.sign(
			{ userId: newUser._id, roles: newUser.roles },
			JWT_SECRET,
			{ expiresIn: '7d' },
		);

		res
			.status(201)
			.json({ token, user: newUser, success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Signup failed' });
	}
};

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		// Find user by email
		const user = await User.findOne({ email });
		if (!user) {
			return res
				.status(404)
				.json({ message: 'User not found' });
		}

		// Check password
		const isMatch = await bcrypt.compare(
			password,
			user.password,
		);
		if (!isMatch) {
			return res
				.status(401)
				.json({ message: 'Invalid credentials' });
		}

		// If the user is a vendor, fetch pages from the Page model
		let pages = [];
		if (user.isVendor) {
			pages = await Page.find({ vendor: user._id });
		}

		// Generate token
		const token = jwt.sign(
			{ userId: user._id, roles: user.roles },
			JWT_SECRET,
			{ expiresIn: '7d' },
		);

		// Return user info along with pages (if vendor)
		res
			.status(200)
			.json({ token, user, pages, success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Login failed' });
	}
};
