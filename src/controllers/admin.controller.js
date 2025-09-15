import User from '../models/user.models.js';
import { sendOrganizerCreationEmail } from '../services/emailService.js';

export const listUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      role,
      department,
      search
    } = req.query;

    // Build filter
    let filter = {};
    if (role) filter.role = role;
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('-password')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const setRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['participant','organizer','admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
  res.json({ user });
};

export const removeUser = async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.json({ ok: true });
};

// Organizer-specific functions
export const createOrganizer = async (req, res) => {
  const { username, email, password, fullName, mobile, department, enrollmentNo } = req.body;
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) return res.status(400).json({ message: 'User already exists' });
  const organizer = new User({
    username,
    email,
    password,
    fullName,
    mobile,
    department,
    enrollmentNo,
    role: 'organizer'
  });
  await organizer.save();

  // Send email notification to new organizer asynchronously
  sendOrganizerCreationEmail(organizer).catch(err => console.error('Failed to send organizer creation email:', err));

  res.status(201).json({ organizer: organizer.toObject({ versionKey: false }) });
};

export const listOrganizers = async (req, res) => {
  const organizers = await User.find({ role: 'organizer' }).select('-password').sort({ createdAt: -1 });
  res.json({ organizers });
};

export const updateOrganizer = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates.password; // Prevent password update here
  delete updates.role; // Prevent role change
  const organizer = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
  if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
  res.json({ organizer });
};

export const deleteOrganizer = async (req, res) => {
  const { id } = req.params;
  const organizer = await User.findById(id);
  if (!organizer || organizer.role !== 'organizer') return res.status(404).json({ message: 'Organizer not found' });
  await User.findByIdAndDelete(id);
  res.json({ ok: true });
};

export const toggleUserBlock = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.isBlocked = !user.isBlocked;
  await user.save();

  res.json({
    user: user.toObject({ versionKey: false }),
    message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`
  });
};

export const upgradeToOrganizer = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'organizer') return res.status(400).json({ message: 'User is already an organizer' });

  user.role = 'organizer';
  await user.save();

  // Send email notification to upgraded organizer asynchronously
  sendOrganizerCreationEmail(user).catch(err => console.error('Failed to send organizer upgrade email:', err));

  res.json({
    user: user.toObject({ versionKey: false }),
    message: 'User upgraded to organizer successfully'
  });
};
