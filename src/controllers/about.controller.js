import { asyncHandler } from '../utils/asyncHandler.js';

export const getAboutData = asyncHandler(async (req, res) => {
  const aboutData = {
    hero: {
      title: "About EventSphere",
      subtitle: "Revolutionizing college event management with innovative technology and seamless user experiences.",
      stats: [
        { label: "Active Users", value: "10,000+", icon: "Users" },
        { label: "Events Hosted", value: "500+", icon: "Award" },
        { label: "Universities", value: "50+", icon: "Globe" }
      ]
    },
    mission: {
      title: "Our Mission",
      description: "We're dedicated to transforming how colleges and universities manage and participate in events. Our platform bridges the gap between organizers and participants, creating memorable experiences that foster community and growth.",
      values: [
        {
          title: "Community First",
          description: "Building stronger communities through meaningful event connections and shared experiences.",
          icon: "Heart"
        },
        {
          title: "Innovation",
          description: "Leveraging cutting-edge technology to simplify event management and enhance participation.",
          icon: "Award"
        },
        {
          title: "Accessibility",
          description: "Making event participation accessible to everyone, regardless of location or background.",
          icon: "Globe"
        }
      ]
    },
    testimonials: [
      {
        name: "Sarah Johnson",
        role: "Event Organizer",
        content: "EventSphere transformed how I manage my events. The platform is intuitive and powerful.",
        rating: 5,
        avatar: "SJ"
      },
      {
        name: "Mike Chen",
        role: "Participant",
        content: "Finding and registering for events has never been easier. Great user experience!",
        rating: 5,
        avatar: "MC"
      },
      {
        name: "Emily Davis",
        role: "Student",
        content: "As a student, I love how EventSphere connects me with amazing college events.",
        rating: 5,
        avatar: "ED"
      }
    ],
    team: [
      {
        name: "Alex Thompson",
        role: "CEO & Founder",
        bio: "Passionate about connecting people through events.",
        avatar: "AT"
      },
      {
        name: "Lisa Rodriguez",
        role: "CTO",
        bio: "Tech enthusiast driving innovation in event management.",
        avatar: "LR"
      },
      {
        name: "David Kim",
        role: "Head of Design",
        bio: "Creating beautiful experiences for our users.",
        avatar: "DK"
      }
    ]
  };

  res.status(200).json({
    success: true,
    data: aboutData
  });
});