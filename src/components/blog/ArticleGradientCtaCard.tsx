import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "@/components/blog/EditorialBlog.module.css";
import type { BlogGradientCtaCard } from "@/lib/types";

type ArticleGradientCtaCardProps = {
  ctaCard: BlogGradientCtaCard | null | undefined;
};

const FALLBACK_COPY = {
  pillLabel: "Ideas Live Here",
  headline: "Follow the Thought Trail",
  text: "Explore all topics and find the ones that matter to you.",
  buttonLabel: "Explore Categories",
  buttonLink: "/blog",
  gradientPreset: "preset-3",
} as const;

export function ArticleGradientCtaCard({ ctaCard }: ArticleGradientCtaCardProps) {
  if (ctaCard?.enabled === false) {
    return null;
  }

  const card = {
    enabled: true,
    pillLabel: ctaCard?.pillLabel || FALLBACK_COPY.pillLabel,
    headline: ctaCard?.headline || FALLBACK_COPY.headline,
    text: ctaCard?.text || FALLBACK_COPY.text,
    buttonLabel: ctaCard?.buttonLabel || FALLBACK_COPY.buttonLabel,
    buttonLink: ctaCard?.buttonLink || FALLBACK_COPY.buttonLink,
    gradientPreset: ctaCard?.gradientPreset || FALLBACK_COPY.gradientPreset,
  } as const;

  const gradientClass =
    card.gradientPreset === "preset-2"
      ? styles.gradientPreset2
      : card.gradientPreset === "preset-3"
        ? styles.gradientPreset3
        : styles.gradientPreset1;

  const pill = card.pillLabel.trim() || FALLBACK_COPY.pillLabel;
  const title = card.headline.trim() || FALLBACK_COPY.headline;
  const text = card.text.trim() || FALLBACK_COPY.text;
  const buttonLabel = card.buttonLabel.trim() || FALLBACK_COPY.buttonLabel;
  const buttonLink = card.buttonLink.trim() || FALLBACK_COPY.buttonLink;

  return (
    <aside className={`${styles.gradientCta} ${gradientClass}`}>
      <p className={styles.gradientPill}>{pill}</p>
      <h3 className={styles.gradientTitle}>{title}</h3>
      <p className={styles.gradientText}>{text}</p>
      <Link href={buttonLink} className={styles.gradientButton}>
        {buttonLabel}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </aside>
  );
}
