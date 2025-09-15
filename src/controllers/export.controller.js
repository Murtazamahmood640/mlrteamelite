import { PDFDocument, rgb } from 'pdf-lib';
import ExcelJS from 'exceljs';
import User from '../models/user.models.js';
import Event from '../models/event.models.js';
import Registration from '../models/registration.models.js';

/**
 * Export users data to PDF
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const exportUsersToPDF = async (req, res) => {
  try {
    const { role, department, enrollmentNo, from, to } = req.query;

    // Build filter
    let filter = {};
    if (role) filter.role = role;
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (enrollmentNo) filter.enrollmentNo = { $regex: enrollmentNo, $options: 'i' };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // Only admins can export all users, organizers can only export participants
    if (req.user.role === 'organizer') {
      filter.role = 'participant';
    }

    const users = await User.find(filter)
      .select('username fullName email role department enrollmentNo createdAt')
      .sort({ createdAt: -1 });

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;
    let yPosition = height - 50;

    // Title
    page.drawText('Users Report', {
      x: 50,
      y: yPosition,
      size: 20,
      color: rgb(0, 0, 0)
    });
    yPosition -= 40;

    // Generated date
    page.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      color: rgb(0.5, 0.5, 0.5)
    });
    yPosition -= 30;

    // Headers
    const headers = ['Username', 'Full Name', 'Email', 'Role', 'Department', 'Enrollment No', 'Created'];
    let xPosition = 50;

    headers.forEach(header => {
      page.drawText(header, {
        x: xPosition,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0, 0)
      });
      xPosition += 100;
    });
    yPosition -= 20;

    // Draw line
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    yPosition -= 20;

    // User data
    for (const user of users) {
      if (yPosition < 100) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }

      xPosition = 50;
      const userData = [
        user.username || '',
        user.fullName || '',
        user.email || '',
        user.role || '',
        user.department || '',
        user.enrollmentNo || '',
        new Date(user.createdAt).toLocaleDateString()
      ];

      userData.forEach(data => {
        page.drawText(data, {
          x: xPosition,
          y: yPosition,
          size: 10,
          color: rgb(0, 0, 0)
        });
        xPosition += 100;
      });
      yPosition -= 15;
    }

    // Total count
    if (yPosition < 50) {
      page = pdfDoc.addPage();
      yPosition = height - 50;
    }

    page.drawText(`Total Users: ${users.length}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0)
    });

    // Generate PDF
    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=users_report.pdf');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error exporting users to PDF:', error);
    res.status(500).json({
      message: 'Failed to export users to PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Export users data to Excel
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const exportUsersToExcel = async (req, res) => {
  try {
    const { role, department, enrollmentNo, from, to } = req.query;

    // Build filter
    let filter = {};
    if (role) filter.role = role;
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (enrollmentNo) filter.enrollmentNo = { $regex: enrollmentNo, $options: 'i' };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // Only admins can export all users, organizers can only export participants
    if (req.user.role === 'organizer') {
      filter.role = 'participant';
    }

    const users = await User.find(filter)
      .select('username fullName email role department enrollmentNo createdAt')
      .sort({ createdAt: -1 });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users Report');

    // Add headers
    worksheet.columns = [
      { header: 'Username', key: 'username', width: 15 },
      { header: 'Full Name', key: 'fullName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 10 },
      { header: 'Department', key: 'department', width: 15 },
      { header: 'Enrollment No', key: 'enrollmentNo', width: 15 },
      { header: 'Created Date', key: 'createdAt', width: 15 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data
    users.forEach(user => {
      worksheet.addRow({
        username: user.username || '',
        fullName: user.fullName || '',
        email: user.email || '',
        role: user.role || '',
        department: user.department || '',
        enrollmentNo: user.enrollmentNo || '',
        createdAt: new Date(user.createdAt).toLocaleDateString()
      });
    });

    // Add summary row
    const summaryRow = worksheet.addRow({
      username: `Total Users: ${users.length}`,
      fullName: '',
      email: '',
      role: '',
      department: '',
      enrollmentNo: '',
      createdAt: ''
    });
    summaryRow.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting users to Excel:', error);
    res.status(500).json({
      message: 'Failed to export users to Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Export events data to PDF
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const exportEventsToPDF = async (req, res) => {
  try {
    const { category, status, from, to } = req.query;

    // Build filter
    let filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // Organizers can only export their own events
    if (req.user.role === 'organizer') {
      filter.organizer = req.user._id;
    }

    const events = await Event.find(filter)
      .populate('organizer', 'username fullName')
      .sort({ date: -1 });

    // Get registration counts for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const regCount = await Registration.countDocuments({ event: event._id, status: 'confirmed' });
        return { ...event.toObject(), registrationCount: regCount };
      })
    );

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;
    let yPosition = height - 50;

    // Title
    page.drawText('Events Report', {
      x: 50,
      y: yPosition,
      size: 20,
      color: rgb(0, 0, 0)
    });
    yPosition -= 40;

    // Generated date
    page.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      color: rgb(0.5, 0.5, 0.5)
    });
    yPosition -= 30;

    // Headers
    const headers = ['Title', 'Category', 'Date', 'Venue', 'Status', 'Organizer', 'Registrations'];
    let xPosition = 50;

    headers.forEach(header => {
      page.drawText(header, {
        x: xPosition,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0, 0)
      });
      xPosition += 80;
    });
    yPosition -= 20;

    // Draw line
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    yPosition -= 20;

    // Event data
    for (const event of eventsWithCounts) {
      if (yPosition < 100) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }

      xPosition = 50;
      const eventData = [
        event.title || '',
        event.category || '',
        new Date(event.date).toLocaleDateString(),
        event.venue || '',
        event.status || '',
        event.organizer?.username || '',
        event.registrationCount?.toString() || '0'
      ];

      eventData.forEach(data => {
        page.drawText(data, {
          x: xPosition,
          y: yPosition,
          size: 10,
          color: rgb(0, 0, 0)
        });
        xPosition += 80;
      });
      yPosition -= 15;
    }

    // Total count
    if (yPosition < 50) {
      page = pdfDoc.addPage();
      yPosition = height - 50;
    }

    page.drawText(`Total Events: ${events.length}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0)
    });

    // Generate PDF
    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=events_report.pdf');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error exporting events to PDF:', error);
    res.status(500).json({
      message: 'Failed to export events to PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Export events data to Excel
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const exportEventsToExcel = async (req, res) => {
  try {
    const { category, status, from, to } = req.query;

    // Build filter
    let filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // Organizers can only export their own events
    if (req.user.role === 'organizer') {
      filter.organizer = req.user._id;
    }

    const events = await Event.find(filter)
      .populate('organizer', 'username fullName')
      .sort({ date: -1 });

    // Get registration counts for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const regCount = await Registration.countDocuments({ event: event._id, status: 'confirmed' });
        return { ...event.toObject(), registrationCount: regCount };
      })
    );

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Events Report');

    // Add headers
    worksheet.columns = [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Venue', key: 'venue', width: 20 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Max Seats', key: 'maxSeats', width: 10 },
      { header: 'Organizer', key: 'organizer', width: 20 },
      { header: 'Registrations', key: 'registrationCount', width: 15 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data
    eventsWithCounts.forEach(event => {
      worksheet.addRow({
        title: event.title || '',
        category: event.category || '',
        date: new Date(event.date).toLocaleDateString(),
        time: event.time || '',
        venue: event.venue || '',
        status: event.status || '',
        maxSeats: event.maxSeats || '',
        organizer: event.organizer?.username || '',
        registrationCount: event.registrationCount || 0
      });
    });

    // Add summary row
    const summaryRow = worksheet.addRow({
      title: `Total Events: ${events.length}`,
      category: '',
      date: '',
      time: '',
      venue: '',
      status: '',
      maxSeats: '',
      organizer: '',
      registrationCount: ''
    });
    summaryRow.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=events_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting events to Excel:', error);
    res.status(500).json({
      message: 'Failed to export events to Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};