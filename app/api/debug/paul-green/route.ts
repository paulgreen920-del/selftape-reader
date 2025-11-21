import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Find Paul Green
    const user = await prisma.user.findFirst({
      where: {
        email: 'paulgreen920@gmail.com'
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: "Paul Green not found" }, { status: 404 });
    }
    
    // Check his availability templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: {
        userId: user.id
      }
    });
    
    // Check his availability slots
    const slots = await prisma.availabilitySlot.findMany({
      where: {
        userId: user.id
      },
      take: 5 // Just first 5
    });
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName
      },
      templates,
      slotsCount: await prisma.availabilitySlot.count({
        where: { userId: user.id }
      }),
      sampleSlots: slots
    });
    
  } catch (error) {
    console.error('Error checking Paul Green data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
