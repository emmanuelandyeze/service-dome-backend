import express from 'express';
import Booking from '../models/Booking.js';
import Vendor from '../models/Vendor.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import User from '../models/User.js';
import { addNotification } from '../utils/addNotification.js';
import Page from '../models/Page.js';
import { Expo } from 'expo-server-sdk';

const router = express.Router();

// Initialize Expo SDK
const expo = new Expo();

// Create a booking
router.post('/', verifyToken, async (req, res) => {
	try {
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
			customer: req.user.userId, // Customer ID from authenticated user
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

		const page = await Page.findById(pageId);

		if (!page) {
			return res.status(404).json({
				error: 'Page not found for this pageId',
			});
		}

		const vendorId = page.vendor;

		// Extract the names of the items in the booking
		const itemNames = items.map((item) => item.name); // Assuming the item has a 'name' field

		// Construct the notification message
		let message = '';
		if (itemNames.length === 1) {
			message = `You’ve been requested for a ${itemNames[0]} service.`;
		} else {
			message = `You’ve been requested for a ${itemNames[0]} and other services.`;
		}

		// Add the notification
		await addNotification({
			userId: vendorId,
			notification: {
				type: 'job',
				title: 'New Job Request',
				message,
			},
		});

		const vendor = await User.findById(vendorId);

		// Send the Expo push notification
		if (
			vendor.expoPushToken &&
			Expo.isExpoPushToken(vendor.expoPushToken)
		) {
			const pushMessage = {
				to: vendor.expoPushToken,
				sound: 'default',
				title: 'New Service Request',
				body: message,
				data: { bookingId: booking._id },
			};

			// Send push notification asynchronously
			await expo.sendPushNotificationsAsync([pushMessage]);
			console.log(pushMessage);
		} else {
			console.warn(
				'Invalid or missing Expo push token for vendor.',
			);
		}

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

// // Update booking status (e.g., Confirmed, Cancelled, Completed)
router.put('/:id/status', verifyToken, async (req, res) => {
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

		// Update the status
		booking.status = status;
		await booking.save();

		const customer = await User.findById(booking.customer);

		// Send the Expo push notification
		if (
			customer.expoPushToken &&
			Expo.isExpoPushToken(customer.expoPushToken)
		) {
			const pushMessage = {
				to: customer.expoPushToken,
				sound: 'default',
				title: 'Update on service request',
				body: `Your service request has been ${status}.`,
				data: { bookingId: booking._id },
			};

			// Send push notification asynchronously
			await expo.sendPushNotificationsAsync([pushMessage]);
			console.log(pushMessage);
		} else {
			console.warn(
				'Invalid or missing Expo push token for vendor.',
			);
		}

		// Return the updated booking
		res.json(booking);
	} catch (error) {
		console.error('Error updating booking status:', error);
		res.status(500).json({
			error: 'Failed to update booking status.',
		});
	}
});

// // Get all bookings for the authenticated user
router.get('/', verifyToken, async (req, res) => {
	try {
		let query = {};

		if (req.query.customer) {
			if (req.query.customer !== req.user.userId) {
				return res
					.status(403)
					.json({ error: 'Unauthorized.' });
			}
			query.customer = req.query.customer;
		} else if (req.query.pageId) {
			// Ensure vendor owns this page
			const vendor = await User.findById(req.user.userId);
			if (!vendor) {
				return res
					.status(404)
					.json({ error: 'Vendor not found.' });
			}

			// const isPageOwner = vendor.vendorProfile.pages.some(
			// 	(page) => page._id.toString() === req.query.pageId,
			// );

			// if (!isPageOwner) {
			// 	return res
			// 		.status(403)
			// 		.json({ error: 'Unauthorized page access.' });
			// }

			query.pageId = req.query.pageId;
		} else {
			return res
				.status(400)
				.json({ error: 'Missing query parameters.' });
		}

		// Fetch bookings
		const bookings = await Booking.find(query)
			.populate('customer', 'name email')
			.populate('pageId', 'businessName');

		// Now find the vendor and page for each booking
		const bookingsWithPageDetails = await Promise.all(
			bookings.map(async (booking) => {
				const pageDetails = await Page.findById(
					booking.pageId,
				);

				return {
					...booking.toObject(),
					page: pageDetails || null,
				};
			}),
		);

		res.json(bookingsWithPageDetails);
	} catch (error) {
		console.error('Error fetching bookings:', error);
		res
			.status(500)
			.json({ error: 'Failed to fetch bookings.' });
	}
});

// // Get a single booking by ID
router.get('/:id', verifyToken, async (req, res) => {
	try {
		const { id } = req.params;

		// Find the booking
		const booking = await Booking.findById(id)
			.populate('customer', 'name email phone') // Populate customer details
			.populate('pageId', 'name'); // Populate page details

		if (!booking) {
			return res
				.status(404)
				.json({ error: 'Booking not found.' });
		}

		// Fetch the vendor to get full page details
		const vendor = await User.findOne({
			'vendorProfile.pages._id': booking.pageId,
		});

		const pageDetails = vendor?.vendorProfile?.pages?.find(
			(page) =>
				page._id.toString() === booking.pageId.toString(),
		);

		// Include full page details in the response
		const bookingWithPageDetails = {
			...booking.toObject(),
			page: pageDetails || null,
		};

		// Return the booking with page details
		res.json(bookingWithPageDetails);
	} catch (error) {
		console.error('Error fetching booking:', error);
		res
			.status(500)
			.json({ error: 'Failed to fetch booking.' });
	}
});

export default router;
