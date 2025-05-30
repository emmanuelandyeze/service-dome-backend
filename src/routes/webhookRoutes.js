import express from 'express';
import Stripe from 'stripe';
import User from '../models/User.js';
import Withdrawal from '../models/Withdrawal.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post(
	'/webhook',
	express.raw({ type: 'application/json' }),
	async (req, res) => {
		let event;

		try {
			event = stripe.webhooks.constructEvent(
				req.body,
				req.headers['stripe-signature'],
				endpointSecret,
			);
		} catch (err) {
			console.error(
				'Webhook signature error:',
				err.message,
			);
			return res
				.status(400)
				.send(`Webhook Error: ${err.message}`);
		}

		try {
			if (event.type === 'invoice.paid') {
				const subscription = event.data.object.subscription;
				const customerId = event.data.object.customer;

				const customer = await stripe.customers.retrieve(
					customerId,
				);
				const vendorId = customer.metadata.vendorId;

				await User.findByIdAndUpdate(vendorId, {
					membershipTier: 'Premium',
					subscriptionStatus: 'Active',
				});
			}

			if (event.type === 'customer.subscription.deleted') {
				const deletedSub = event.data.object;
				const deletedCustomer =
					await stripe.customers.retrieve(
						deletedSub.customer,
					);
				const vendorId = deletedCustomer.metadata.vendorId;

				await User.findByIdAndUpdate(vendorId, {
					membershipTier: 'Free',
					subscriptionStatus: 'Expired',
				});
			}

			res.json({ received: true });
		} catch (err) {
			console.error('Webhook handler failed:', err.message);
			res
				.status(500)
				.json({ error: 'Webhook processing failed' });
		}
	},
);

router.post(
	'/stripe',
	express.raw({ type: 'application/json' }),
	async (req, res) => {
		const sig = req.headers['stripe-signature'];

		let event;
		try {
			event = stripe.webhooks.constructEvent(
				req.body,
				sig,
				process.env.STRIPE_WEBHOOK_SECRET,
			);
		} catch (err) {
			return res
				.status(400)
				.send(`Webhook Error: ${err.message}`);
		}

		if (event.type === 'transfer.updated') {
			const transfer = event.data.object;

			await Withdrawal.findOneAndUpdate(
				{ stripeTransferId: transfer.id },
				{ status: transfer.status },
			);
		}

		res.send({ received: true });
	},
);

export default router;
