import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RegisterSchema } from "@/lib/schemas";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validatedFields = RegisterSchema.safeParse(body);

        if (!validatedFields.success) {
            return NextResponse.json(
                { error: "Invalid fields", details: validatedFields.error.flatten() },
                { status: 400 }
            );
        }

        const { email, password, name } = validatedFields.data;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already in use" },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user (default role USER, status PENDING)
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "USER",
                status: "PENDING",
            },
        });

        return NextResponse.json(
            { message: "User registered successfully. Waiting for admin approval." },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
