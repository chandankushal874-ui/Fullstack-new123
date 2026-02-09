import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: Request) {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
        console.log("Admin API Unauthorized:", session?.user);
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });
        console.log(`Admin API found ${users.length} users in DB`);

        return NextResponse.json(users);
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

const EnumStatus = ["PENDING", "APPROVED", "REJECTED"] as const;
const EnumRole = ["USER", "ADMIN"] as const;

const UpdateUserSchema = z.object({
    status: z.enum(EnumStatus).optional(),
    role: z.enum(EnumRole).optional(),
});

export async function PATCH(req: Request) {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        const validatedUpdates = UpdateUserSchema.safeParse(updates);

        if (!validatedUpdates.success) {
            return NextResponse.json(
                { error: "Invalid fields", details: validatedUpdates.error.flatten() },
                { status: 400 }
            );
        }

        const user = await prisma.user.update({
            where: { id },
            data: validatedUpdates.data,
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Failed to update user:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
