import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { formatPostDate, getPostCoverImage } from "@/lib/blog-editorial";
import type { BlogPost } from "@/lib/types";
import { PremiumCard } from "@/components/public/PremiumCard";

import Image from "next/image";

type EditorialBlogCardProps = {
  post: BlogPost;
};

export function EditorialBlogCard({ post }: EditorialBlogCardProps) {
  const coverImage = getPostCoverImage(post, "card");

  return (
    <PremiumCard className="flex flex-col h-full overflow-hidden group border-none shadow-sm hover:shadow-xl transition-all duration-300" withHover={false}>
      <Link href={`/blog/${post.slug}`} className="relative h-56 w-full overflow-hidden block bg-brand-primary/5">
        {coverImage ? (
          <Image 
            src={coverImage} 
            alt={post.featuredImageAlt || post.title} 
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
      </Link>

      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold tracking-wide uppercase">
            {post.primaryCategory || post.category}
          </span>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-brand-primary transition-colors line-clamp-2">
          <Link href={`/blog/${post.slug}`} className="focus:outline-none">
            {post.title}
          </Link>
        </h3>

        <p className="text-gray-600 mb-6 line-clamp-3 text-sm flex-grow">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium tracking-wide">
            <span>{formatPostDate(post.publishedAt)}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} /> {post.readTime}
            </span>
          </div>

          <Link 
            href={`/blog/${post.slug}`} 
            className="text-brand-primary flex items-center gap-1 font-semibold text-sm group-hover:translate-x-1 transition-transform"
          >
            Read <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </PremiumCard>
  );
}
