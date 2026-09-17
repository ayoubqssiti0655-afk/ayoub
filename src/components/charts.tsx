"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

// Recharts reads CSS variables for theme-aware colors.
const axisProps = {
  stroke: "var(--border-strong)",
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({ valueLabel }: { valueLabel?: string }) {
  const { locale } = useI18n();
  return (
    <Tooltip
      cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
      contentStyle={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "var(--shadow-md)",
        fontSize: 12,
        direction: locale === "ar" ? "rtl" : "ltr",
        padding: "8px 10px",
      }}
      labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4, fontSize: 11 }}
      formatter={((value: unknown) => [String(value), ""]) as never}
      itemStyle={{ color: "var(--foreground)", fontWeight: 600 }}
    />
  );
}

export type Point = { label: string; value: number; secondary?: number };

export function AreaTrend({ data, color = "var(--chart-1)", height = 260, valueFormatter }: { data: Point[]; color?: string; height?: number; valueFormatter?: (v: number) => string }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axisProps} width={54} />
        <ChartTooltip valueLabel={valueFormatter ? undefined : undefined} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} activeDot={{ r: 3.5, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarsTrend({ data, color = "var(--chart-1)", height = 240, stacked }: { data: Point[]; color?: string; height?: number; stacked?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={20} />
        <YAxis {...axisProps} width={54} />
        <ChartTooltip />
        {stacked ? (
          <>
            <Bar dataKey="value" stackId="a" fill={color} radius={[0, 0, 3, 3]} maxBarSize={22} />
            <Bar dataKey="secondary" stackId="a" fill="var(--chart-4)" radius={[3, 3, 0, 0]} maxBarSize={22} />
          </>
        ) : (
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={26} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RateLine({ data, height = 200 }: { data: Point[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axisProps} width={54} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <ChartTooltip />
        <Line type="monotone" dataKey="value" stroke="var(--chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 3.5, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 220 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12,
            boxShadow: "var(--shadow-md)",
          }}
          itemStyle={{ color: "var(--foreground)", fontWeight: 600 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data, height, color = "var(--chart-1)" }: { data: Point[]; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <XAxis type="number" {...axisProps} />
        <YAxis type="category" dataKey="label" {...axisProps} width={92} />
        <ChartTooltip />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Small legend under donuts / multi-series charts. */
export function ChartLegend({ items }: { items: { name: string; value: React.ReactNode; color?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 text-[12.5px]">
          {it.color && <span className="size-2 rounded-full" style={{ background: it.color }} />}
          <span className="text-muted-foreground">{it.name}</span>
          <span className="font-semibold tnum">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, action, children, className }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4 shadow-xs", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
