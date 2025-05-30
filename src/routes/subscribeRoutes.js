import express from 'express';
import Stripe from 'stripe';
import User from '../models/User.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Replace with your actual Stripe Price ID
// const PRICE_ID = 'price_1RUOCDGCwlNIcz9VksUu8sDc';
const PRICE_ID = 'price_1RUOM7GCwlNIcz9VmQxErD4J';

router.post('/create-subscription', async (req, res) => {
	try {
		const { userId } = req.body;

		const vendor = await User.findById(userId);
		if (!vendor)
			return res
				.status(404)
				.json({ error: 'Vendor not found' });

		const customer = await stripe.customers.create({
			email: vendor.email,
			name: vendor.name,
			metadata: { vendorId: vendor._id.toString() },
		});

		const subscription = await stripe.subscriptions.create({
			customer: customer.id,
			items: [{ price: PRICE_ID }],
			payment_behavior: 'default_incomplete',
			payment_settings: {
				save_default_payment_method: 'on_subscription',
			},
			expand: ['latest_invoice.payment_intent'],
		});

		res.status(200).json({
			clientSecret:
				subscription.latest_invoice.payment_intent
					.client_secret,
			customerId: customer.id,
			subscriptionId: subscription.id,
		});
	} catch (error) {
		console.error(
			'Error creating subscription:',
			error.message,
		);
		res
			.status(500)
			.json({ error: 'Failed to create subscription' });
	}
});

router.post(
	'/update-subscription-status',
	async (req, res) => {
		try {
			const { userId, status, tier } = req.body;

			const vendor = await User.findById(userId);
			if (!vendor)
				return res
					.status(404)
					.json({ error: 'Vendor not found' });

			vendor.vendorProfile.membershipTier = tier;
			vendor.vendorProfile.subscriptionStatus = status;
			await vendor.save();

			res.status(200).json({
				message: 'Subscription status updated successfully',
				user: vendor, // Send back the updated user object
			});
		} catch (error) {
			console.error(
				'Error updating subscription:',
				error.message,
			);
			res
				.status(500)
				.json({ error: 'Failed to update subscription' });
		}
	},
);

export default router;
