import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { formatPostDate, getPostCoverImage } from "@/lib/blog-editorial";
import type { BlogPost } from "@/lib/types";
import styles from "@/components/blog/EditorialBlog.module.css";

type ArticleSpotlightSidebarProps = {
  posts: BlogPost[];
  categories: string[];
  showCategoryExplorer?: boolean;
  showNewsletterBlock?: boolean;
};

export function ArticleSpotlightSidebar({
  posts,
  categories,
  showCategoryExplorer = false,
  showNewsletterBlock = false,
}: ArticleSpotlightSidebarProps) {
  if (posts.length === 0 && !showCategoryExplorer && !showNewsletterBlock) {
    return null;
  }

  return (
    <aside className={styles.sidebarBlock}>
      <p className={styles.sidebarLabel}>Spotlight</p>

      {posts.length > 0 ? (
        <div className={styles.spotlightList}>
          {posts.map((post) => {
            const image = getPostCoverImage(post, "thumb");
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.spotlightItem}>
                <div>
                  <p className={styles.spotlightMeta}>{post.primaryCategory || post.category}</p>
                  <p className={styles.spotlightTitle}>{post.title}</p>
                  <p className={styles.spotlightDate}>{formatPostDate(post.publishedAt)}</p>
                </div>
                <div className={styles.spotlightThumb}>
                  {image ? (
                    <img
                      src={image}
                      alt={post.featuredImageAlt || `${post.title} thumbnail`}
                      loading="lazy"
                    />
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {showCategoryExplorer ? (
        <div className={styles.categoryExplorer}>
          <p className={styles.sidebarLabel}>Categories</p>
          <ul className={styles.categoryExplorerList}>
            {categories.slice(0, 8).map((category) => (
              <li key={category}>
                <Link href={`/blog?category=${encodeURIComponent(category)}`} className={styles.categoryPill}>
                  <Compass size={14} aria-hidden="true" />
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showNewsletterBlock ? (
        <div className={styles.newsletterBox}>
          <p className={styles.sidebarLabel}>Updates</p>
          <p className={styles.spotlightTitle}>Get literacy insights in your inbox.</p>
          <Link href="/contact" className={styles.newsletterButton}>
            Join newsletter
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
