import Media from '../models/media.model.js';

export const uploadMedia = async (req, res) => {
  const {
    eventId,
    fileType,
    fileUrl,
    thumbnailUrl,
    title,
    description,
    category,
    style,
    tags,
    colorPalette
  } = req.body;

  const mediaData = {
    fileType,
    fileUrl,
    uploadedBy: req.user._id,
    title: title || description || 'Untitled Design',
    description,
    category: category || 'other',
    style: style || 'modern',
    tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
    colorPalette: colorPalette || []
  };

  // Add eventId if provided (for event media)
  if (eventId) {
    mediaData.event = eventId;
  }

  // Add thumbnail if provided
  if (thumbnailUrl) {
    mediaData.thumbnailUrl = thumbnailUrl;
  }

  const media = await Media.create(mediaData);
  res.status(201).json({ success: true, media });
};

export const eventMedia = async (req, res) => {
  const list = await Media.find({ event: req.params.eventId }).sort({ createdAt: -1 });
  res.json({ media: list });
};

export const gallery = async (req, res) => {
  const { category, style, search, tags, featured, limit = 50, page = 1 } = req.query;

  const filter = {};
  const searchFilter = [];

  // Category filter
  if (category && category !== 'all') {
    filter.category = category;
  }

  // Style filter
  if (style && style !== 'all') {
    filter.style = style;
  }

  // Featured filter
  if (featured === 'true') {
    filter.isFeatured = true;
  }

  // Search functionality
  if (search) {
    searchFilter.push(
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    );
  }

  // Tags filter
  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim());
    filter.tags = { $in: tagArray };
  }

  // Combine filters
  if (searchFilter.length > 0) {
    filter.$or = searchFilter;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const items = await Media.find(filter)
    .limit(parseInt(limit))
    .skip(skip)
    .sort({ isFeatured: -1, createdAt: -1 })
    .populate('uploadedBy', 'firstname lastname profile');

  const total = await Media.countDocuments(filter);

  // Transform data to match frontend expectations
  const transformedItems = items.filter(item => item != null).map(item => ({
    gallery_id: item._id,
    title: item.title || item.caption || `${item.fileType.charAt(0).toUpperCase() + item.fileType.slice(1)} Design`,
    description: item.description || item.caption || '',
    thumbnail_url: item.thumbnailUrl || item.fileUrl,
    image_url: item.fileUrl,
    category: item.category || 'other',
    style: item.style || 'modern',
    tags: item.tags || [],
    view_count: item.viewCount || 0,
    like_count: item.likeCount || 0,
    uploader: item.uploadedBy ? {
      user_id: item.uploadedBy._id,
      profile: {
        firstname: item.uploadedBy.firstname || 'Unknown',
        lastname: item.uploadedBy.lastname || 'User'
      }
    } : {
      user_id: null,
      profile: {
        firstname: 'Unknown',
        lastname: 'User'
      }
    },
    is_featured: item.isFeatured || false,
    color_palette: item.colorPalette || [],
    created_at: item.createdAt
  }));

  res.json({
    success: true,
    media: transformedItems,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
};

export const getUserGallery = async (req, res) => {
  const { limit = 50, page = 1 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const items = await Media.find({ uploadedBy: req.params.userId })
    .limit(parseInt(limit))
    .skip(skip)
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'firstname lastname profile');

  const total = await Media.countDocuments({ uploadedBy: req.params.userId });

  // Transform data to match frontend expectations
  const transformedItems = items.filter(item => item != null).map(item => ({
    gallery_id: item._id,
    title: item.title || item.caption || `${item.fileType.charAt(0).toUpperCase() + item.fileType.slice(1)} Design`,
    description: item.description || item.caption || '',
    thumbnail_url: item.thumbnailUrl || item.fileUrl,
    image_url: item.fileUrl,
    category: item.category || 'other',
    style: item.style || 'modern',
    tags: item.tags || [],
    view_count: item.viewCount || 0,
    like_count: item.likeCount || 0,
    uploader: item.uploadedBy ? {
      user_id: item.uploadedBy._id,
      profile: {
        firstname: item.uploadedBy.firstname || 'Unknown',
        lastname: item.uploadedBy.lastname || 'User'
      }
    } : {
      user_id: null,
      profile: {
        firstname: 'Unknown',
        lastname: 'User'
      }
    },
    is_featured: item.isFeatured || false,
    color_palette: item.colorPalette || [],
    created_at: item.createdAt
  }));

  res.json({
    success: true,
    media: transformedItems,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
};

export const updateMedia = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Validate that user can only update their own media
  const media = await Media.findById(id);
  if (!media) return res.status(404).json({ success: false, message: 'Media not found' });

  if (media.uploadedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized to update this media' });
  }

  // Handle tags array
  if (updates.tags && typeof updates.tags === 'string') {
    updates.tags = updates.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }

  const updatedMedia = await Media.findByIdAndUpdate(id, updates, { new: true });
  res.json({ success: true, media: updatedMedia });
};

export const deleteMedia = async (req, res) => {
  const { id } = req.params;
  const media = await Media.findById(id);
  if (!media) return res.status(404).json({ success: false, message: 'Media not found' });

  // Check if user is the owner or has admin/organizer role
  const isOwner = media.uploadedBy.toString() === req.user._id.toString();
  const isAdminOrOrganizer = ['admin', 'organizer'].includes(req.user.role);

  if (!isOwner && !isAdminOrOrganizer) {
    return res.status(403).json({ success: false, message: 'Unauthorized to delete this media' });
  }

  await Media.findByIdAndDelete(id);
  res.json({ success: true, message: 'Media deleted successfully' });
};

export const likeMedia = async (req, res) => {
  const { id } = req.params;

  const media = await Media.findById(id);
  if (!media) return res.status(404).json({ success: false, message: 'Media not found' });

  // Toggle like (simplified - in production you'd track user likes)
  const newLikeCount = media.likeCount + 1; // Simplified increment
  await Media.findByIdAndUpdate(id, { likeCount: newLikeCount });

  res.json({
    success: true,
    message: 'Liked',
    data: { like_count: newLikeCount }
  });
};
