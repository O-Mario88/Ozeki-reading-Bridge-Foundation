"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BlogPost } from "@/lib/types";

interface BlogIndexProps {
  posts: BlogPost[];
  categories: string[];
}

export function BlogIndex({ posts, categories }: BlogIndexProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesQuery =
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
      const matchesCategory = category === "all" || post.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, posts, query]);

  return (
    <section>
      <div className="filters blog-filters">
        <input
          placeholder="Search blog posts"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search blog posts"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="cards-grid">
        {filteredPosts.map((post) => (
          <article key={post.slug} className="card">
            <p className="meta-pill">{post.category}</p>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <p className="meta-line">
              {post.author} · {new Date(post.publishedAt).toLocaleDateString()} · {post.readTime}
            </p>
            <Link className="button button-ghost" href={`/blog/${post.slug}`}>
              Read article
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
