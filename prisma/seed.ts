import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // Clear existing data
  await prisma.auditLog.deleteMany({});
  await prisma.agentApplication.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.bundle.deleteMany({});
  await prisma.user.deleteMany({});

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash("adminpassword", 10);
  const agentPasswordHash = await bcrypt.hash("agentpassword", 10);
  const customerPasswordHash = await bcrypt.hash("customerpassword", 10);

  // Create Users
  const admin = await prisma.user.create({
    data: {
      name: "Default Admin",
      email: "admin@datakhing.com",
      phone: "0240000001",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      walletBalance: 100000, // GH₵1000.00
      referralCode: "ADMINREF",
    },
  });

  const agent = await prisma.user.create({
    data: {
      name: "Default Agent",
      email: "agent@datakhing.com",
      phone: "0240000002",
      passwordHash: agentPasswordHash,
      role: "AGENT",
      walletBalance: 50000, // GH₵500.00
      referralCode: "AGENTREF",
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "Default Customer",
      email: "customer@datakhing.com",
      phone: "0240000003",
      passwordHash: customerPasswordHash,
      role: "CUSTOMER",
      walletBalance: 20000, // GH₵200.00
      referralCode: "CUSTOMERREF",
    },
  });

  console.log("Users created:", { admin: admin.email, agent: agent.email, customer: customer.email });

  // Create Data Bundles
  const bundlesData = [
    // MTN Bundles
    { network: "MTN", label: "MTN 1GB (Non-expiry)", dataAmountGB: 1.0, supplierCostPesewas: 200, sellPricePesewas: 300, agentPricePesewas: 250 },
    { network: "MTN", label: "MTN 2.5GB (Non-expiry)", dataAmountGB: 2.5, supplierCostPesewas: 400, sellPricePesewas: 550, agentPricePesewas: 480 },
    { network: "MTN", label: "MTN 5GB (Non-expiry)", dataAmountGB: 5.0, supplierCostPesewas: 750, sellPricePesewas: 1000, agentPricePesewas: 880 },
    { network: "MTN", label: "MTN 10GB (Non-expiry)", dataAmountGB: 10.0, supplierCostPesewas: 1400, sellPricePesewas: 1800, agentPricePesewas: 1600 },
    { network: "MTN", label: "MTN 20GB (Non-expiry)", dataAmountGB: 20.0, supplierCostPesewas: 2600, sellPricePesewas: 3400, agentPricePesewas: 3000 },

    // Telecel Bundles
    { network: "TELECEL", label: "Telecel 1.5GB (30 Days)", dataAmountGB: 1.5, supplierCostPesewas: 220, sellPricePesewas: 320, agentPricePesewas: 270 },
    { network: "TELECEL", label: "Telecel 3GB (30 Days)", dataAmountGB: 3.0, supplierCostPesewas: 420, sellPricePesewas: 580, agentPricePesewas: 500 },
    { network: "TELECEL", label: "Telecel 8GB (30 Days)", dataAmountGB: 8.0, supplierCostPesewas: 1000, sellPricePesewas: 1400, agentPricePesewas: 1200 },
    { network: "TELECEL", label: "Telecel 15GB (30 Days)", dataAmountGB: 15.0, supplierCostPesewas: 1800, sellPricePesewas: 2400, agentPricePesewas: 2100 },

    // AirtelTigo Bundles
    { network: "AIRTELTIGO", label: "AirtelTigo 2GB (Non-expiry)", dataAmountGB: 2.0, supplierCostPesewas: 200, sellPricePesewas: 300, agentPricePesewas: 250 },
    { network: "AIRTELTIGO", label: "AirtelTigo 5GB (Non-expiry)", dataAmountGB: 5.0, supplierCostPesewas: 450, sellPricePesewas: 650, agentPricePesewas: 550 },
    { network: "AIRTELTIGO", label: "AirtelTigo 12GB (Non-expiry)", dataAmountGB: 12.0, supplierCostPesewas: 1000, sellPricePesewas: 1400, agentPricePesewas: 1200 },
    { network: "AIRTELTIGO", label: "AirtelTigo 25GB (Non-expiry)", dataAmountGB: 25.0, supplierCostPesewas: 2000, sellPricePesewas: 2700, agentPricePesewas: 2300 },
  ];

  for (const b of bundlesData) {
    await prisma.bundle.create({
      data: b,
    });
  }

  console.log(`Successfully seeded ${bundlesData.length} data bundles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
