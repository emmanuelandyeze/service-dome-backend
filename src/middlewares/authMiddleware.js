import jwt from 'jsonwebtoken';
import Vendor from '../models/Vendor.js';

const authMiddleware = (req, res, next) => {
	const token = req.header('Authorization')?.split(' ')[1];
	if (!token)
		return res
			.status(401)
			.json({ error: 'No token, authorization denied' });

	try {
		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET,
		);
		req.user = decoded;
		next();
	} catch (error) {
		res.status(401).json({ error: 'Invalid token' });
	}
};

const protectVendor = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		if (!token)
			return res
				.status(401)
				.json({ error: 'Not authorized' });

		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET,
		);
		console.log(decoded);
		req.vendor = await Vendor.findById(decoded.id).select(
			'-password',
		);

		if (!req.vendor)
			return res
				.status(401)
				.json({ error: 'Vendor not found' });

		next();
	} catch (error) {
		res.status(401).json({ error: 'Unauthorized' });
	}
};

export { authMiddleware, protectVendor };