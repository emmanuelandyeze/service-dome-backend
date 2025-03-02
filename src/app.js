import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import Stripe from 'stripe';

dotenv.config();
connectDB();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/customers', customerRoutes);

app.get('/', (req, res) => {
	res.send('Service Dome API is running....');
});

app.post('/api/payment-sheet', async (req, res) => {
	const { amount, currency } = req.body;

	try {
		// Create a Stripe customer
		const customer = await stripe.customers.create();

		// Create an ephemeral key for the customer
		const ephemeralKey = await stripe.ephemeralKeys.create(
			{ customer: customer.id },
			{ apiVersion: '2023-08-16' },
		);

		// Create a PaymentIntent
		const paymentIntent =
			await stripe.paymentIntents.create({
				amount,
				currency,
				customer: customer.id,
				automatic_payment_methods: {
					enabled: true,
				},
			});

		// Return the necessary details to the client
		res.json({
			paymentIntent: paymentIntent.client_secret,
			ephemeralKey: ephemeralKey.secret,
			customer: customer.id,
		});
	} catch (error) {
		console.error('Error creating payment intent:', error);
		res
			.status(500)
			.json({ error: 'Failed to create payment intent' });
	}
});

export default app;
