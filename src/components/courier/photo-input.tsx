"use client";

import * as React from "react";
import { Camera } from "lucide-react";

/** Camera capture input that downscales to a compact JPEG data URL. */
export function PhotoInput({ onChange, compact }: { onChange: (dataUrl: string | null) => void; compact?: boolean }) {
  const [preview, setPreview] = React.useState<string | null>(null);
  return (
    <label className={`flex ${compact ? "h-24" : "h-40"} cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 overflow-hidden`}>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="proof" className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <Camera className="size-6" />
          Camera
        </span>
      )}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const url = reader.result as string;
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const scale = Math.min(1, 640 / img.width);
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
              const out = canvas.toDataURL("image/jpeg", 0.7);
              setPreview(out);
              onChange(out);
            };
            img.src = url;
          };
          reader.readAsDataURL(file);
        }}
      />
    </label>
  );
}
