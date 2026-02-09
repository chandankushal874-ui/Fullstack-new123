import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-center p-4">
      <div className="max-w-2xl space-y-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
          Secure Role-Based <span className="text-blue-600">Dashboard</span>
        </h1>
        <p className="text-lg text-gray-600">
          A production-ready Next.js application featuring secure authentication,
          admin approval workflows, and role-based access control.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" size="lg">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 text-left max-w-4xl w-full">
        <FeatureCard
          title="Secure Auth"
          description="Powered by NextAuth.js with bcrypt hashing and session management."
        />
        <FeatureCard
          title="Admin Approval"
          description="New users require admin verification before accessing the dashboard."
        />
        <FeatureCard
          title="RBAC"
          description="Strict role separation between Admin and User interfaces."
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  )
}
