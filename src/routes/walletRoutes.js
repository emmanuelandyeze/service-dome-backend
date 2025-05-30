import express from 'express';
import Stripe from 'stripe';
import User from '../models/User.js';
import Withdrawal from '../models/Withdrawal.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Stripe account and onboarding link
router.post('/connect', async (req, res) => {
	try {
		const { userId } = req.body;
		const user = await User.findById(userId);
		if (!user || !user.roles.includes('Vendor')) {
			return res
				.status(404)
				.json({ error: 'Vendor not found' });
		}

		// Already connected?
		if (user.vendorProfile.stripeAccountId) {
			return res.status(200).json({
				message: 'Already connected',
				accountId: user.vendorProfile.stripeAccountId,
			});
		}

		// 1. Create Express Account
		const account = await stripe.accounts.create({
			type: 'express',
			country: 'NG',
			email: user.email,
			capabilities: {
				transfers: { requested: true },
			},
		});

		// 2. Save to vendor profile
		user.vendorProfile.stripeAccountId = account.id;
		await user.save();

		// 3. Create onboarding link
		const accountLink = await stripe.accountLinks.create({
			account: account.id,
			refresh_url: 'https://yourapp.com/reauth', // fallback if onboarding is cancelled
			return_url: 'https://yourapp.com/wallet', // redirect after success
			type: 'account_onboarding',
		});

		res.status(200).json({ url: accountLink.url });
	} catch (error) {
		console.error('Stripe Connect error:', error.message);
		res.status(500).json({ error: 'Something went wrong' });
	}
});

// Withdraw to connected account
router.post('/withdraw', async (req, res) => {
	try {
		const { userId, amount } = req.body;

		const user = await User.findById(userId);
		const stripeAccountId =
			user.vendorProfile?.stripeAccountId;

		if (!stripeAccountId) {
			return res
				.status(400)
				.json({
					error: 'Vendor is not connected to Stripe',
				});
		}

		// Convert Naira (₦) to kobo
		const amountInKobo = amount * 100;

		// Optional: Check your DB to ensure vendor has at least this amount available

		const transfer = await stripe.transfers.create({
			amount: amountInKobo,
			currency: 'ngn',
			destination: stripeAccountId,
			description: `Withdrawal for ${user.businessName}`,
		});

		await Withdrawal.create({
			user: userId,
			amount,
			stripeTransferId: transfer.id,
			status: transfer.status,
		});

		res.status(200).json({ success: true, transfer });
	} catch (error) {
		console.error('Withdraw Error:', error.message);
		res.status(500).json({ error: error.message });
	}
});

router.get('/balance/:userId', async (req, res) => {
	try {
		const { userId } = req.params;
		const user = await User.findById(userId);
		const stripeAccountId =
			user.vendorProfile?.stripeAccountId;

		if (!stripeAccountId) {
			return res
				.status(400)
				.json({ error: 'Vendor not connected to Stripe' });
		}

		const balance = await stripe.balance.retrieve({
			stripeAccount: stripeAccountId,
		});

		const available =
			balance.available.find((b) => b.currency === 'ngn')
				?.amount || 0;
		const pending =
			balance.pending.find((b) => b.currency === 'ngn')
				?.amount || 0;

		res.json({
			available: available / 100,
			pending: pending / 100,
		});
	} catch (error) {
		console.error('Balance Fetch Error:', error.message);
		res
			.status(500)
			.json({ error: 'Failed to retrieve balance' });
	}
});

router.get('/withdrawals/:userId', async (req, res) => {
	try {
		const withdrawals = await Withdrawal.find({
			user: req.params.userId,
		}).sort({ createdAt: -1 });
		res.json(withdrawals);
	} catch (err) {
		res
			.status(500)
			.json({ error: 'Failed to fetch withdrawals' });
	}
});

export default router;
