import express from 'express';
import Service from '../models/Service.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a new service (Vendor only)
router.post('/', authMiddleware, async (req, res) => {
	try {
		// Only vendors can create services
		if (req.user.role !== 'vendor') {
			return res
				.status(403)
				.json({ error: 'Unauthorized' });
		}

		// Create and save service
		const service = new Service({
			...req.body,
			vendor: req.user.id,
		});
		await service.save();

		res.status(201).json(service);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to create service' });
	}
});

router.get('/', async (req, res) => {
	try {
		const query = req.query.category
			? { category: req.query.category }
			: {};
		const services = await Service.find(query).populate(
			'vendor',
			'businessName',
		);
		res.json(services);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to fetch services' });
	}
});


router.get('/vendor/:vendorId', async (req, res) => {
	try {
		const services = await Service.find({
			vendor: req.params.vendorId,
		});
		res.json(services);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to fetch vendor services' });
	}
});

router.put('/:id', authMiddleware, async (req, res) => {
	try {
		const service = await Service.findById(req.params.id);

		if (
			!service ||
			service.vendor.toString() !== req.user.id
		) {
			return res
				.status(403)
				.json({ error: 'Unauthorized' });
		}

		Object.assign(service, req.body);
		await service.save();

		res.json(service);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to update service' });
	}
});

router.delete('/:id', authMiddleware, async (req, res) => {
	try {
		const service = await Service.findById(req.params.id);

		if (
			!service ||
			service.vendor.toString() !== req.user.id
		) {
			return res
				.status(403)
				.json({ error: 'Unauthorized' });
		}

		await service.deleteOne();
		res.json({ message: 'Service deleted' });
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to delete service' });
	}
});


export default router;
