import styles from "@/components/blog/EditorialBlog.module.css";
import type { EditorialTocItem } from "@/lib/blog-editorial";

type ArticleContentsRailProps = {
  toc: EditorialTocItem[];
  activeHeadingId: string | null;
};

export function ArticleContentsRail({ toc, activeHeadingId }: ArticleContentsRailProps) {
  if (toc.length === 0) {
    return null;
  }

  return (
    <section className={styles.contentsCard} aria-label="Contents">
      <p className={styles.contentsLabel}>Contents</p>
      <ul className={styles.contentsList}>
        {toc.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={[
                styles.contentsLink,
                item.level === 3 ? styles.contentsLinkLevel3 : "",
                activeHeadingId === item.id ? styles.contentsLinkActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
