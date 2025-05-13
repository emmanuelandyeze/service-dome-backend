import User from "../models/User.js";

export const updatePushToken = async (req, res) => {
	try {
		const { token } = req.body;
		const userId = req.user.userId;

		await User.findByIdAndUpdate(userId, {
			expoPushToken: token,
		});

		res.json({ success: true });
	} catch (err) {
		console.error('Error saving push token:', err);
		res.status(500).json({ error: 'Failed to save token' });
	}
};

export const getNotifications = async (req, res) => {
	const userId  = req.user.userId; // Assume set from auth middleware

	const user = await User
		.findById(userId)
		.select('notifications');

	res.json(user.notifications);
};

export const updateNotification = async (req, res) => {
	const { userId} = req.user;
    const { index } = req.params;
    
	const user = await User.findById(userId);

	if (user && user.notifications[index]) {
		user.notifications[index].read = true;
		await user.save();
		res.json({ success: true });
	} else {
		res
			.status(404)
			.json({ message: 'Notification not found' });
	}
};