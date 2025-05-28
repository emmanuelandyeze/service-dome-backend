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

function getNextDateOfDay(dayName) {
	const daysOfWeek = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	];
	const dayIndex = daysOfWeek.indexOf(dayName);
	if (dayIndex === -1) throw new Error('Invalid day name');

	const today = new Date();
	const todayIndex = today.getDay();

	let diff = dayIndex - todayIndex;
	if (diff < 0) diff += 7;

	const targetDate = new Date(today);
	targetDate.setDate(today.getDate() + diff);
	targetDate.setHours(0, 0, 0, 0);
	return targetDate;
}

function combineDateAndTime(date, timeStr) {
	// timeStr example: "08:00"
	const [hours, minutes] = timeStr.split(':').map(Number);
	const combined = new Date(date);
	combined.setHours(hours, minutes, 0, 0);
	return combined;
}

// Create a booking
router.post('/', verifyToken, async (req, res) => {
	try {
		const {
			pageId,
			items,
			totalPrice,
			deliveryAddress,
			timeSlot,
		} = req.body;

		if (
			!pageId ||
			!items ||
			!totalPrice ||
			!deliveryAddress ||
			!timeSlot
		) {
			return res
				.status(400)
				.json({ error: 'Missing required fields.' });
		}

		console.log(
			pageId,
			items,
			totalPrice,
			deliveryAddress,
			timeSlot,
		);

		const { day, from, to } = timeSlot;

		if (!day || !from || !to) {
			return res
				.status(400)
				.json({ error: 'Invalid timeSlot format.' });
		}

		// Convert day to actual Date
		const scheduledDate = getNextDateOfDay(day);

		// Combine date + time for start and end times
		const scheduledTimeStart = combineDateAndTime(
			scheduledDate,
			from,
		);
		const scheduledTimeEnd = combineDateAndTime(
			scheduledDate,
			to,
		);

		// Create the booking
		const booking = new Booking({
			customer: req.user.userId,
			pageId,
			items,
			totalPrice,
			deliveryAddress,
			scheduledDate, // Date only (day)
			scheduledTimeStart, // Date with start time
			scheduledTimeEnd, // Date with end time
			status: 'Pending',
			paymentStatus: 'Paid',
		});

		await booking.save();

		// Continue with notification and response as before...

		const page = await Page.findById(pageId);
		if (!page) {
			return res
				.status(404)
				.json({ error: 'Page not found for this pageId' });
		}

		const vendorId = page.vendor;
		const itemNames = items.map((item) => item.name);
		const message =
			itemNames.length === 1
				? `You’ve been requested for a ${itemNames[0]} service.`
				: `You’ve been requested for a ${itemNames[0]} and other services.`;

		await addNotification({
			userId: vendorId,
			notification: {
				type: 'job',
				title: 'New Job Request',
				message,
			},
		});

		const vendor = await User.findById(vendorId);
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

			await expo.sendPushNotificationsAsync([pushMessage]);
			console.log(pushMessage);
		} else {
			console.warn(
				'Invalid or missing Expo push token for vendor.',
			);
		}

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

		const pageDetails = await Page.findOne({
			_id: booking.pageId,
		});


		// Include full page details in the response
		const bookingWithPageDetails = {
			...booking.toObject(),
			page: pageDetails || null,
		};

		console.log(bookingWithPageDetails);

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
