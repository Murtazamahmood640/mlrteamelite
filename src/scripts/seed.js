import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/user.models.js";
import Event from "../models/event.models.js";
import Registration from "../models/registration.models.js";
import Feedback from "../models/feedback.models.js";
import Media from "../models/media.model.js";
import Attendance from "../models/attendance.models.js";
import Certificate from "../models/certificate.models.js";

dotenv.config();

// Helper function to create users
async function ensureUser({
  username,
  email,
  role,
  fullName,
  department,
  enrollmentNo,
  mobile,
}) {
  let user = await User.findOne({ email });
  if (!user) {
    const password = role === "admin" ? "Minhaj0p" : "password123";
    user = await User.create({
      username,
      email,
      password,
      role,
      fullName,
      mobile: mobile || "9999999999",
      department: department || "Computer Science",
      enrollmentNo: enrollmentNo || `ENR-${role.toUpperCase()}-${Date.now()}`,
      emailVerified: false, // Ensure admin users require email verification
    });
  } else {
    // Update existing admin users to require email verification
    if (role === "admin" && user.emailVerified) {
      user.emailVerified = false;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      await user.save();
    }
  }
  return user;
}

// Helper function to create events
async function ensureEvent(eventData) {
  let event = await Event.findOne({ title: eventData.title });
  if (!event) {
    event = await Event.create(eventData);
  }
  return event;
}

// Helper function to create registrations
async function ensureRegistration(
  eventId,
  participantId,
  status = "approved"
) {
  let registration = await Registration.findOne({
    event: eventId,
    participant: participantId,
  });
  if (!registration) {
    registration = await Registration.create({
      event: eventId,
      participant: participantId,
      status,
    });
  }
  return registration;
}

// Helper function to create feedback
async function ensureFeedback(
  eventId,
  participantId,
  rating,
  comments,
  componentRatings
) {
  let feedback = await Feedback.findOne({
    event: eventId,
    participant: participantId,
  });
  if (!feedback) {
    feedback = await Feedback.create({
      event: eventId,
      participant: participantId,
      rating,
      comments,
      componentRatings,
    });
  }
  return feedback;
}

// Helper function to create media
async function ensureMedia(eventId, uploadedById, fileType, fileUrl, caption) {
  let media = await Media.findOne({ event: eventId, fileUrl });
  if (!media) {
    media = await Media.create({
      event: eventId,
      uploadedBy: uploadedById,
      fileType,
      fileUrl,
      caption,
    });
  }
  return media;
}

// Helper function to create attendance
async function ensureAttendance(eventId, participantId, attended = true) {
  let attendance = await Attendance.findOne({
    event: eventId,
    participant: participantId,
  });
  if (!attendance) {
    attendance = await Attendance.create({
      event: eventId,
      participant: participantId,
      attended,
    });
  }
  return attendance;
}

// Helper function to create certificates
async function ensureCertificate(
  eventId,
  participantId,
  certificateUrl,
  feePaid = false
) {
  let certificate = await Certificate.findOne({
    event: eventId,
    participant: participantId,
  });
  if (!certificate) {
    certificate = await Certificate.create({
      event: eventId,
      participant: participantId,
      certificateUrl,
      feePaid,
    });
  }
  return certificate;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function run() {
  const uri = 'mongodb+srv://mjservices410:minhajdb@fullstack.2lmlegp.mongodb.net/'
;
  console.log(uri)
  if (!uri) throw new Error("MONGODB_URI missing");
  await connectDB(uri);
  console.log("Connected to DB");

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log("Clearing existing data...");
  await User.deleteMany({});
  await Event.deleteMany({});
  await Registration.deleteMany({});
  await Feedback.deleteMany({});
  await Media.deleteMany({});
  await Attendance.deleteMany({});
  await Certificate.deleteMany({});

  // Create Admin Users
  console.log("Creating admin users...");
  const admin1 = await ensureUser({
    username: "admin1",
    email: "mjservices410@gmail.com",
    role: "admin",
    fullName: "System Administrator",
    department: "Administration",
    enrollmentNo: "ADMIN-001",
    mobile: "9876543210",
  });

  const admin2 = await ensureUser({
    username: "admin2",
    email: "ayancoder8@gmail.com",
    role: "admin",
    fullName: "System Administrator 2",
    department: "Administration",
    enrollmentNo: "ADMIN-002",
    mobile: "9876543211",
  });

  // Create Organizer Users
  console.log("Creating organizer users...");
  const organizers = [];
  const organizerData = [
    {
      username: "org1",
      email: "organizer1@eventsphere.com",
      fullName: "Dr. Sarah Johnson",
      department: "Computer Science",
      enrollmentNo: "ORG-001",
    },
    {
      username: "org2",
      email: "organizer2@eventsphere.com",
      fullName: "Prof. Michael Chen",
      department: "Electronics",
      enrollmentNo: "ORG-002",
    },
    {
      username: "org3",
      email: "organizer3@eventsphere.com",
      fullName: "Ms. Priya Sharma",
      department: "Cultural Committee",
      enrollmentNo: "ORG-003",
    },
    {
      username: "org4",
      email: "organizer4@eventsphere.com",
      fullName: "Mr. David Wilson",
      department: "Sports",
      enrollmentNo: "ORG-004",
    },
  ];

  for (const orgData of organizerData) {
    const organizer = await ensureUser({ ...orgData, role: "organizer" });
    organizers.push(organizer);
  }

  // Create Participant Users
  console.log("Creating participant users...");
  const participants = [];
  const participantData = [
    {
      username: "student1",
      email: "student1@eventsphere.com",
      fullName: "Alex Thompson",
      department: "Computer Science",
      enrollmentNo: "CS2024001",
    },
    {
      username: "student2",
      email: "student2@eventsphere.com",
      fullName: "Emma Davis",
      department: "Electronics",
      enrollmentNo: "EC2024002",
    },
    {
      username: "student3",
      email: "student3@eventsphere.com",
      fullName: "James Wilson",
      department: "Mechanical",
      enrollmentNo: "ME2024003",
    },
    {
      username: "student4",
      email: "student4@eventsphere.com",
      fullName: "Sophia Brown",
      department: "Computer Science",
      enrollmentNo: "CS2024004",
    },
    {
      username: "student5",
      email: "student5@eventsphere.com",
      fullName: "Oliver Garcia",
      department: "Civil",
      enrollmentNo: "CE2024005",
    },
    {
      username: "student6",
      email: "student6@eventsphere.com",
      fullName: "Isabella Martinez",
      department: "Electronics",
      enrollmentNo: "EC2024006",
    },
    {
      username: "student7",
      email: "student7@eventsphere.com",
      fullName: "Lucas Anderson",
      department: "Computer Science",
      enrollmentNo: "CS2024007",
    },
    {
      username: "student8",
      email: "student8@eventsphere.com",
      fullName: "Ava Taylor",
      department: "Mechanical",
      enrollmentNo: "ME2024008",
    },
  ];

  for (const partData of participantData) {
    const participant = await ensureUser({ ...partData, role: "participant" });
    participants.push(participant);
  }

  // Create Events
  console.log("Creating events...");
  const events = [];
  const eventData = [
    // Technical Events
    {
      title: "TechFest 2024",
      description:
        "Annual technical festival featuring coding competitions, robotics, and AI workshops. Join us for an exciting day of technology and innovation.",
      category: "technical",
      date: daysFromNow(5),
      time: "09:00 AM",
      venue: "Main Auditorium",
      organizer: organizers[0]._id,
      maxSeats: 200,
      bannerImage:
        "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=500",
      waitlistEnabled: true,
      status: "approved",
    },
    {
      title: "AI & Machine Learning Workshop",
      description:
        "Hands-on workshop on Artificial Intelligence and Machine Learning. Learn from industry experts and build your own AI models.",
      category: "workshop",
      date: daysFromNow(10),
      time: "10:00 AM",
      venue: "Computer Lab 1",
      organizer: organizers[0]._id,
      maxSeats: 50,
      bannerImage:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500",
      waitlistEnabled: true,
      status: "approved",
    },
    {
      title: "Hackathon 2024",
      description:
        "48-hour coding competition where teams build innovative solutions to real-world problems. Prizes worth ₹50,000!",
      category: "competition",
      date: daysFromNow(15),
      time: "06:00 PM",
      venue: "Innovation Center",
      organizer: organizers[1]._id,
      maxSeats: 100,
      bannerImage:
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500",
      waitlistEnabled: true,
      status: "approved",
    },
    {
      title: "Cybersecurity Seminar",
      description:
        "Learn about the latest trends in cybersecurity, ethical hacking, and digital forensics from industry professionals.",
      category: "seminar",
      date: daysFromNow(20),
      time: "02:00 PM",
      venue: "Conference Hall",
      organizer: organizers[1]._id,
      maxSeats: 150,
      bannerImage:
        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=500",
      waitlistEnabled: false,
      status: "approved",
    },
    // Cultural Events
    {
      title: "Cultural Night 2024",
      description:
        "An evening of music, dance, and drama performances by students. Experience the rich cultural diversity of our campus.",
      category: "cultural",
      date: daysFromNow(8),
      time: "06:00 PM",
      venue: "Open Air Theater",
      organizer: organizers[2]._id,
      maxSeats: 500,
      bannerImage:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
      waitlistEnabled: false,
      status: "approved",
    },
    {
      title: "Dance Competition",
      description:
        "Showcase your dancing skills in various categories including classical, contemporary, and folk dance.",
      category: "cultural",
      date: daysFromNow(12),
      time: "04:00 PM",
      venue: "Cultural Center",
      organizer: organizers[2]._id,
      maxSeats: 80,
      bannerImage:
        "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=500",
      waitlistEnabled: true,
      status: "approved",
    },
    // Sports Events
    {
      title: "Sports Day 2024",
      description:
        "Annual sports day with various athletic competitions and games. Show your athletic spirit and compete for glory.",
      category: "sports",
      date: daysFromNow(7),
      time: "08:00 AM",
      venue: "Sports Complex",
      organizer: organizers[3]._id,
      maxSeats: 300,
      bannerImage:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500",
      waitlistEnabled: false,
      status: "approved",
    },
    {
      title: "Cricket Tournament",
      description:
        "Inter-department cricket tournament. Form your teams and compete for the championship trophy.",
      category: "sports",
      date: daysFromNow(25),
      time: "09:00 AM",
      venue: "Cricket Ground",
      organizer: organizers[3]._id,
      maxSeats: 200,
      bannerImage:
        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=500",
      waitlistEnabled: true,
      status: "approved",
    },
    // Past Events
    {
      title: "Web Development Bootcamp",
      description:
        "Intensive 3-day bootcamp covering modern web development technologies including React, Node.js, and MongoDB.",
      category: "workshop",
      date: daysFromNow(-5),
      time: "10:00 AM",
      venue: "Computer Lab 2",
      organizer: organizers[0]._id,
      maxSeats: 40,
      bannerImage:
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=500",
      waitlistEnabled: false,
      status: "completed",
    },
    {
      title: "Music Concert",
      description:
        "Live music performance featuring student bands and solo artists. A night of melodies and rhythms.",
      category: "cultural",
      date: daysFromNow(-10),
      time: "07:00 PM",
      venue: "Amphitheater",
      organizer: organizers[2]._id,
      maxSeats: 200,
      bannerImage:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
      waitlistEnabled: false,
      status: "completed",
    },
    {
      title: "Business Plan Competition",
      description:
        "Pitch your innovative business ideas to industry experts and win exciting prizes. Perfect for aspiring entrepreneurs.",
      category: "competition",
      date: daysFromNow(18),
      time: "02:00 PM",
      venue: "Business School Auditorium",
      organizer: organizers[1]._id,
      maxSeats: 100,
      bannerImage:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500",
      waitlistEnabled: true,
      status: "approved",
    },
    {
      title: "Environmental Awareness Seminar",
      description:
        "Learn about climate change, sustainability, and environmental conservation. Join the movement for a greener future.",
      category: "seminar",
      date: daysFromNow(-15),
      time: "11:00 AM",
      venue: "Environmental Science Department",
      organizer: organizers[1]._id,
      maxSeats: 150,
      bannerImage:
        "https://images.unsplash.com/photo-1569163139394-de4466c4b2a0?w=500",
      waitlistEnabled: false,
      status: "completed",
    },
  ];

  for (const data of eventData) {
    const event = await ensureEvent(data);
    events.push(event);
  }

  // Create Registrations
  console.log("Creating registrations...");
  const registrations = [];

  // Register participants for various events
  const registrationData = [
    // TechFest registrations
    { eventIndex: 0, participantIndices: [0, 1, 2, 3, 4] },
    // AI Workshop registrations
    { eventIndex: 1, participantIndices: [0, 1, 5, 6] },
    // Hackathon registrations
    { eventIndex: 2, participantIndices: [0, 2, 3, 6, 7] },
    // Cultural Night registrations
    { eventIndex: 4, participantIndices: [1, 3, 4, 5, 6, 7] },
    // Dance Competition registrations
    { eventIndex: 5, participantIndices: [1, 3, 5] },
    // Sports Day registrations
    { eventIndex: 6, participantIndices: [2, 4, 6, 7] },
    // Cricket Tournament registrations
    { eventIndex: 7, participantIndices: [0, 2, 4, 6] },
    // Business Plan Competition registrations
    { eventIndex: 10, participantIndices: [0, 1, 3, 5, 6] },
  ];

  for (const regData of registrationData) {
    const event = events[regData.eventIndex];
    for (const participantIndex of regData.participantIndices) {
      const participant = participants[participantIndex];
      const registration = await ensureRegistration(event._id, participant._id);
      registrations.push(registration);
    }
  }

  // Create Feedback for completed events
  console.log("Creating feedback...");
  const completedEvents = events.filter((e) => e.status === "completed");
  const feedbackData = [
    {
      rating: 5,
      comments:
        "Excellent workshop! Learned a lot about modern web development.",
      componentRatings: {
        venue: 5,
        coordination: 5,
        technical: 5,
        hospitality: 4,
      },
    },
    {
      rating: 4,
      comments: "Great music and performances. Well organized event.",
      componentRatings: {
        venue: 4,
        coordination: 5,
        technical: 4,
        hospitality: 5,
      },
    },
    {
      rating: 5,
      comments:
        "Very informative seminar about environmental issues. Highly recommended!",
      componentRatings: {
        venue: 5,
        coordination: 4,
        technical: 5,
        hospitality: 4,
      },
    },
  ];

  for (let i = 0; i < completedEvents.length; i++) {
    const event = completedEvents[i];
    const feedback = feedbackData[i] || feedbackData[0];

    // Create feedback from multiple participants
    for (let j = 0; j < Math.min(3, participants.length); j++) {
      const participant = participants[j];
      await ensureFeedback(
        event._id,
        participant._id,
        feedback.rating,
        feedback.comments,
        feedback.componentRatings
      );
    }
  }

  // Create Media for events
  console.log("Creating media...");
  const mediaData = [
    {
      eventIndex: 8,
      fileType: "image",
      fileUrl:
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=500",
      caption: "Web Development Bootcamp - Day 1",
    },
    {
      eventIndex: 8,
      fileType: "image",
      fileUrl:
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500",
      caption: "Students working on projects",
    },
    {
      eventIndex: 9,
      fileType: "image",
      fileUrl:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
      caption: "Music Concert Highlights",
    },
    {
      eventIndex: 9,
      fileType: "image",
      fileUrl:
        "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=500",
      caption: "Student band performance",
    },
    {
      eventIndex: 11,
      fileType: "image",
      fileUrl:
        "https://images.unsplash.com/photo-1569163139394-de4466c4b2a0?w=500",
      caption: "Environmental Seminar - Keynote",
    },
    {
      eventIndex: 11,
      fileType: "image",
      fileUrl:
        "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=500",
      caption: "Interactive Q&A Session",
    },
  ];

  for (const media of mediaData) {
    const event = events[media.eventIndex];
    await ensureMedia(
      event._id,
      organizers[0]._id,
      media.fileType,
      media.fileUrl,
      media.caption
    );
  }

  // Create Attendance for completed events
  console.log("Creating attendance records...");
  for (const event of completedEvents) {
    // Mark attendance for some participants
    for (let i = 0; i < Math.min(5, participants.length); i++) {
      const participant = participants[i];
      await ensureAttendance(event._id, participant._id, true);
    }
  }

  // Create Certificates for attended events
  console.log("Creating certificates...");
  for (const event of completedEvents) {
    // Create certificates for participants who attended
    for (let i = 0; i < Math.min(3, participants.length); i++) {
      const participant = participants[i];
      const certificateUrl = `https://certificates.eventsphere.com/${event._id}/${participant._id}.pdf`;
      await ensureCertificate(
        event._id,
        participant._id,
        certificateUrl,
        Math.random() > 0.5
      ); // Random fee payment status
    }
  }

  // Update event currentBooked counts
  console.log("Updating event registration counts...");
  for (const event of events) {
    const registrationCount = await Registration.countDocuments({
      event: event._id,
      status: { $in: ["confirmed", "waitlist"] },
    });
    await Event.findByIdAndUpdate(event._id, {
      currentBooked: registrationCount,
    });
  }

  console.log("🎉 Seed complete!");
  console.log("📊 Summary:");
  console.log(
    `👥 Users: ${await User.countDocuments()} (${await User.countDocuments({
      role: "admin",
    })} admin, ${await User.countDocuments({
      role: "organizer",
    })} organizers, ${await User.countDocuments({
      role: "participant",
    })} participants)`
  );
  console.log(
    `📅 Events: ${await Event.countDocuments()} (${await Event.countDocuments({
      status: "approved",
    })} approved, ${await Event.countDocuments({
      status: "completed",
    })} completed)`
  );
  console.log(`📝 Registrations: ${await Registration.countDocuments()}`);
  console.log(`⭐ Feedback: ${await Feedback.countDocuments()}`);
  console.log(`📸 Media: ${await Media.countDocuments()}`);
  console.log(`✅ Attendance: ${await Attendance.countDocuments()}`);
  console.log(`🏆 Certificates: ${await Certificate.countDocuments()}`);

  console.log("\n🔑 Demo Login Credentials:");
  console.log("Admin 1: mjservices410@gmail.com / Minhaj0p");
  console.log("Admin 2: ayancoder8@gmail.com / Minhaj0p");
  console.log("Organizer: organizer1@eventsphere.com / password123");
  console.log("Participant: student1@eventsphere.com / password123");

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
