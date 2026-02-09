import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            role: "ADMIN" | "USER"
            status: "PENDING" | "APPROVED" | "REJECTED"
        } & DefaultSession["user"]
    }

    interface User {
        role: "ADMIN" | "USER"
        status: "PENDING" | "APPROVED" | "REJECTED"
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: "ADMIN" | "USER"
        status: "PENDING" | "APPROVED" | "REJECTED"
    }
}
