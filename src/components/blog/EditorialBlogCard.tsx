import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { formatPostDate, getPostCoverImage } from "@/lib/blog-editorial";
import type { BlogPost } from "@/lib/types";
import styles from "@/components/blog/EditorialBlog.module.css";

type EditorialBlogCardProps = {
  post: BlogPost;
};

export function EditorialBlogCard({ post }: EditorialBlogCardProps) {
  const coverImage = getPostCoverImage(post, "card");

  return (
    <article className={styles.blogCard}>
      <Link href={`/blog/${post.slug}`} className={styles.blogCardMedia}>
        {coverImage ? <img src={coverImage} alt={post.featuredImageAlt || post.title} loading="lazy" /> : null}
      </Link>

      <div className={styles.blogCardBody}>
        <div className={styles.categoryPills}>
          <span className={styles.categoryPill}>{post.primaryCategory || post.category}</span>
        </div>

        <h3 className={styles.blogCardTitle}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>

        <p className={styles.blogCardExcerpt}>{post.excerpt}</p>

        <div className={styles.metaRow}>
          <span>{formatPostDate(post.publishedAt)}</span>
          <span className={styles.metaDot} />
          <span>
            <Clock3 size={14} className={styles.iconMuted} aria-hidden="true" /> {post.readTime}
          </span>
        </div>

        <Link href={`/blog/${post.slug}`} className={styles.blogCardLink}>
          Read article
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
