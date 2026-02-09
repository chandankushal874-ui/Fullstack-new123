import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: "/login",
        error: "/login", // Setup error page later
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
            const isOnAdmin = nextUrl.pathname.startsWith("/admin")

            if (isOnAdmin) {
                if (isLoggedIn && auth?.user?.role === "ADMIN") return true
                return false // Redirect to login
            }

            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false // Redirect to login
            }

            return true
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.status = user.status
            }
            return token
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            if (token.role && session.user) {
                session.user.role = token.role as "ADMIN" | "USER"
                session.user.status = token.status as "PENDING" | "APPROVED" | "REJECTED"
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            // If the url is the dashboard setup by the login page, check if we need to redirect elsewhere
            // Note: We don't have access to the user here easily without a session check, 
            // but NextAuth v5 redirect callback is limited.
            // Actually, we can just return the url. 
            // The better place for role-based redirect is the Login page onSubmit or the middleware.
            // However, the user asked for "login admin -> /admin".
            // Since we handle the redirect in the Login Page manually (router.push('/dashboard')),
            // We should update the Login Page to check the role or just rely on the Dashboard to redirect.
            return url.startsWith(baseUrl) ? url : baseUrl
        }
    },
    providers: [], // Providers configured in auth.ts
} satisfies NextAuthConfig
