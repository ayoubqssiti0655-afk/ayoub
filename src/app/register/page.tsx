import { db } from "@/server/db";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const cities = await db.city.findMany({ orderBy: { nameFr: "asc" } });
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <RegisterForm cities={cities.map((c) => c.nameFr)} />
    </div>
  );
}
