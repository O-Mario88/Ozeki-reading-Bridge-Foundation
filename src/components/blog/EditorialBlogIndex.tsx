"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { EditorialBlogCard } from "@/components/blog/EditorialBlogCard";
import styles from "@/components/blog/EditorialBlog.module.css";
import { formatPostDate, getPostCoverImage } from "@/lib/blog-editorial";
import type { BlogPost } from "@/lib/types";

type EditorialBlogIndexProps = {
  posts: BlogPost[];
  categories: string[];
};

function matchesCategory(post: BlogPost, category: string) {
  if (category === "all") {
    return true;
  }
  const postCategories = [post.category, post.primaryCategory, ...(post.secondaryCategories ?? [])]
    .map((item) => item?.toLowerCase().trim())
    .filter(Boolean);
  return postCategories.includes(category.toLowerCase());
}

export function EditorialBlogIndex({ posts, categories }: EditorialBlogIndexProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("category");
    if (!requested) {
      return;
    }
    const match = categories.find((item) => item.toLowerCase() === requested.toLowerCase());
    if (match) {
      setCategory(match);
    }
  }, [categories]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const search = `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLowerCase();
      const matchesQuery = search.includes(query.toLowerCase().trim());
      return matchesQuery && matchesCategory(post, category);
    });
  }, [category, posts, query]);

  const featured = filteredPosts[0] ?? posts[0] ?? null;
  const cards = (featured ? filteredPosts.filter((post) => post.slug !== featured.slug) : filteredPosts).slice(
    0,
    12,
  );
  const featuredImage = featured ? getPostCoverImage(featured, "hero") : null;

  return (
    <LazyMotion features={domAnimation}>
      <div className={styles.blogRoot}>
        <section className={styles.blogSurface}>
          <div className={styles.blogContainer}>
            <header className={`${styles.blogIntro} orbf-fade-up`}>
              <p className={styles.blogIntroKicker}>Knowledge Hub</p>
              <h1 className={styles.blogIntroTitle}>Editorial Blog</h1>
              <p className={styles.blogIntroText}>
                Practical literacy stories, implementation guidance, and field insights from schools,
                coaches, and learning teams.
              </p>
            </header>

            <div className={styles.indexShell}>
              <section>
                {featured ? (
                  <m.article
                    className={styles.indexFeatured}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link href={`/blog/${featured.slug}`} className={styles.indexFeaturedMedia}>
                      {featuredImage ? (
                        <img src={featuredImage} alt={featured.featuredImageAlt || featured.title} loading="lazy" />
                      ) : null}
                    </Link>
                    <div className={styles.indexFeaturedBody}>
                      <div className={styles.categoryPills}>
                        <span className={styles.categoryPill}>{featured.primaryCategory || featured.category}</span>
                      </div>
                      <h2 className={styles.indexFeaturedTitle}>
                        <Link href={`/blog/${featured.slug}`}>{featured.title}</Link>
                      </h2>
                      <p className={styles.indexFeaturedExcerpt}>{featured.excerpt}</p>
                      <div className={styles.metaRow}>
                        <span>{featured.author}</span>
                        <span className={styles.metaDot} />
                        <span>{formatPostDate(featured.publishedAt)}</span>
                        <span className={styles.metaDot} />
                        <span>{featured.readTime}</span>
                      </div>
                      <Link href={`/blog/${featured.slug}`} className={styles.blogCardLink}>
                        Read feature
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </m.article>
                ) : null}

                <div className={styles.cardsGrid}>
                  {cards.map((post, index) => (
                    <m.div
                      key={post.slug}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.24, delay: Math.min(index * 0.03, 0.24) }}
                    >
                      <EditorialBlogCard post={post} />
                    </m.div>
                  ))}
                </div>
              </section>

              <aside className={styles.indexSidebar}>
                <section className={styles.indexFilters}>
                  <div className={styles.searchRow}>
                    <input
                      className={styles.searchInput}
                      placeholder="Search articles"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      aria-label="Search blog posts"
                    />
                    <Search size={16} className={styles.iconMuted} aria-hidden="true" />
                  </div>

                  <div className={styles.categoryTabs}>
                    <button
                      type="button"
                      className={`${styles.categoryTab} ${
                        category === "all" ? styles.categoryTabActive : ""
                      }`}
                      onClick={() => setCategory("all")}
                    >
                      All
                    </button>
                    {categories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`${styles.categoryTab} ${
                          category === item ? styles.categoryTabActive : ""
                        }`}
                        onClick={() => setCategory(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </section>

                <section className={styles.sidebarBlock}>
                  <p className={styles.sidebarLabel}>Featured Reads</p>
                  <div className={styles.spotlightList}>
                    {posts.slice(0, 5).map((post) => {
                      const spotlightImage = getPostCoverImage(post, "thumb");
                      return (
                        <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.spotlightItem}>
                          <div>
                            <p className={styles.spotlightMeta}>{post.primaryCategory || post.category}</p>
                            <p className={styles.spotlightTitle}>{post.title}</p>
                            <p className={styles.spotlightDate}>{formatPostDate(post.publishedAt)}</p>
                          </div>
                          <div className={styles.spotlightThumb}>
                            {spotlightImage ? (
                              <img src={spotlightImage} alt={post.featuredImageAlt || post.title} loading="lazy" />
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </LazyMotion>
  );
}
