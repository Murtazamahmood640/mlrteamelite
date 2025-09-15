import { asyncHandler } from "../utils/asyncHandler.js";
import { sendContactEmail } from "../services/emailService.js";

// Submit contact form
export const submitContact = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  try {
    // Send contact email
    await sendContactEmail({ name, email, message });

    res.status(200).json({
      success: true,
      message: "Message sent successfully"
    });
  } catch (error) {
    console.error("Contact email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again."
    });
  }
});