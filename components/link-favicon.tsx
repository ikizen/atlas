"use client";

import { memo, useState } from "react";
import { faviconUrl } from "@/lib/favicon";
import { cn } from "@/lib/utils";

export const LinkFavicon = memo(function LinkFavicon({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const letter = (title.trim()[0] ?? "•").toUpperCase();

  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-muted text-[10px] font-medium text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      {failed ? (
        letter
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl(url)}
          alt=""
          width={20}
          height={20}
          className="size-full object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
});
