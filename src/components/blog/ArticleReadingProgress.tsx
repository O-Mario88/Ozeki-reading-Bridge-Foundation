import styles from "@/components/blog/EditorialBlog.module.css";

type ArticleReadingProgressProps = {
  progressPercent: number;
};

export function ArticleReadingProgress({ progressPercent }: ArticleReadingProgressProps) {
  const clamped = Math.min(100, Math.max(0, progressPercent));
  return (
    <div className={styles.progressTrack} aria-hidden="true">
      <div className={styles.progressFill} style={{ width: `${clamped}%` }} />
    </div>
  );
}
