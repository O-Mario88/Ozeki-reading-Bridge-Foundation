"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { ArrowRight, Search, Clock3 } from "lucide-react";
import { EditorialBlogCard } from "@/components/blog/EditorialBlogCard";
import { formatPostDate, getPostCoverImage } from "@/lib/blog-editorial";
import type { BlogPost } from "@/lib/types";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";

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
      <div className="bg-brand-background min-h-screen">
        
        {/* Hero Banner */}
        <section className="relative overflow-hidden pt-24 pb-12 md:pt-32 md:pb-16 border-b border-gray-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-bold text-sm mb-6 shadow-sm border border-[#FA7D15]/20">
              Knowledge Hub
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-brand-primary tracking-tight leading-tight mb-6 w-full">
              Inspiring tales of transformation
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 w-full leading-relaxed">
              Practical literacy stories, implementation guidance, and field insights from schools,
              coaches, and learning teams.
            </p>
          </div>
        </section>

        <SectionWrapper theme="off-white" className="!pt-12 !pb-24">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start">
            
            <div className="flex-grow w-full lg:w-3/4">
              {/* Featured Article */}
              {featured ? (
                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-16"
                >
                  <PremiumCard className="overflow-hidden shadow-xl border-none">
                    <Link href={`/blog/${featured.slug}`} className="block relative h-64 md:h-96 w-full bg-gray-100 overflow-hidden group">
                      {featuredImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={featuredImage} 
                          alt={featured.featuredImageAlt || featured.title} 
                          loading="lazy" 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </Link>
                    
                    <div className="p-8 md:p-12 relative">
                      <div className="mb-4">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-sm font-bold tracking-wide uppercase shadow-sm">
                          {featured.primaryCategory || featured.category}
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-extrabold text-brand-primary mb-4 leading-tight">
                        <Link href={`/blog/${featured.slug}`} className="hover:text-brand-primary transition-colors">
                          {featured.title}
                        </Link>
                      </h2>
                      <p className="text-xl text-gray-600 leading-relaxed mb-8 w-full">
                        {featured.excerpt}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 font-medium">
                          <span className="text-gray-900 font-bold">{featured.author}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          <span>{formatPostDate(featured.publishedAt)}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          <span className="flex items-center gap-1.5">
                            <Clock3 size={16} /> {featured.readTime}
                          </span>
                        </div>
                        
                        <Link 
                          href={`/blog/${featured.slug}`} 
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
                        >
                          Read feature
                          <ArrowRight size={18} />
                        </Link>
                      </div>
                    </div>
                  </PremiumCard>
                </m.div>
              ) : null}

              {/* Stories Grid */}
              <div className="grid md:grid-cols-2 gap-8">
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
            </div>

            {/* Sidebar Tools */}
            <aside className="w-full lg:w-1/4 flex flex-col gap-8 shrink-0">
              <PremiumCard className="p-6">
                <div className="relative mb-8">
                  <input
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                    placeholder="Search articles..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search blog posts"
                  />
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="font-bold text-brand-primary mb-2 px-3 text-sm tracking-widest uppercase text-brand-primary">
                    Categories
                  </h3>
                  <button
                    type="button"
                    className={`text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      category === "all" 
                        ? "bg-brand-primary/10 text-brand-primary" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    onClick={() => setCategory("all")}
                  >
                    All Stories
                  </button>
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        category === item 
                          ? "bg-brand-primary/10 text-brand-primary" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </PremiumCard>

              <PremiumCard className="p-6 overflow-hidden">
                <h3 className="font-bold text-brand-primary mb-6 px-3 text-sm tracking-widest uppercase text-brand-primary">
                  Featured Reads
                </h3>
                <div className="flex flex-col gap-6">
                  {posts.slice(0, 5).map((post) => {
                    const spotlightImage = getPostCoverImage(post, "thumb");
                    return (
                      <Link key={post.slug} href={`/blog/${post.slug}`} className="flex gap-4 group">
                        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {spotlightImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={spotlightImage} 
                              alt={post.featuredImageAlt || post.title} 
                              loading="lazy" 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : null}
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="text-xs font-bold text-brand-primary mb-1 uppercase tracking-wide">
                            {post.primaryCategory || post.category}
                          </p>
                          <p className="text-sm font-bold text-gray-900 leading-tight group-hover:text-brand-primary transition-colors line-clamp-2">
                            {post.title}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </PremiumCard>
            </aside>

          </div>
        </SectionWrapper>
      </div>
    </LazyMotion>
  );
}
