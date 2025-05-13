// utils/addNotification.js

import User from '../models/User.js';


export const addNotification = async ({
	userId,
	notification,
}) => {

	const user = await User.findById(userId);
	if (!user) throw new Error('User not found');

	user.notifications.unshift(notification); // Add to top
	if (user.notifications.length > 50) {
		user.notifications = user.notifications.slice(0, 50); // Keep max 50
	}
	await user.save();
};

