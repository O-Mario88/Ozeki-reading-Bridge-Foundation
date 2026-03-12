import { Clock3 } from "lucide-react";
import { ArticleReadingProgress } from "@/components/blog/ArticleReadingProgress";
import styles from "@/components/blog/EditorialBlog.module.css";

type ArticleReadTimeCardProps = {
  readTimeLabel: string;
  progressPercent: number;
};

export function ArticleReadTimeCard({ readTimeLabel, progressPercent }: ArticleReadTimeCardProps) {
  return (
    <section className={styles.readTimeCard} aria-label="Reading time">
      <p className={styles.readTimeTitle}>
        <Clock3 size={16} className={styles.iconMuted} aria-hidden="true" />
        {readTimeLabel}
      </p>
      <ArticleReadingProgress progressPercent={progressPercent} />
    </section>
  );
}
