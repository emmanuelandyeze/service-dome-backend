import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import generateToken from '../utils/generateToken.js';


// @desc Get user profile
// @route GET /api/users/profile
export const getUserProfile = asyncHandler(
	async (req, res) => {
		const user = await User.findById(req.user._id);

		if (user) {
			res.json({
				_id: user._id,
				name: user.name,
				email: user.email,
				pages: user.pages,
			});
		} else {
			res.status(404);
			throw new Error('User not found');
		}
	},
);

// @desc Update user profile
// @route PUT /api/users/profile
export const updateUserProfile = asyncHandler(async (req, res) => {
	const user = await User.findById(req.user._id);

	if (user) {
		user.name = req.body.name || user.name;
		user.email = req.body.email || user.email;

		if (req.body.password) {
			user.password = req.body.password;
		}

		const updatedUser = await user.save();

		res.json({
			_id: updatedUser._id,
			name: updatedUser.name,
			email: updatedUser.email,
			token: generateToken(updatedUser._id),
		});
	} else {
		res.status(404);
		throw new Error('User not found');
	}
}); 

// @desc Delete user
// @route DELETE /api/users/profile
export const deleteUser = asyncHandler(async (req, res) => {
	const user = await User.findById(req.user._id);

	if (user) {
		await user.remove();
		res.json({ message: 'User removed' });
	} else {
		res.status(404);
		throw new Error('User not found');
	}
});

// @desc Get all users (Admin only)
// @route GET /api/users
export const getAllUsers = asyncHandler(
	async (req, res) => {
		const users = await User.find({});
		res.json(users);
	},
);
