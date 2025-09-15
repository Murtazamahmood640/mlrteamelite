import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send verification email
export const sendVerificationEmail = async (email, token, name) => {
  const transporter = createTransporter();
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify Your EventSphere Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">Welcome to EventSphere, ${name}!</h2>
        <p>Thank you for registering with EventSphere. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
        <p>This link will expire in 24 hours for security reasons.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't create an account with EventSphere, please ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send event creation email
export const sendEventCreationEmail = async (event, organizer) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_USER, // Send to admin
    subject: 'New Event Created - Approval Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">New Event Created</h2>
        <p>A new event has been created and requires approval:</p>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${event.title}</h3>
          <p><strong>Organizer:</strong> ${organizer.username} (${organizer.email})</p>
          <p><strong>Category:</strong> ${event.category}</p>
          <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
          <p><strong>Venue:</strong> ${event.venue}</p>
          <p><strong>Description:</strong> ${event.description}</p>
        </div>
        <p>Please review and approve this event in the admin dashboard.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send event approval email
export const sendEventApprovalEmail = async (event, organizer) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: organizer.email,
    subject: 'Event Approved - EventSphere',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Event Approved!</h2>
        <p>Great news! Your event has been approved and is now live on EventSphere.</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${event.title}</h3>
          <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
          <p><strong>Venue:</strong> ${event.venue}</p>
        </div>
        <p>Students can now register for your event. You can manage registrations from your organizer dashboard.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send event rejection email
export const sendEventRejectionEmail = async (event, organizer) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: organizer.email,
    subject: 'Event Requires Revision - EventSphere',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Event Requires Revision</h2>
        <p>Your event submission needs some adjustments before it can be approved.</p>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${event.title}</h3>
          <p>Please review your event details and make necessary changes.</p>
        </div>
        <p>You can edit your event from the organizer dashboard and resubmit for approval.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send event update email
export const sendEventUpdateEmail = async (event, participants) => {
  const transporter = createTransporter();

  for (const participant of participants) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: participant.email,
      subject: `Event Update: ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b5cf6;">Event Update</h2>
          <p>Hello ${participant.username},</p>
          <p>There has been an update to an event you're registered for:</p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${event.title}</h3>
            <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
            <p><strong>Venue:</strong> ${event.venue}</p>
          </div>
          <p>Please check the event details for any changes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  }
};

// Send new registration email to organizer
export const sendNewRegistrationEmail = async (registration, organizer) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: organizer.email,
    subject: `New Registration: ${registration.event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">New Event Registration</h2>
        <p>A new participant has registered for your event:</p>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${registration.event.title}</h3>
          <p><strong>Participant:</strong> ${registration.participant.username} (${registration.participant.email})</p>
          <p><strong>Registration Date:</strong> ${new Date(registration.registeredOn).toLocaleDateString()}</p>
        </div>
        <p>Please review and approve the registration from your organizer dashboard.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send registration approval email
export const sendRegistrationApprovalEmail = async (registration) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: registration.participant.email,
    subject: `Registration Approved: ${registration.event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Registration Approved!</h2>
        <p>Hello ${registration.participant.username},</p>
        <p>Your registration has been approved for:</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${registration.event.title}</h3>
          <p><strong>Date:</strong> ${new Date(registration.event.date).toLocaleDateString()}</p>
          <p><strong>Venue:</strong> ${registration.event.venue}</p>
        </div>
        <p>Your ticket has been attached to this email. Please bring it to the event.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send registration rejection email
export const sendRegistrationRejectionEmail = async (registration) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: registration.participant.email,
    subject: `Registration Update: ${registration.event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Registration Update</h2>
        <p>Hello ${registration.participant.username},</p>
        <p>We regret to inform you that your registration for the following event could not be approved:</p>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${registration.event.title}</h3>
          <p><strong>Date:</strong> ${new Date(registration.event.date).toLocaleDateString()}</p>
        </div>
        <p>This may be due to capacity limitations or specific requirements. Please contact the organizer for more information.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send organizer creation email
export const sendOrganizerCreationEmail = async (organizer) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: organizer.email,
    subject: 'Welcome to EventSphere - Organizer Account Created',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">Welcome to EventSphere!</h2>
        <p>Hello ${organizer.fullName},</p>
        <p>Your organizer account has been created successfully. You can now create and manage events on EventSphere.</p>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Username:</strong> ${organizer.username}</p>
          <p><strong>Email:</strong> ${organizer.email}</p>
          <p><strong>Department:</strong> ${organizer.department}</p>
        </div>
        <p>Please log in to your account to start creating amazing events!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send feedback confirmation email
export const sendFeedbackConfirmationEmail = async (user, feedback) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: 'Feedback Received - EventSphere',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">Thank You for Your Feedback!</h2>
        <p>Hello ${user.username},</p>
        <p>We've received your feedback and appreciate you taking the time to share your experience.</p>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Rating:</strong> ${feedback.rating}/5 stars</p>
          <p><strong>Comments:</strong> ${feedback.comments || 'No additional comments'}</p>
        </div>
        <p>Your feedback helps us improve EventSphere for everyone!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send two-factor authentication code
export const sendTwoFactorCodeEmail = async (email, code, username) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'EventSphere - Two-Factor Authentication Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">Two-Factor Authentication</h2>
        <p>Hello ${username},</p>
        <p>Your verification code for EventSphere login is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">
            ${code}
          </div>
        </div>
        <p>This code will expire in 10 minutes for security reasons.</p>
        <p style="color: #ef4444; font-weight: bold;">Do not share this code with anyone.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send contact form email
export const sendContactEmail = async ({ name, email, message }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_USER,
    subject: `Contact Form Submission from ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">New Contact Form Submission</h2>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p>Please respond to this inquiry promptly.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};