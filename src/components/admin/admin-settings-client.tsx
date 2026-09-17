"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Shield, Building, Phone, Mail, UserCheck, Save } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { changeAdminPasswordAction, updatePlatformSettingsAction } from "@/server/admin-actions";

type AdminSettingsProps = {
  admin: {
    id: string;
    name: string;
    email: string;
  };
  settings: {
    platformName: string;
    supportPhone: string;
  };
};

export function AdminSettingsClient({ admin, settings }: AdminSettingsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();

  // Profile & Platform state
  const [name, setName] = React.useState(admin.name);
  const [email, setEmail] = React.useState(admin.email);
  const [platformName, setPlatformName] = React.useState(settings.platformName);
  const [supportPhone, setSupportPhone] = React.useState(settings.supportPhone);
  const [savingInfo, setSavingInfo] = React.useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true);
    const res = await updatePlatformSettingsAction({
      adminName: name,
      adminEmail: email,
      platformName,
      supportPhone,
    });
    setSavingInfo(false);
    if (res.ok) {
      toast.push({ title: t("admin.settings.saved"), variant: "success" });
      router.refresh();
    } else {
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.push({ title: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", variant: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.push({ title: "كلمات المرور غير متطابقة", variant: "error" });
      return;
    }
    setSavingPassword(true);
    const res = await changeAdminPasswordAction({
      current: currentPassword,
      next: newPassword,
    });
    setSavingPassword(false);
    if (res.ok) {
      toast.push({ title: t("admin.settings.passwordUpdated"), variant: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.push({ title: res.message ?? t("common.errorTitle"), variant: "error" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 1. Change Password */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-border pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-4.5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">{t("admin.settings.changePassword")}</h2>
            <p className="text-[12px] text-muted-foreground">تأمين لوحة الإدارة بتعيين كلمة مرور قوية جديدة</p>
          </div>
        </div>

        <form onSubmit={handleSavePassword} className="mt-4 space-y-3.5">
          <Field label={t("admin.settings.currentPassword")}>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
              dir="ltr"
            />
          </Field>
          <Field label={t("admin.settings.newPassword")} hint="الحد الأدنى 8 أحرف">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              dir="ltr"
            />
          </Field>
          <Field label={t("admin.settings.confirmPassword")}>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              dir="ltr"
            />
          </Field>
          <Button type="submit" disabled={savingPassword} className="w-full">
            <Shield className="size-4" />
            {savingPassword ? t("common.loading") : t("admin.settings.changePassword")}
          </Button>
        </form>
      </div>

      {/* 2. Platform & Admin Info */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-border pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building className="size-4.5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">{t("admin.settings.platformInfo")}</h2>
            <p className="text-[12px] text-muted-foreground">تخصيص اسم المنصة وبيانات التواصل الإدارية</p>
          </div>
        </div>

        <form onSubmit={handleSaveInfo} className="mt-4 space-y-3.5">
          <Field label={t("admin.settings.platformName")}>
            <Input
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="Masar Delivery / مسار"
            />
          </Field>
          <Field label={t("admin.settings.supportPhone")} hint="يظهر للزبائن والتجار للمساعدة الفورية">
            <Input
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              placeholder="+212 6 XX XX XX XX"
              dir="ltr"
            />
          </Field>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="اسم المدير">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field label="البريد الإلكتروني">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </Field>
          </div>
          <Button type="submit" disabled={savingInfo} className="w-full">
            <Save className="size-4" />
            {savingInfo ? t("common.loading") : t("admin.settings.saved")}
          </Button>
        </form>
      </div>
    </div>
  );
}

