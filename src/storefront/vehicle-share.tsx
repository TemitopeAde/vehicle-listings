import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Link, Mail, MoreHorizontal, Share2 } from "lucide-react";
import { useI18n } from "../shared/i18n-react";
import type { Vehicle } from "../shared/schemas";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

// Brand marks (Simple Icons, CC0); lucide no longer ships brand icons.
const brand = (path: string) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d={path} />
  </svg>
);
const icons = {
  facebook: brand(
    "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  ),
  x: brand(
    "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  ),
  whatsapp: brand(
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z",
  ),
  linkedin: brand(
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  ),
};

export function shareLinks(title: string, url: string) {
  const u = encodeURIComponent(url),
    t = encodeURIComponent(title);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    email: `mailto:?subject=${t}&body=${encodeURIComponent(`${title}\n${url}`)}`,
  };
}

function Item({
  href,
  icon,
  children,
  onClick,
}: {
  href?: string;
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
}) {
  const className =
    "flex w-full cursor-pointer items-center gap-3 rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";
  return href ? (
    <a
      role="menuitem"
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
    >
      {icon}
      {children}
    </a>
  ) : (
    <button
      role="menuitem"
      type="button"
      className={className}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

export function VehicleShare({ vehicle }: { vehicle: Vehicle }) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(false),
    [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // Read the address after mount: server-rendered pages have no window, and the
  // marketplace changes the hash when a different car opens.
  const [url, setUrl] = useState("");
  useEffect(() => {
    const read = () => setUrl(window.location.href);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const title = `${vehicle.title} · ${money(vehicle.price, vehicle.currency)}`;
  const links = shareLinks(title, url);
  const canNativeShare = Boolean(url) && typeof navigator.share === "function";

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !root.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Could not copy the vehicle link", error);
    }
  }

  return (
    <div ref={root} className="relative">
      <Button
        variant="outline"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={!url}
        onClick={() => setOpen((o) => !o)}
      >
        <Share2 className="h-4 w-4" />
        {t("Share")}
      </Button>
      <div
        role="menu"
        aria-label={t("Share {title}", { title: vehicle.title })}
        hidden={!open}
        className={cn(
          "absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border bg-background p-1.5 shadow-lg",
        )}
      >
        <Item
          href={links.facebook}
          icon={icons.facebook}
          onClick={() => setOpen(false)}
        >
          {t("Facebook")}
        </Item>
        <Item href={links.x} icon={icons.x} onClick={() => setOpen(false)}>
          {t("X (Twitter)")}
        </Item>
        <Item
          href={links.whatsapp}
          icon={icons.whatsapp}
          onClick={() => setOpen(false)}
        >
          {t("WhatsApp")}
        </Item>
        <Item
          href={links.linkedin}
          icon={icons.linkedin}
          onClick={() => setOpen(false)}
        >
          {t("LinkedIn")}
        </Item>
        <Item
          href={links.email}
          icon={<Mail className="h-4 w-4" />}
          onClick={() => setOpen(false)}
        >
          {t("Email")}
        </Item>
        <div className="my-1 h-px bg-border" />
        <Item
          icon={
            copied ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Link className="h-4 w-4" />
            )
          }
          onClick={() => void copy()}
        >
          <span aria-live="polite">
            {copied ? t("Link copied") : t("Copy link")}
          </span>
        </Item>
        {canNativeShare && (
          <Item
            icon={<MoreHorizontal className="h-4 w-4" />}
            onClick={() => {
              setOpen(false);
              navigator.share({ title, url }).catch(() => {});
            }}
          >
            {t("More options…")}
          </Item>
        )}
      </div>
    </div>
  );
}
