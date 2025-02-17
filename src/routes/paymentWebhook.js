import express from 'express';
import stripe from '../config/stripe.js';
import Booking from '../models/Booking.js';
import Vendor from '../models/Vendor.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Stripe Webhook
router.post(
	'/webhook',
	express.raw({ type: 'application/json' }),
	async (req, res) => {
		const sig = req.headers['stripe-signature'];

		try {
			const event = stripe.webhooks.constructEvent(
				req.body,
				sig,
				process.env.STRIPE_WEBHOOK_SECRET,
			);

			// Handle Booking Payment
			if (event.type === 'payment_intent.succeeded') {
				const paymentIntent = event.data.object;
				const bookingId = paymentIntent.metadata.bookingId;

				await Booking.findByIdAndUpdate(bookingId, {
					paymentStatus: 'Paid',
					status: 'Confirmed',
				});

				console.log(`Booking ${bookingId} marked as paid.`);
			}

			// Handle Vendor Subscription Payment
			else if (event.type === 'invoice.payment_succeeded') {
				const invoice = event.data.object;
				const customerId = invoice.customer;

				// Find vendor by Stripe customer ID
				const vendor = await Vendor.findOne({
					stripeCustomerId: customerId,
				});

				if (vendor) {
					vendor.membershipTier = 'Premium';
					vendor.subscriptionStatus = 'Active';
					await vendor.save();
					console.log(
						`Vendor ${vendor._id} subscription activated.`,
					);
				}
			}

			res.json({ received: true });
		} catch (error) {
			console.error('Webhook Error:', error.message);
			res
				.status(400)
				.json({ error: 'Webhook handler failed' });
		}
	},
);

export default router;
