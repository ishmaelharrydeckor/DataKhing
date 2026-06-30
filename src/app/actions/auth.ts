"use server";

import { db } from "@/lib/db";
import * as bcrypt from "bcryptjs";

export async function signUpAction(formData: {
  name: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
}) {
  try {
    const emailLower = formData.email.toLowerCase();

    // 1. Check if email exists
    const existingUser = await db.user.findUnique({
      where: { email: emailLower },
    });
    if (existingUser) {
      return { success: false, error: "An account with this email already exists." };
    }

    // 2. Validate referral code if provided
    let referredById: string | null = null;
    if (formData.referralCode) {
      const referrer = await db.user.findFirst({
        where: {
          referralCode: {
            equals: formData.referralCode.trim(),
          },
        },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    // 3. Hash Password
    const passwordHash = await bcrypt.hash(formData.password, 10);

    // 4. Generate unique referral code for the new user
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const cleanName = formData.name.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 5);
    const newReferralCode = `${cleanName || "USER"}${randomSuffix}`;

    // 5. Create user
    const newUser = await db.user.create({
      data: {
        name: formData.name,
        email: emailLower,
        phone: formData.phone,
        passwordHash,
        role: "CUSTOMER", // defaults to customer
        referralCode: newReferralCode,
        referredById,
        walletBalance: 0, // Starts at 0 pesewas
      },
    });

    // 6. If referred, create pending referral record
    if (referredById) {
      await db.referral.create({
        data: {
          referrerId: referredById,
          referredUserId: newUser.id,
          status: "PENDING",
        },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("signUpAction error:", error);
    return { success: false, error: error.message || "Signup failed." };
  }
}
