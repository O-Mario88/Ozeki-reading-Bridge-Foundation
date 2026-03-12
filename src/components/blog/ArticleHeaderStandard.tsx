import { CircleDot } from "lucide-react";
import styles from "@/components/blog/EditorialBlog.module.css";
import { getPostCoverImage } from "@/lib/blog-editorial";
import type { BlogPost } from "@/lib/types";

type ArticleHeaderStandardProps = {
  post: BlogPost;
  categories: string[];
};

export function ArticleHeaderStandard({
  post,
  categories,
}: ArticleHeaderStandardProps) {
  const coverImage = getPostCoverImage(post, "hero");

  return (
    <header className={styles.articleHeader}>
      <div className={styles.headerTopGrid}>
        <div className={styles.headerMainContent}>
          <div className={styles.breadcrumbRow}>
            {categories.map((category) => (
              <span key={category} className={styles.headerCategoryTag}>
                <CircleDot size={13} aria-hidden="true" />
                {category}
              </span>
            ))}
          </div>

          <h1 className={styles.editorialTitle}>{post.title}</h1>
          {post.subtitle ? <p className={styles.editorialSubtitle}>{post.subtitle}</p> : null}
        </div>
      </div>

      {coverImage ? (
        <figure className={styles.featuredFigure}>
          <div className={styles.featuredMedia}>
            <img src={coverImage} alt={post.featuredImageAlt || post.title} />
          </div>
          {post.featuredImageCaption || post.featuredImageCredit ? (
            <figcaption className={styles.caption}>
              {post.featuredImageCaption || ""}
              {post.featuredImageCaption && post.featuredImageCredit ? " · " : ""}
              {post.featuredImageCredit || ""}
            </figcaption>
          ) : null}
        </figure>
      ) : null}
    </header>
  );
}
