import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const i = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 text-center">
      <p className="text-[64px] font-semibold tracking-[-0.04em] text-primary/25 tnum">404</p>
      <h1 className="mt-2 text-[20px] font-semibold">{i.t("errors.404.title")}</h1>
      <p className="mt-1.5 max-w-sm text-[13.5px] text-muted-foreground">{i.t("errors.404.desc")}</p>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>{i.t("errors.goHome")}</Link>
    </div>
  );
}
