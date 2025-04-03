import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
	try {
		const token = req
			.header('Authorization')
			?.split(' ')[1];

		if (!token) {
			return res
				.status(401)
				.json({ error: 'No token, authorization denied' });
		}

		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET,
		);
		req.user = await User.findById(decoded.id).select(
			'-password',
		);

		if (!req.user) {
			return res
				.status(401)
				.json({ error: 'User not found' });
		}

		next();
	} catch (error) {
		console.error('Auth error:', error);
		res.status(401).json({ error: 'Invalid token' });
	}
};

const protectVendor = async (req, res, next) => {
	try {
		if (!req.user || !req.user.roles.includes('Vendor')) {
			return res
				.status(403)
				.json({ error: 'Access denied. Vendor only.' });
		}
		req.vendor = req.user; // Assign the user as a vendor
		next();
	} catch (error) {
		console.error('Vendor auth error:', error);
		res.status(401).json({ error: 'Unauthorized' });
	}
};

const protectCustomer = async (req, res, next) => {
	try {
		if (!req.user || !req.user.roles.includes('Customer')) {
			return res
				.status(403)
				.json({ error: 'Access denied. Customer only.' });
		}
		req.customer = req.user; // Assign the user as a customer
		next();
	} catch (error) {
		console.error('Customer auth error:', error);
		res.status(401).json({ error: 'Unauthorized' });
	}
};

const authorizeRoles = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			res.status(403);
			throw new Error('Not authorized for this action');
		}
		next();
	};
};

export {
	authMiddleware,
	protectVendor,
	protectCustomer,
	authorizeRoles,
};
