import { Facebook, Link2, Twitter } from "lucide-react";
import styles from "@/components/blog/EditorialBlog.module.css";

type ArticleShareActionsProps = {
  permalink: string;
  title: string;
  showLabel?: boolean;
};

export function ArticleShareActions({ permalink, title, showLabel = true }: ArticleShareActionsProps) {
  const encodedUrl = encodeURIComponent(permalink);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className={styles.shareRow} aria-label="Share article">
      {showLabel ? <span className={styles.shareLabel}>Share</span> : null}
      <a
        className={styles.shareButton}
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on Facebook"
      >
        <Facebook size={17} aria-hidden="true" />
      </a>
      <a
        className={styles.shareButton}
        href={`https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X"
      >
        <Twitter size={17} aria-hidden="true" />
      </a>
      <a
        className={styles.shareButton}
        href={permalink}
        aria-label="Copy article link"
      >
        <Link2 size={17} aria-hidden="true" />
      </a>
    </div>
  );
}
