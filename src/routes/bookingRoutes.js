import express from 'express';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a booking
router.post('/', authMiddleware, async (req, res) => {
	try {
		if (req.user.role !== 'customer') {
			return res
				.status(403)
				.json({
					error: 'Only customers can book services',
				});
		}

		const { service, date, price } = req.body;

		// Find the service to ensure it exists
		const serviceData = await Service.findById(
			service,
		).populate('vendor');
		if (!serviceData) {
			return res
				.status(404)
				.json({ error: 'Service not found' });
		}

		const booking = new Booking({
			customer: req.user.id,
			vendor: serviceData.vendor._id,
			service,
			date,
			price,
		});

		await booking.save();
		res.status(201).json(booking);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to create booking' });
	}
});

router.put(
	'/:id/status',
	authMiddleware,
	async (req, res) => {
		try {
			const booking = await Booking.findById(req.params.id);

			if (!booking) {
				return res
					.status(404)
					.json({ error: 'Booking not found' });
			}

			if (booking.vendor.toString() !== req.user.id) {
				return res
					.status(403)
					.json({ error: 'Unauthorized' });
			}

			const { status } = req.body;
			if (
				!['Confirmed', 'Cancelled', 'Completed'].includes(
					status,
				)
			) {
				return res
					.status(400)
					.json({ error: 'Invalid status update' });
			}

			booking.status = status;
			await booking.save();
			res.json(booking);
		} catch (error) {
			res
				.status(500)
				.json({ error: 'Failed to update booking status' });
		}
	},
);

router.get('/', authMiddleware, async (req, res) => {
	try {
		let query = {};
		if (req.user.role === 'customer') {
			query.customer = req.user.id;
		} else if (req.user.role === 'vendor') {
			query.vendor = req.user.id;
		} else {
			return res
				.status(403)
				.json({ error: 'Unauthorized' });
		}

		const bookings = await Booking.find(query).populate(
			'service',
		);
		res.json(bookings);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to fetch bookings' });
	}
});


export default router;
