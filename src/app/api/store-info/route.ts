import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ success: false, error: "Missing slug parameter." }, { status: 400 });
    }

    const store = await db.store.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        displayName: true,
        primaryColor: true,
        logoUrl: true,
      },
    });

    if (!store) {
      return NextResponse.json({ success: false, error: "Store not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      id: store.id,
      name: store.name,
      displayName: store.displayName,
      primaryColor: store.primaryColor,
      logoUrl: store.logoUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
