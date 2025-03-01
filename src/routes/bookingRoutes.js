import express from 'express';
import Booking from '../models/Booking.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a booking
router.post('/', authMiddleware, async (req, res) => {
	try {
		if (req.user.role !== 'customer') {
			return res.status(403).json({
				error: 'Only customers can create bookings.',
			});
		}

		const {
			pageId,
			items,
			totalPrice,
			deliveryAddress,
			scheduledDate,
			scheduledTime,
		} = req.body;

		console.log(
			pageId,
			items,
			totalPrice,
			deliveryAddress,
			scheduledDate,
			scheduledTime,
		);
		// Validate required fields
		if (
			!pageId ||
			!items ||
			!totalPrice ||
			!deliveryAddress ||
			!scheduledDate ||
			!scheduledTime
		) {
			return res
				.status(400)
				.json({ error: 'Missing required fields.' });
		}

		// Create the booking
		const booking = new Booking({
			customer: req.user.id, // Customer ID from authenticated user
			pageId, // Vendor ID
			items, // Array of items (services) with quantities and prices
			totalPrice, // Total price of the booking
			deliveryAddress, // Delivery address
			scheduledDate: new Date(scheduledDate), // Scheduled date
			scheduledTime: new Date(scheduledTime), // Scheduled time
			status: 'Pending', // Default status
			paymentStatus: 'Paid', // Default payment status
		});

		// Save the booking to the database
		await booking.save();

		// Return the created booking
		res.status(201).json({
			success: true,
			message: 'Booking created successfully',
			booking,
		});
	} catch (error) {
		console.error('Error creating booking:', error);
		res
			.status(500)
			.json({ error: 'Failed to create booking.' });
	}
});

// Update booking status (e.g., Confirmed, Cancelled, Completed)
router.put(
	'/:id/status',
	authMiddleware,
	async (req, res) => {
		try {
			const { id } = req.params;
			const { status } = req.body;

			// Validate status
			if (
				!['Confirmed', 'Cancelled', 'Completed'].includes(
					status,
				)
			) {
				return res
					.status(400)
					.json({ error: 'Invalid status.' });
			}

			// Find the booking
			const booking = await Booking.findById(id);
			if (!booking) {
				return res
					.status(404)
					.json({ error: 'Booking not found.' });
			}

			// Check if the user is the vendor associated with the booking
			if (booking.pageId.toString() !== req.user.id) {
				return res.status(403).json({
					error:
						'Unauthorized. Only the vendor can update the status.',
				});
			}

			// Update the status
			booking.status = status;
			await booking.save();

			// Return the updated booking
			res.json(booking);
		} catch (error) {
			console.error(
				'Error updating booking status:',
				error,
			);
			res.status(500).json({
				error: 'Failed to update booking status.',
			});
		}
	},
);

// Get all bookings for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
	try {
		let query = {};

		// Customers can only see their own bookings
		if (req.user.role === 'customer') {
			query.customer = req.user.id;
		}
		// Vendors can only see bookings for their page
		else if (req.user.role === 'vendor') {
			query.pageId = req.user.id;
		}
		// Admins or other roles are not allowed
		else {
			return res
				.status(403)
				.json({ error: 'Unauthorized.' });
		}

		// Fetch bookings
		const bookings = await Booking.find(query)
			.populate('customer', 'name email') // Populate customer details
			.populate('pageId', 'name'); // Populate vendor details

		// Return the bookings
		res.json(bookings);
	} catch (error) {
		console.error('Error fetching bookings:', error);
		res
			.status(500)
			.json({ error: 'Failed to fetch bookings.' });
	}
});

export default router;
