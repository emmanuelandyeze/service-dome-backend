import express from 'express';
import stripe from '../config/stripe.js';
import Booking from '../models/Booking.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a Payment Intent
router.post('/pay', authMiddleware, async (req, res) => {
	try {
		if (req.user.role !== 'customer') {
			return res
				.status(403)
				.json({
					error: 'Only customers can make payments',
				});
		}

		const { bookingId } = req.body;

		const booking = await Booking.findById(
			bookingId,
		).populate('service');
		if (!booking) {
			return res
				.status(404)
				.json({ error: 'Booking not found' });
		}

		// Create a payment intent
		const paymentIntent =
			await stripe.paymentIntents.create({
				amount: booking.price * 100, // Convert to cents
				currency: 'usd',
				payment_method_types: ['card'],
				metadata: { bookingId: booking._id.toString() },
			});

		res.json({ clientSecret: paymentIntent.client_secret });
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to create payment' });
	}
});

router.post('/refund', authMiddleware, async (req, res) => {
	try {
		if (req.user.role !== 'customer') {
			return res
				.status(403)
				.json({
					error: 'Only customers can request refunds',
				});
		}

		const { bookingId } = req.body;
		const booking = await Booking.findById(bookingId);

		if (!booking || booking.paymentStatus !== 'Paid') {
			return res
				.status(400)
				.json({ error: 'Invalid refund request' });
		}

		const refund = await stripe.refunds.create({
			payment_intent: booking.paymentIntentId,
		});

		booking.paymentStatus = 'Refunded';
		await booking.save();

		res.json({ message: 'Refund processed', refund });
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to process refund' });
	}
});

export default router;
