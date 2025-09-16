const { Campaign } = require("../models");
const logger = require("../utils/logger");

const seedCampaigns = [
  {
    title: "Clean Water for Rural Communities",
    slug: "clean-water-rural-communities",
    description:
      "Help us bring clean, safe drinking water to rural communities in need. Your donation will fund the construction of water wells, filtration systems, and education programs on water safety and hygiene.",
    shortDescription:
      "Providing clean water access to underserved rural communities through well construction and filtration systems.",
    goalAmount: 50000,
    raisedAmount: 18750,
    currency: "USD",
    featuredImage:
      "https://images.unsplash.com/photo-1541622010-be7e4c0b8c19?w=800",
    gallery: [
      {
        url: "https://images.unsplash.com/photo-1594736797933-d0bd01ba3285?w=600",
        caption: "Water well construction in progress",
      },
      {
        url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600",
        caption: "Community members accessing clean water",
      },
    ],
    category: "infrastructure",
    status: "active",
    donorCount: 125,
    isUrgent: true,
    priority: 8,
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    metadata: new Map([
      ["location", "Kenya & Tanzania"],
      ["beneficiaries", "2500 people"],
      ["timeline", "6 months"],
    ]),
  },
  {
    title: "Educational Support for Orphaned Children",
    slug: "educational-support-orphaned-children",
    description:
      "Support the education of orphaned and vulnerable children by providing school supplies, uniforms, and tuition fees. Every child deserves access to quality education regardless of their circumstances.",
    shortDescription:
      "Supporting orphaned children's education through school supplies, uniforms, and tuition assistance.",
    goalAmount: 25000,
    raisedAmount: 12400,
    currency: "USD",
    featuredImage:
      "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800",
    gallery: [
      {
        url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600",
        caption: "Children in classroom",
      },
    ],
    category: "education",
    status: "active",
    donorCount: 89,
    priority: 7,
    metadata: new Map([
      ["students", "150 children"],
      ["grades", "K-12"],
      ["duration", "Full academic year"],
    ]),
  },
  {
    title: "Emergency Medical Relief Fund",
    slug: "emergency-medical-relief-fund",
    description:
      "Provide critical medical care and supplies to communities affected by natural disasters and emergencies. Your donation helps us respond quickly to urgent medical needs when disasters strike.",
    shortDescription:
      "Emergency medical aid and supplies for disaster-affected communities.",
    goalAmount: 75000,
    raisedAmount: 45300,
    currency: "USD",
    featuredImage:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800",
    gallery: [],
    category: "emergency",
    status: "active",
    donorCount: 203,
    isUrgent: true,
    priority: 9,
    metadata: new Map([
      ["coverage", "Global"],
      ["response_time", "24-48 hours"],
    ]),
  },
  {
    title: "Food Security Program",
    slug: "food-security-program",
    description:
      "Combat hunger and malnutrition by providing nutritious meals, food packages, and agricultural training to food-insecure families. Help us ensure no one goes to bed hungry.",
    shortDescription:
      "Fighting hunger through food distribution and agricultural training programs.",
    goalAmount: 40000,
    raisedAmount: 28600,
    currency: "USD",
    featuredImage:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800",
    gallery: [
      {
        url: "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?w=600",
        caption: "Food distribution day",
      },
    ],
    category: "general",
    status: "active",
    donorCount: 156,
    priority: 6,
    endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
    metadata: new Map([
      ["families", "500 families"],
      ["frequency", "Monthly distributions"],
    ]),
  },
  {
    title: "Healthcare Clinic Construction",
    slug: "healthcare-clinic-construction",
    description:
      "Build a modern healthcare clinic to serve remote communities with limited access to medical care. The clinic will provide basic healthcare services, maternal care, and preventive medicine.",
    shortDescription:
      "Building a healthcare clinic for remote communities with limited medical access.",
    goalAmount: 100000,
    raisedAmount: 100000,
    currency: "USD",
    featuredImage:
      "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800",
    gallery: [],
    category: "healthcare",
    status: "completed",
    donorCount: 287,
    priority: 5,
    metadata: new Map([
      ["capacity", "100 patients/day"],
      ["services", "General care, maternity, pharmacy"],
      ["completion", "2024"],
    ]),
  },
];

async function seedCampaignsData() {
  try {
    // Clear existing campaigns (optional - remove in production)
    // await Campaign.deleteMany({});

    // Insert seed data
    const campaigns = await Campaign.insertMany(seedCampaigns);

    logger.info(`Successfully seeded ${campaigns.length} campaigns`);
    return campaigns;
  } catch (error) {
    logger.error("Error seeding campaigns:", error);
    throw error;
  }
}

module.exports = {
  seedCampaignsData,
  seedCampaigns,
};
