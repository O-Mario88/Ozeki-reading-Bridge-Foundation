import { ArticleShareActions } from "@/components/blog/ArticleShareActions";
import styles from "@/components/blog/EditorialBlog.module.css";
import { formatPostDate, getPostCoverImage } from "@/lib/blog-editorial";
import type { BlogPost } from "@/lib/types";

type ArticleHeaderOverlayProps = {
  post: BlogPost;
  categories: string[];
  shareUrl: string;
};

function avatarInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ArticleHeaderOverlay({ post, categories, shareUrl }: ArticleHeaderOverlayProps) {
  const coverImage = getPostCoverImage(post, "hero");

  return (
    <header className={styles.articleHeader}>
      {coverImage ? (
        <div className={styles.overlayHeader}>
          <div className={styles.overlayMedia}>
            <img src={coverImage} alt={post.featuredImageAlt || post.title} />
          </div>
        </div>
      ) : null}

      <div className={styles.breadcrumbRow}>
        {categories.map((category) => (
          <span key={category} className={styles.headerCategoryTag}>
            {category}
          </span>
        ))}
      </div>

      <h1 className={styles.editorialTitle}>{post.title}</h1>
      {post.subtitle ? <p className={styles.editorialSubtitle}>{post.subtitle}</p> : null}

      <div className={styles.metaBar}>
        <div className={styles.authorMeta}>
          {post.authorAvatarUrl ? (
            <img className={styles.authorAvatar} src={post.authorAvatarUrl} alt={`${post.author} avatar`} />
          ) : (
            <span className={styles.authorAvatarFallback}>{avatarInitials(post.author)}</span>
          )}
          <div>
            <p className={styles.authorName}>{post.author}</p>
            {post.showOverlayMetadata !== false ? (
              <p className={styles.authorRole}>
                {post.role} · {formatPostDate(post.publishedAt)}
              </p>
            ) : null}
          </div>
        </div>

        {post.showOverlayShareIcons !== false ? (
          <ArticleShareActions permalink={shareUrl} title={post.title} />
        ) : null}
      </div>
    </header>
  );
}
