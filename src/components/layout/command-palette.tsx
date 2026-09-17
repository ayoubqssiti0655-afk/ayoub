"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useI18n } from "@/i18n/provider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, User, Building2, Box, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = {
  groups: { label: string; items: { id: string; title: string; subtitle?: string; href: string; icon: string; badge?: string }[] }[];
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  order: Package,
  customer: User,
  merchant: Building2,
  product: Box,
  tracking: Hash,
};

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Result>({ groups: [] });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) { setQ(""); setResults({ groups: [] }); return; }
    if (q.trim().length < 2) { setResults({ groups: [] }); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) setResults(await res.json().then((j) => j.data));
      } catch {}
      setLoading(false);
    }, 180);
    return () => clearTimeout(timer);
  }, [q, open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="top-[18%] translate-y-0 overflow-visible p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">{t("common.search")}</DialogTitle>
        <Command loop shouldFilter={false} className="outline-none">
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-faint" />
            <Command.Input
              value={q}
              onValueChange={setQ}
              autoFocus
              placeholder={t("common.searchPlaceholder")}
              className="h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-faint"
            />
            {loading && <span className="size-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />}
          </div>
          <Command.List className="max-h-[380px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-[13px] text-muted-foreground">
              {q.trim().length < 2 ? t("common.searchPlaceholder") : t("common.noResults")}
            </Command.Empty>
            {results.groups.map((g) => (
              <Command.Group key={g.label} heading={g.label} className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-faint">
                {g.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? Package;
                  return (
                    <Command.Item
                      key={item.id}
                      value={item.id}
                      onSelect={() => go(item.href)}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] outline-none data-[selected=true]:bg-muted"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{item.title}</span>
                      {item.subtitle && <span className="truncate text-muted-foreground">{item.subtitle}</span>}
                      {item.badge && <span className="ms-auto"><span className="rounded-md border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{item.badge}</span></span>}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
