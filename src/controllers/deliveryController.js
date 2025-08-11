import User from '../models/User.js';
import Page from '../models/Page.js';

// Set or Update Delivery Settings
export const setDeliverySettings = async (req, res) => {
	const { pageId } = req.params;
	const {
		enabled,
		fixedFee,
		distanceBased,
		rates,
		availableZones,
		estimatedTime,
		selfPickup,
	} = req.body;

	try {
		// Ensure vendor exists
		const vendor = await User.findById(req.user.userId);
		if (!vendor || !vendor.isVendor) {
			return res.status(404).json({
				error: 'Vendor not found or unauthorized',
			});
		}

		// Find the page and ensure it belongs to this vendor
		const page = await Page.findById(pageId);
		if (!page) {
			return res
				.status(404)
				.json({ message: 'Page not found' });
		}

		if (String(page.vendor) !== String(vendor._id)) {
			return res.status(403).json({
				message: 'Not authorized to edit this page',
			});
		}

		// Update delivery settings
		page.deliverySettings = {
			enabled,
			fixedFee,
			distanceBased,
			rates,
			availableZones,
			estimatedTime,
			selfPickup,
		};

		// Save changes
		await page.save();

		res.status(200).json({
			message: 'Delivery settings updated successfully',
			deliverySettings: page.deliverySettings,
		});
	} catch (error) {
		console.error(
			'Error updating delivery settings:',
			error,
		);
		res.status(500).json({
			message: 'Error updating delivery settings',
			error: error.message,
		});
	}
};

// Get Delivery Settings
export const getDeliverySettings = async (req, res) => {
	const { vendorId, pageId } = req.params;

	try {
		const vendor = await User.findById(vendorId); // Ensure auth middleware sets req.user

		if (!vendor || !vendor.isVendor) {
			return res.status(404).json({
				error: 'Vendor not found or unauthorized',
			});
		}

		// Find the page
		const page = await Page.findById(pageId);

		if (!page)
			return res
				.status(404)
				.json({ message: 'Page not found' });

		console.log(page);

		console.log('settings: ', page.deliverySettings);

		res.status(200).json(page.deliverySettings);
	} catch (error) {
		res.status(500).json({
			message: 'Error fetching delivery settings',
			error: error.message,
		});
	}
};

export const getVendorDeliverySettings = async (
	req,
	res,
) => {
	const { pageId } = req.params;
	const vendorId = req.user.userId;

	try {
		const vendor = await User.findById(vendorId); // Ensure auth middleware sets req.user

		if (!vendor || !vendor.isVendor) {
			return res.status(404).json({
				error: 'Vendor not found or unauthorized',
			});
		}

		// Find the page
		const page = await Page.findById(pageId);

		if (!page)
			return res
				.status(404)
				.json({ message: 'Page not found' });

		console.log(page.deliverySettings);
		res.status(200).json(page.deliverySettings);
	} catch (error) {
		res.status(500).json({
			message: 'Error fetching delivery settings',
			error: error.message,
		});
	}
};
