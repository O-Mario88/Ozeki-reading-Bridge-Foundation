import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { sanitizeInlineRichText, stripHtmlTags } from "@/lib/rich-text";
import type { BlogBodyBlock } from "@/lib/types";
import type { EditorialTocItem } from "@/lib/blog-editorial";
import styles from "@/components/blog/EditorialBlog.module.css";

type EditorialArticleBodyProps = {
  blocks: BlogBodyBlock[];
  toc: EditorialTocItem[];
};

const calloutClassByTone: Record<string, string> = {
  info: styles.calloutInfo,
  success: styles.calloutSuccess,
  warning: styles.calloutWarning,
  critical: styles.calloutCritical,
};

function inlineHtml(value: string | null | undefined, fallback = "") {
  return sanitizeInlineRichText(value) || fallback;
}

export function EditorialArticleBody({ blocks, toc }: EditorialArticleBodyProps) {
  const headingIdByBlockId = new Map(toc.map((item) => [item.blockId, item.id]));

  return (
    <article className={styles.articleBody}>
      {blocks.map((block) => {
        if (block.type === "heading2") {
          const heading = inlineHtml(block.heading || block.text, "Section");
          return (
            <h2 key={block.id} id={headingIdByBlockId.get(block.id)}>
              <span dangerouslySetInnerHTML={{ __html: heading }} />
            </h2>
          );
        }

        if (block.type === "heading3") {
          const heading = inlineHtml(block.heading || block.text, "Subsection");
          return (
            <h3 key={block.id} id={headingIdByBlockId.get(block.id)}>
              <span dangerouslySetInnerHTML={{ __html: heading }} />
            </h3>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={block.id}>
              <span dangerouslySetInnerHTML={{ __html: inlineHtml(block.text, "<br>") }} />
            </p>
          );
        }

        if (block.type === "bullet_list") {
          return (
            <ul key={block.id}>
              {(block.items ?? []).map((item) => (
                <li key={`${block.id}-${item}`}>
                  <span dangerouslySetInnerHTML={{ __html: inlineHtml(item) }} />
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "numbered_list") {
          return (
            <ol key={block.id}>
              {(block.items ?? []).map((item) => (
                <li key={`${block.id}-${item}`}>
                  <span dangerouslySetInnerHTML={{ __html: inlineHtml(item) }} />
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={block.id} className={styles.blockQuote}>
              <p>
                <span dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }} />
              </p>
              {block.quoteAttribution ? (
                <footer className={styles.blockQuoteFooter}>
                  <span dangerouslySetInnerHTML={{ __html: inlineHtml(block.quoteAttribution) }} />
                </footer>
              ) : null}
            </blockquote>
          );
        }

        if (block.type === "image") {
          const imageClass =
            block.imageWidthStyle === "small"
              ? styles.imageSmall
              : block.imageWidthStyle === "contained"
                ? styles.imageContained
                : styles.imageFull;
          if (!block.imageUrl) {
            return null;
          }
          return (
            <figure key={block.id} className={`${styles.bodyImageFigure} ${imageClass}`}>
              <div className={styles.bodyImageFrame}>
                <img src={block.imageUrl} alt={stripHtmlTags(block.imageAlt) || "Article image"} loading="lazy" />
              </div>
              {block.imageCaption || block.imageCredit ? (
                <figcaption className={styles.caption}>
                  {stripHtmlTags(block.imageCaption) || ""}
                  {block.imageCaption && block.imageCredit ? " · " : ""}
                  {stripHtmlTags(block.imageCredit) || ""}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        if (block.type === "callout") {
          const toneClass = block.calloutTone ? calloutClassByTone[block.calloutTone] : "";
          return (
            <section key={block.id} className={`${styles.callout} ${toneClass}`.trim()}>
              {block.calloutTitle ? (
                <h4>
                  <span dangerouslySetInnerHTML={{ __html: inlineHtml(block.calloutTitle) }} />
                </h4>
              ) : null}
              {block.text ? (
                <p>
                  <span dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }} />
                </p>
              ) : null}
            </section>
          );
        }

        if (block.type === "stat") {
          return (
            <section key={block.id} className={styles.statCard}>
              {block.statLabel ? (
                <p className={styles.statLabel}>
                  <span dangerouslySetInnerHTML={{ __html: inlineHtml(block.statLabel) }} />
                </p>
              ) : null}
              {block.statValue ? (
                <p className={styles.statValue}>
                  <span dangerouslySetInnerHTML={{ __html: inlineHtml(block.statValue) }} />
                </p>
              ) : null}
              {block.text ? (
                <p>
                  <span dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }} />
                </p>
              ) : null}
            </section>
          );
        }

        if (block.type === "cta_inline") {
          if (!block.ctaUrl || !block.ctaLabel) {
            return null;
          }
          return (
            <Link key={block.id} href={block.ctaUrl} className={styles.inlineCta}>
              <span dangerouslySetInnerHTML={{ __html: inlineHtml(block.ctaLabel) }} />
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          );
        }

        if (block.type === "divider") {
          return <hr key={block.id} className={styles.divider} />;
        }

        return null;
      })}
    </article>
  );
}
