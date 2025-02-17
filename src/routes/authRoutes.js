import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Customer from '../models/Customer.js';
import Vendor from '../models/Vendor.js';

const router = express.Router();

// Register Customer
router.post('/register/customer', async (req, res) => {
	try {
		const { name, email, password, phone } = req.body;
		const hashedPassword = await bcrypt.hash(password, 10);
		const customer = new Customer({
			name,
			email,
			password: hashedPassword,
			phone,
		});
		await customer.save();
		res.status(201).json({
			message: 'Customer registered successfully',
		});
	} catch (error) {
		res.status(500).json({ error: 'Registration failed' });
	}
});

// Register Vendor
router.post('/register/vendor', async (req, res) => {
	try {
		const {
			businessName,
			ownerName,
			email,
			password,
			phone,
			address,
		} = req.body;
		const hashedPassword = await bcrypt.hash(password, 10);
		const vendor = new Vendor({
			businessName,
			ownerName,
			email,
			password: hashedPassword,
			phone,
			address,
		});
		await vendor.save();
		res
			.status(201)
			.json({ message: 'Vendor registered successfully' });
	} catch (error) {
		res.status(500).json({ error: 'Registration failed' });
	}
});

// Login
router.post('/login', async (req, res) => {
	try {
		const { email, password, role } = req.body;
		const User = role === 'vendor' ? Vendor : Customer;
		const user = await User.findOne({ email });

		if (
			!user ||
			!(await bcrypt.compare(password, user.password))
		) {
			return res
				.status(401)
				.json({ error: 'Invalid credentials' });
		}

		const token = jwt.sign(
			{ id: user._id, role },
			process.env.JWT_SECRET,
			{ expiresIn: '7d' },
		);
		res.json({ token, role });
	} catch (error) {
		res.status(500).json({ error: 'Login failed' });
	}
});

export default router;
