"use client";

import { useMemo, useState, useEffect, type MouseEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorialArticleLayout } from "@/components/blog/EditorialArticleLayout";
import { blogPoppins } from "@/components/blog/blog-font";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { sanitizeInlineRichText, stripHtmlTags } from "@/lib/rich-text";
import type {
  BlogArticleType,
  BlogBodyBlock,
  BlogPost,
  BlogPostSection,
  PortalBlogPostRecord,
  PortalUser,
} from "@/lib/types";

type PortalBlogManagerProps = {
  initialPosts: PortalBlogPostRecord[];
  currentUser: PortalUser;
  initialCompose?: boolean;
};

type WorkflowStatus = "draft" | "published" | "scheduled";

type FormState = {
  id: number | null;
  title: string;
  subtitle: string;
  slug: string;
  excerpt: string;
  primaryCategory: string;
  secondaryCategoriesCsv: string;
  authorName: string;
  authorRole: string;
  authorBio: string;
  publishDate: string;
  readTimeOverrideMinutes: string;
  articleType: BlogArticleType;
  featuredImageUrl: string;
  featuredImageAlt: string;
  featuredImageCaption: string;
  featuredImageCredit: string;
  sidebarThumbnailUrl: string;
  bodyBlocks: BlogBodyBlock[];
  seoTitle: string;
  metaDescription: string;
  socialImageUrl: string;
  canonicalUrl: string;
  tagsCsv: string;
  workflowStatus: WorkflowStatus;
};

const ARTICLE_TYPE_OPTIONS: BlogArticleType[] = [
  "Blog Post",
  "Resource Article",
  "Thought Leadership",
  "Methodology Explainer",
  "Story Editorial",
  "Report Summary",
];



function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function parseCsv(value: string) {
  const seen = new Set<string>();
  const items: string[] = [];
  value.split(",").forEach((item) => {
    const next = item.trim();
    if (!next) {
      return;
    }
    const key = next.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    items.push(next);
  });
  return items;
}

function toCsv(items: string[] | undefined) {
  return (items ?? []).join(", ");
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function fromDateInputToIso(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  const parsed = new Date(`${trimmed}T08:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

type BodyBlockType = BlogBodyBlock["type"];

const BLOCK_FORMAT_OPTIONS = [
  { value: "P", label: "Normal" },
  { value: "H1", label: "Heading 1" },
  { value: "H2", label: "Heading 2" },
  { value: "H3", label: "Heading 3" },
] as const;

type BlockFormatValue = (typeof BLOCK_FORMAT_OPTIONS)[number]["value"];

function createBlock(type: BodyBlockType, index = 0): BlogBodyBlock {
  const baseId = `${type}-${Date.now()}-${Math.max(1, index + 1)}`;
  if (type === "heading2" || type === "heading3") {
    return { id: baseId, type, heading: "" };
  }
  if (type === "bullet_list" || type === "numbered_list") {
    return { id: baseId, type, items: [""] };
  }
  if (type === "image") {
    return { id: baseId, type, imageWidthStyle: "contained" };
  }
  if (type === "callout") {
    return { id: baseId, type, calloutTone: "neutral", calloutTitle: "", text: "" };
  }
  if (type === "stat") {
    return { id: baseId, type, statLabel: "", statValue: "", text: "" };
  }
  if (type === "cta_inline") {
    return { id: baseId, type, ctaLabel: "", ctaUrl: "" };
  }
  if (type === "quote") {
    return { id: baseId, type, text: "", quoteAttribution: "" };
  }
  if (type === "divider") {
    return { id: baseId, type };
  }
  return { id: baseId, type, text: "" };
}

function toInlineHtml(value: string | null | undefined) {
  return sanitizeInlineRichText(value).trim();
}

function plainText(value: string | null | undefined) {
  return stripHtmlTags(value).trim();
}

function sectionsFromBodyBlocks(blocks: BlogBodyBlock[]) {
  const sections: BlogPostSection[] = [];
  let currentHeading = "Overview";
  let currentParagraphs: string[] = [];

  const flush = () => {
    const cleaned = currentParagraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      return;
    }
    sections.push({
      heading: currentHeading,
      paragraphs: cleaned,
    });
    currentParagraphs = [];
  };

  blocks.forEach((block, index) => {
    if (block.type === "heading2" || block.type === "heading3") {
      flush();
      currentHeading = plainText(block.heading || block.text || "") || `Section ${index + 1}`;
      return;
    }

    if (block.type === "paragraph" || block.type === "quote" || block.type === "callout") {
      const text = plainText(block.text);
      if (text) {
        currentParagraphs.push(text);
      }
      return;
    }

    if (block.type === "bullet_list" || block.type === "numbered_list") {
      const listText = (block.items ?? [])
        .map((item, itemIndex) => {
          const clean = plainText(item);
          if (!clean) return "";
          return block.type === "numbered_list" ? `${itemIndex + 1}. ${clean}` : `• ${clean}`;
        })
        .filter(Boolean)
        .join("\n");
      if (listText) {
        currentParagraphs.push(listText);
      }
      return;
    }

    if (block.type === "stat") {
      const statLine = [plainText(block.statLabel), plainText(block.statValue)]
        .filter(Boolean)
        .join(": ");
      if (statLine) {
        currentParagraphs.push(statLine);
      }
      const text = plainText(block.text);
      if (text) {
        currentParagraphs.push(text);
      }
      return;
    }

    if (block.type === "image") {
      const caption = plainText(block.imageCaption);
      if (caption) {
        currentParagraphs.push(caption);
      }
      return;
    }

    if (block.type === "cta_inline") {
      const cta = plainText(block.ctaLabel);
      if (cta) {
        currentParagraphs.push(cta);
      }
    }
  });

  flush();
  return sections;
}

function wordsFromBlocks(blocks: BlogBodyBlock[]) {
  const text = blocks
    .flatMap((block) => {
      const pieces: string[] = [];
      if (block.heading) pieces.push(plainText(block.heading));
      if (block.text) pieces.push(plainText(block.text));
      if (Array.isArray(block.items)) pieces.push(block.items.map((item) => plainText(item)).join(" "));
      if (block.calloutTitle) pieces.push(plainText(block.calloutTitle));
      if (block.statLabel) pieces.push(plainText(block.statLabel));
      if (block.statValue) pieces.push(plainText(block.statValue));
      return pieces;
    })
    .join(" ");

  return text
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function inferReadTimeMinutes(blocks: BlogBodyBlock[]) {
  const words = wordsFromBlocks(blocks);
  return Math.max(1, Math.round(words / 220)) || 5;
}

function bodyBlocksToRichHtml(blocks: BlogBodyBlock[]) {
  const html = blocks.map((block) => {
    if (block.type === "heading2") {
      const heading = toInlineHtml(block.heading || block.text || "");
      return `<h2>${heading || "<br>"}</h2>`;
    }

    if (block.type === "heading3") {
      const heading = toInlineHtml(block.heading || block.text || "");
      return `<h3>${heading || "<br>"}</h3>`;
    }

    if (block.type === "paragraph") {
      const text = toInlineHtml(block.text);
      return `<p>${text || "<br>"}</p>`;
    }

    if (block.type === "bullet_list") {
      const items = (block.items ?? [])
        .map((item) => toInlineHtml(item))
        .filter((item) => plainText(item).length > 0);
      if (items.length === 0) {
        return "<ul><li><br></li></ul>";
      }
      return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    }

    if (block.type === "numbered_list") {
      const items = (block.items ?? [])
        .map((item) => toInlineHtml(item))
        .filter((item) => plainText(item).length > 0);
      if (items.length === 0) {
        return "<ol><li><br></li></ol>";
      }
      return `<ol>${items.map((item) => `<li>${item}</li>`).join("")}</ol>`;
    }

    if (block.type === "quote") {
      const quote = toInlineHtml(block.text);
      const attribution = toInlineHtml(block.quoteAttribution);
      if (!quote && !attribution) {
        return "<blockquote><p><br></p></blockquote>";
      }
      return `<blockquote><p>${quote || ""}</p>${attribution ? `<cite>${attribution}</cite>` : ""}</blockquote>`;
    }

    if (block.type === "image" && block.imageUrl?.trim()) {
      const url = block.imageUrl.trim().replace(/"/g, "&quot;");
      const alt = (block.imageAlt || "Inline article image").trim().replace(/"/g, "&quot;");
      const caption = toInlineHtml(block.imageCaption);
      return `<figure><img src="${url}" alt="${alt}" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
    }

    if (block.type === "callout") {
      const title = toInlineHtml(block.calloutTitle);
      const text = toInlineHtml(block.text);
      if (!title && !text) {
        return "<p><br></p>";
      }
      return `<p>${title ? `<strong>${title}</strong>${text ? "<br>" : ""}` : ""}${text || ""}</p>`;
    }

    if (block.type === "stat") {
      const label = toInlineHtml(block.statLabel);
      const value = toInlineHtml(block.statValue);
      const text = toInlineHtml(block.text);
      const lead = [label, value].filter(Boolean).join(label && value ? ": " : "");
      return `<p>${lead ? `<strong>${lead}</strong>${text ? "<br>" : ""}` : ""}${text || ""}</p>`;
    }

    if (block.type === "cta_inline") {
      const label = toInlineHtml(block.ctaLabel);
      const rawUrl = (block.ctaUrl || "").trim();
      const url = rawUrl.replace(/"/g, "&quot;");
      if (label && url) {
        return `<p><a href="${url}">${label}</a></p>`;
      }
      if (label) {
        return `<p>${label}</p>`;
      }
      return "<p><br></p>";
    }

    if (block.type === "divider") {
      return "<hr>";
    }

    return "<p><br></p>";
  }).join("");

  return html || "<p><br></p>";
}

const STRUCTURAL_BLOCK_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "section",
  "article",
  "ul",
  "ol",
  "blockquote",
  "figure",
  "img",
  "hr",
]);

function splitParagraphHtmlSegments(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, "<br>")
    .split(/(?:\s*<br>\s*){2,}/i)
    .map((segment) => segment.trim())
    .filter((segment) => plainText(segment).length > 0);
}

function richHtmlToBodyBlocks(value: string) {
  if (typeof DOMParser === "undefined") {
    const fallback = plainText(value);
    if (!fallback) {
      return [] as BlogBodyBlock[];
    }
    const fallbackBlock: BlogBodyBlock = {
      id: "rich-paragraph-1",
      type: "paragraph",
      text: toInlineHtml(fallback),
    };
    return [
      fallbackBlock,
    ];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${value}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) {
    return [] as BlogBodyBlock[];
  }

  let index = 0;
  const blocks: BlogBodyBlock[] = [];
  const pushBlock = (block: Omit<BlogBodyBlock, "id">) => {
    index += 1;
    blocks.push({ id: `rich-${block.type}-${index}`, ...block });
  };

  const pushParagraphsFromHtml = (html: string, allowEmptyParagraph: boolean) => {
    const sanitized = toInlineHtml(html);
    const segments = splitParagraphHtmlSegments(sanitized);
    if (segments.length > 0) {
      segments.forEach((segment) => {
        pushBlock({
          type: "paragraph",
          text: segment,
        });
      });
      return true;
    }
    if (allowEmptyParagraph) {
      pushBlock({
        type: "paragraph",
        text: "",
      });
      return true;
    }
    return false;
  };

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").replace(/\u00a0/g, " ");
      const segments = text
        .split(/\n{2,}/)
        .map((segment) => segment.trim())
        .filter(Boolean);
      segments.forEach((segment) => {
        pushBlock({ type: "paragraph", text: toInlineHtml(segment) });
      });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === "h1" || tag === "h2") {
      const heading = toInlineHtml(element.innerHTML);
      if (plainText(heading)) {
        pushBlock({
          type: "heading2",
          heading,
          hideFromToc: false,
        });
      }
      return;
    }

    if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
      const heading = toInlineHtml(element.innerHTML);
      if (plainText(heading)) {
        pushBlock({
          type: "heading3",
          heading,
          hideFromToc: false,
        });
      }
      return;
    }

    if (tag === "div" || tag === "article" || tag === "section") {
      const hasNestedStructuralChildren = Array.from(element.children).some((child) =>
        STRUCTURAL_BLOCK_TAGS.has(child.tagName.toLowerCase())
      );
      if (hasNestedStructuralChildren) {
        Array.from(element.childNodes).forEach(visit);
        return;
      }
      pushParagraphsFromHtml(element.innerHTML, false);
      return;
    }

    if (tag === "p") {
      pushParagraphsFromHtml(element.innerHTML, true);
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((child) => toInlineHtml((child as HTMLElement).innerHTML))
        .filter((item) => plainText(item).length > 0);
      if (items.length > 0) {
        pushBlock({
          type: tag === "ol" ? "numbered_list" : "bullet_list",
          items,
        });
      }
      return;
    }

    if (tag === "blockquote") {
      const clone = element.cloneNode(true) as HTMLElement;
      const attributionNode = clone.querySelector("cite, footer");
      const quoteAttribution = attributionNode ? plainText(attributionNode.innerHTML) : "";
      attributionNode?.remove();
      const text = toInlineHtml(clone.innerHTML);
      if (plainText(text)) {
        pushBlock({
          type: "quote",
          text,
          quoteAttribution: quoteAttribution || null,
        });
      }
      return;
    }

    if (tag === "hr") {
      pushBlock({ type: "divider" });
      return;
    }

    if (tag === "figure" || tag === "img") {
      const image = tag === "img" ? element : element.querySelector("img");
      const imageUrl = image?.getAttribute("src")?.trim();
      if (imageUrl) {
        const imageAlt = image?.getAttribute("alt")?.trim() || "Inline article image";
        const captionNode = tag === "figure" ? element.querySelector("figcaption") : null;
        const imageCaption = captionNode ? plainText(captionNode.innerHTML) : null;
        pushBlock({
          type: "image",
          imageUrl,
          imageAlt,
          imageCaption,
          imageWidthStyle: "contained",
        });
      }
      return;
    }

    Array.from(element.childNodes).forEach(visit);
  };

  Array.from(root.childNodes).forEach(visit);
  return blocks;
}

function sectionsToBodyBlocks(sections: BlogPostSection[]) {
  const blocks: BlogBodyBlock[] = [];
  sections.forEach((section, sectionIndex) => {
    blocks.push({
      id: `legacy-heading-${sectionIndex + 1}`,
      type: "heading2",
      heading: section.heading,
      hideFromToc: false,
    });
    section.paragraphs.forEach((paragraph, paragraphIndex) => {
      blocks.push({
        id: `legacy-paragraph-${sectionIndex + 1}-${paragraphIndex + 1}`,
        type: "paragraph",
        text: paragraph,
      });
    });
  });
  return blocks;
}

function toWorkflowStatus(post: PortalBlogPostRecord): WorkflowStatus {
  if (post.publishStatus === "published") {
    return "published";
  }
  const publishAt = new Date(post.publishedAt).getTime();
  if (Number.isFinite(publishAt) && publishAt > Date.now()) {
    return "scheduled";
  }
  return "draft";
}

function toFormState(post: PortalBlogPostRecord): FormState {
  const blocks = post.bodyBlocks && post.bodyBlocks.length > 0
    ? post.bodyBlocks
    : sectionsToBodyBlocks(post.sections);

  return {
    id: post.id,
    title: post.title,
    subtitle: post.subtitle ?? "",
    slug: post.slug,
    excerpt: post.excerpt,
    primaryCategory: post.primaryCategory || post.category,
    secondaryCategoriesCsv: toCsv(post.secondaryCategories),
    authorName: post.author,
    authorRole: post.role,
    authorBio: post.authorBio ?? "",
    publishDate: toDateInputValue(post.publishedAt),
    readTimeOverrideMinutes: post.readTimeMinutes ? String(post.readTimeMinutes) : "",
    articleType: post.articleType || "Blog Post",
    featuredImageUrl: post.featuredImageUrl || "",
    featuredImageAlt: post.featuredImageAlt || "",
    featuredImageCaption: post.featuredImageCaption || "",
    featuredImageCredit: post.featuredImageCredit || "",
    sidebarThumbnailUrl: post.mediaImageUrl || "",
    bodyBlocks: blocks,
    seoTitle: post.seoTitle || "",
    metaDescription: post.metaDescription || "",
    socialImageUrl: post.socialImageUrl || "",
    canonicalUrl: post.canonicalUrl || "",
    tagsCsv: toCsv(post.tags),
    workflowStatus: toWorkflowStatus(post),
  };
}

function toPreviewPost(form: FormState, autoReadMinutes: number): BlogPost {
  const publishIso = fromDateInputToIso(form.publishDate, new Date().toISOString());
  const readTimeMinutes = form.readTimeOverrideMinutes.trim()
    ? Math.max(1, Number.parseInt(form.readTimeOverrideMinutes, 10) || autoReadMinutes)
    : autoReadMinutes;

  return {
    slug: form.slug.trim() || slugify(form.title) || "preview-article",
    title: form.title || "Untitled article",
    subtitle: form.subtitle.trim() || undefined,
    excerpt: form.excerpt || "Preview excerpt",
    category: form.primaryCategory || "Blog",
    primaryCategory: form.primaryCategory || "Blog",
    secondaryCategories: parseCsv(form.secondaryCategoriesCsv),
    author: form.authorName || "Editorial Team",
    role: form.authorRole || "Program Team",
    authorBio: form.authorBio.trim() || undefined,
    publishedAt: publishIso,
    readTime: `${readTimeMinutes} min read`,
    tags: parseCsv(form.tagsCsv),
    sections: sectionsFromBodyBlocks(form.bodyBlocks),
    bodyBlocks: form.bodyBlocks,
    mediaImageUrl: form.sidebarThumbnailUrl.trim() || null,
    articleType: form.articleType,
    featuredImageUrl: form.featuredImageUrl.trim() || null,
    featuredImageAlt: form.featuredImageAlt.trim() || null,
    featuredImageCaption: form.featuredImageCaption.trim() || null,
    featuredImageCredit: form.featuredImageCredit.trim() || null,
    seoTitle: form.seoTitle.trim() || null,
    metaDescription: form.metaDescription.trim() || null,
    socialImageUrl: form.socialImageUrl.trim() || null,
    canonicalUrl: form.canonicalUrl.trim() || null,
    source: "portal",
    views: 0,
  };
}

function toBlogPost(record: PortalBlogPostRecord): BlogPost {
  return {
    slug: record.slug,
    title: record.title,
    subtitle: record.subtitle || undefined,
    excerpt: record.excerpt,
    category: record.category,
    primaryCategory: record.primaryCategory || record.category,
    secondaryCategories: record.secondaryCategories || [],
    author: record.author,
    role: record.role,
    publishedAt: record.publishedAt,
    readTime: record.readTime,
    tags: record.tags,
    sections: record.sections,
    bodyBlocks: record.bodyBlocks,
    mediaImageUrl: record.mediaImageUrl,
    articleType: record.articleType,
    featuredImageUrl: record.featuredImageUrl,
    featuredImageAlt: record.featuredImageAlt,
    featuredImageCaption: record.featuredImageCaption,
    featuredImageCredit: record.featuredImageCredit,
    authorBio: record.authorBio,
    seoTitle: record.seoTitle,
    metaDescription: record.metaDescription,
    socialImageUrl: record.socialImageUrl,
    canonicalUrl: record.canonicalUrl,
    source: "portal",
    views: 0,
  };
}

const INITIAL_FORM: FormState = {
  id: null,
  title: "",
  subtitle: "",
  slug: "",
  excerpt: "",
  primaryCategory: "",
  secondaryCategoriesCsv: "",
  authorName: "",
  authorRole: "",
  authorBio: "",
  publishDate: new Date().toISOString().slice(0, 10),
  readTimeOverrideMinutes: "",
  articleType: "Blog Post",
  featuredImageUrl: "",
  featuredImageAlt: "",
  featuredImageCaption: "",
  featuredImageCredit: "",
  sidebarThumbnailUrl: "",
  bodyBlocks: [createBlock("heading2"), createBlock("paragraph")],
  seoTitle: "",
  metaDescription: "",
  socialImageUrl: "",
  canonicalUrl: "",
  tagsCsv: "",
  workflowStatus: "draft",
};

function getWorkflowBadge(post: PortalBlogPostRecord) {
  if (post.publishStatus === "published") {
    return "published";
  }
  const publishAt = new Date(post.publishedAt).getTime();
  if (Number.isFinite(publishAt) && publishAt > Date.now()) {
    return "scheduled";
  }
  return "draft";
}

export function PortalBlogManager({
  initialPosts,
  currentUser: _currentUser,
  initialCompose = false,
}: PortalBlogManagerProps) {
  const [posts, setPosts] = useState<PortalBlogPostRecord[]>(initialPosts);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editorHtml, setEditorHtml] = useState(() => bodyBlocksToRichHtml(INITIAL_FORM.bodyBlocks));
  const [editorVersion, setEditorVersion] = useState(0);
  const [showComposer, setShowComposer] = useState(initialCompose);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Write your article content here...",
      }),
    ],
    content: bodyBlocksToRichHtml(INITIAL_FORM.bodyBlocks),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setEditorHtml(html);
      const nextBlocks = richHtmlToBodyBlocks(html);
      setForm((prev) => ({ ...prev, bodyBlocks: nextBlocks }));
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== editorHtml) {
      editor.commands.setContent(editorHtml);
    }
  }, [editorVersion, editor, editorHtml]);

  const isEditing = form.id !== null;

  const autoReadTimeMinutes = useMemo(() => inferReadTimeMinutes(form.bodyBlocks), [form.bodyBlocks]);
  const previewPost = useMemo(() => toPreviewPost(form, autoReadTimeMinutes), [form, autoReadTimeMinutes]);

  const previewPosts = useMemo(() => {
    const existing = posts.map(toBlogPost);
    const withoutCurrent = existing.filter((post) => post.slug !== previewPost.slug);
    return [previewPost, ...withoutCurrent];
  }, [posts, previewPost]);

  const categoryOptions = useMemo(() => {
    return [...new Set(posts.map((post) => post.primaryCategory || post.category).filter(Boolean))].sort();
  }, [posts]);

  const authorOptions = useMemo(() => {
    const options = new Set<string>();
    posts.forEach((post) => {
      options.add(post.author);
    });
    return [...options].sort();
  }, [posts]);

  const roleOptions = useMemo(() => {
    const options = new Set<string>();
    posts.forEach((post) => {
      options.add(post.role);
    });
    return [...options].sort();
  }, [posts]);

  function loadEditorFromBlocks(blocks: BlogBodyBlock[]) {
    setEditorHtml(bodyBlocksToRichHtml(blocks));
    setEditorVersion((value) => value + 1);
  }

  function resetComposer() {
    setForm(INITIAL_FORM);
    loadEditorFromBlocks(INITIAL_FORM.bodyBlocks);
    setSlugTouched(false);
    setError("");
    setMessage("");
  }

  function handleEdit(post: PortalBlogPostRecord) {
    const nextForm = toFormState(post);
    setShowComposer(true);
    setForm(nextForm);
    loadEditorFromBlocks(nextForm.bodyBlocks);
    setSlugTouched(true);
    setError("");
    setMessage("");
    setPreviewOpen(true);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTitleChange(value: string) {
    setForm((prev) => {
      const next: FormState = { ...prev, title: value };
      if (!slugTouched) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function runRichCommand(command: string) {
    if (!editor) return;

    if (command === "bold") editor.chain().focus().toggleBold().run();
    if (command === "italic") editor.chain().focus().toggleItalic().run();
    if (command === "underline") editor.chain().focus().toggleUnderline().run();
    if (command === "strikeThrough") editor.chain().focus().toggleStrike().run();
    if (command === "insertUnorderedList") editor.chain().focus().toggleBulletList().run();
    if (command === "insertOrderedList") editor.chain().focus().toggleOrderedList().run();
    if (command === "undo") editor.chain().focus().undo().run();
    if (command === "redo") editor.chain().focus().redo().run();
    if (command === "removeFormat") editor.chain().focus().unsetAllMarks().clearNodes().run();
  }

  function handleToolbarMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function applyBlockFormat(format: BlockFormatValue) {
    if (!editor) return;

    if (format === "P") {
      editor.chain().focus().setParagraph().run();
    } else if (format === "H2") {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (format === "H3") {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
  }



  async function uploadImage(file: File, key: string) {
    setUploadingKey(key);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/portal/blog/media", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Image upload failed.");
      }
      return data.url;
    } finally {
      setUploadingKey(null);
    }
  }

  async function uploadAndSetImage(file: File, field: keyof FormState) {
    try {
      const url = await uploadImage(file, String(field));
      updateForm(field, url as FormState[keyof FormState]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    }
  }

  function validateBeforeSave(targetStatus: WorkflowStatus) {
    if (form.title.trim().length < 3) {
      throw new Error("Article title must be at least 3 characters.");
    }
    if (form.excerpt.trim().length < 10) {
      throw new Error("Excerpt is required and should be at least 10 characters.");
    }
    if (form.primaryCategory.trim().length < 2) {
      throw new Error("Primary category is required.");
    }
    if (form.authorName.trim().length < 2) {
      throw new Error("Author name is required.");
    }
    if (!form.featuredImageUrl.trim()) {
      throw new Error("Featured image is required.");
    }
    if (form.featuredImageUrl.trim() && !form.featuredImageAlt.trim()) {
      throw new Error("Featured image alt text is required.");
    }

    const imageBlockWithoutAlt = form.bodyBlocks.find(
      (block) => block.type === "image" && block.imageUrl?.trim() && !block.imageAlt?.trim(),
    );
    if (imageBlockWithoutAlt) {
      throw new Error("Every inline image block must include alt text.");
    }

    if (form.bodyBlocks.length === 0) {
      throw new Error("Add at least one body block.");
    }

    if (!form.slug.trim()) {
      throw new Error("Article slug is required (check Advanced Settings).");
    }
    if (!form.publishDate.trim()) {
      throw new Error("Publish date is required (check Advanced Settings).");
    }
    if (form.authorRole.trim().length < 2) {
      throw new Error("Author role is required (check Advanced Settings).");
    }



    if (targetStatus === "scheduled") {
      const publishIso = fromDateInputToIso(form.publishDate, new Date().toISOString());
      if (new Date(publishIso).getTime() <= Date.now()) {
        throw new Error("Scheduled articles must have a future publish date.");
      }
    }
  }

  async function savePost(targetStatus: WorkflowStatus) {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      validateBeforeSave(targetStatus);

      const publishIso = fromDateInputToIso(form.publishDate, new Date().toISOString());
      const readTimeMinutes = form.readTimeOverrideMinutes.trim()
        ? Math.max(1, Number.parseInt(form.readTimeOverrideMinutes, 10) || autoReadTimeMinutes)
        : autoReadTimeMinutes;

      const normalizedBlocks = form.bodyBlocks.map((block, index) => ({
        ...block,
        id: block.id || `block-${index + 1}`,
        text: toInlineHtml(block.text) || null,
        heading: toInlineHtml(block.heading) || null,
        items: (block.items ?? []).map((item) => toInlineHtml(item)).filter((item) => plainText(item).length > 0),
        quoteAttribution: toInlineHtml(block.quoteAttribution) || null,
        imageUrl: block.imageUrl?.trim() || null,
        imageAlt: plainText(block.imageAlt) || null,
        imageCaption: plainText(block.imageCaption) || null,
        imageCredit: plainText(block.imageCredit) || null,
        calloutTitle: toInlineHtml(block.calloutTitle) || null,
        statLabel: toInlineHtml(block.statLabel) || null,
        statValue: toInlineHtml(block.statValue) || null,
        ctaLabel: toInlineHtml(block.ctaLabel) || null,
        ctaUrl: block.ctaUrl?.trim() || null,
        tocLabel: plainText(block.tocLabel) || null,
      }));

      const payload = {
        action: "save" as const,
        id: form.id ?? undefined,
        slug: form.slug.trim() || undefined,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        excerpt: form.excerpt.trim(),
        category: form.primaryCategory.trim(),
        author: form.authorName.trim(),
        role: form.authorRole.trim(),
        publishedAt: publishIso,
        readTime: `${readTimeMinutes} min read`,
        readTimeMinutes,
        tags: parseCsv(form.tagsCsv),
        sections: sectionsFromBodyBlocks(normalizedBlocks),
        bodyBlocks: normalizedBlocks,
        mediaImageUrl: form.sidebarThumbnailUrl.trim() || undefined,
        mediaVideoUrl: undefined,
        articleType: form.articleType,
        featuredImageUrl: form.featuredImageUrl.trim() || undefined,
        featuredImageAlt: form.featuredImageAlt.trim() || undefined,
        featuredImageCaption: form.featuredImageCaption.trim() || undefined,
        featuredImageCredit: form.featuredImageCredit.trim() || undefined,
        primaryCategory: form.primaryCategory.trim(),
        secondaryCategories: parseCsv(form.secondaryCategoriesCsv),
        authorBio: form.authorBio.trim() || undefined,
        seoTitle: form.seoTitle.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
        socialImageUrl: form.socialImageUrl.trim() || undefined,
        canonicalUrl: form.canonicalUrl.trim() || undefined,
        publishStatus: targetStatus === "published" ? "published" : "draft",
      };

      const response = await fetch("/api/portal/blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; post?: PortalBlogPostRecord };
      if (!response.ok || !data.post) {
        throw new Error(data.error ?? "Could not save blog post.");
      }

      const savedPost = data.post;
      setPosts((prev) => {
        const next = [...prev];
        const index = next.findIndex((item) => item.id === savedPost.id);
        if (index >= 0) {
          next[index] = savedPost;
        } else {
          next.unshift(savedPost);
        }
        return next.sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        );
      });

      const nextForm = toFormState(savedPost);
      setForm(nextForm);
      loadEditorFromBlocks(nextForm.bodyBlocks);
      setSlugTouched(true);
      if (targetStatus === "published") {
        setMessage("Article published.");
      } else if (targetStatus === "scheduled") {
        setMessage("Article scheduled as draft with a future publish date.");
      } else {
        setMessage("Draft saved.");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save blog post.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(postId: number, status: "publish" | "unpublish") {
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/portal/blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: status,
          postId,
        }),
      });
      const data = (await response.json()) as { error?: string; post?: PortalBlogPostRecord };
      if (!response.ok || !data.post) {
        throw new Error(data.error ?? "Could not update publish status.");
      }
      const updatedPost = data.post;
      setPosts((prev) => prev.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
      if (form.id === updatedPost.id) {
        const nextForm = toFormState(updatedPost);
        setForm(nextForm);
        loadEditorFromBlocks(nextForm.bodyBlocks);
      }
      setMessage(status === "publish" ? "Post published." : "Post moved to draft.");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Could not update status.");
    }
  }

  async function deletePost(postId: number) {
    if (typeof window !== "undefined" && !window.confirm("Delete this blog post permanently?")) {
      return;
    }
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/portal/blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          postId,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete blog post.");
      }
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      if (form.id === postId) {
        resetComposer();
      }
      setMessage("Blog post deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete blog post.");
    }
  }

  const saveDisabled = saving || uploadingKey !== null;

  return (
    <div className="portal-grid">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Blog Editorial Manager</h2>
            <p className="portal-muted" style={{ maxWidth: "72ch" }}>
              Structured editor for premium editorial blog layouts. This form captures all fields for
              header variants, featured media, paste-once rich body content, TOC, spotlight sidebar, gradient CTA,
              and SEO metadata.
            </p>
          </div>
          <div className="action-row">
            <button
              type="button"
              className={showComposer ? "button button-ghost" : "button"}
              onClick={() => setShowComposer((value) => !value)}
            >
              {showComposer ? "Hide Editor" : "+ New Blog Post"}
            </button>
            <a className="button button-ghost" href="/blog" target="_blank" rel="noreferrer">
              View Public Blog
            </a>
          </div>
        </div>

        {message ? (
          <p style={{ marginTop: "0.8rem", color: "var(--md-sys-color-primary)", fontWeight: 600 }}>
            {message}
          </p>
        ) : null}
        {error ? (
          <p style={{ marginTop: "0.8rem", color: "var(--md-sys-color-error)", fontWeight: 600 }}>
            {error}
          </p>
        ) : null}
      </section>

      {showComposer ? (
        <>
          <section className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>{isEditing ? "Edit Article" : "Create Article"}</h3>
              <div className="action-row">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setPreviewOpen((value) => !value)}
                >
                  {previewOpen ? "Hide Preview" : "Show Preview"}
                </button>
              </div>
            </div>

            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void savePost(form.workflowStatus);
              }}
            >
              <h4 className="full-width" style={{ margin: "0.4rem 0" }}>
                A) Basic Article Information
              </h4>

              <label>
                Article Title *
                <input
                  required
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Large editorial title"
                />
              </label>

              <label className="full-width">
                Excerpt / Summary *
                <textarea
                  required
                  rows={3}
                  value={form.excerpt}
                  onChange={(event) => updateForm("excerpt", event.target.value)}
                  placeholder="Summary used on listing cards and metadata"
                />
              </label>

              <label>
                Primary Category *
                <input
                  required
                  list="blog-category-options"
                  value={form.primaryCategory}
                  onChange={(event) => updateForm("primaryCategory", event.target.value)}
                  placeholder="Literacy"
                />
              </label>

              <label>
                Author Name *
                <input
                  required
                  list="blog-author-options"
                  value={form.authorName}
                  onChange={(event) => updateForm("authorName", event.target.value)}
                  placeholder="Author name"
                />
              </label>

              <label className="full-width" style={{ marginTop: "0.5rem" }}>
                Featured Image (Upload) *
                <div style={{ display: "grid", gap: "0.45rem" }}>
                  {form.featuredImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.featuredImageUrl} alt="Featured preview" style={{ maxHeight: "120px", borderRadius: "6px", objectFit: "contain", background: "var(--md-sys-color-surface-container)", justifySelf: "start" }} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadAndSetImage(file, "featuredImageUrl");
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                  {form.featuredImageUrl && (
                    <button type="button" className="button button-ghost" style={{ justifySelf: "start", fontSize: "0.8rem", padding: "0.2rem 0.5rem" }} onClick={() => updateForm("featuredImageUrl", "")}>Remove Image</button>
                  )}
                </div>
              </label>

              <label className="full-width">
                Featured Image Alt *
                <input
                  required={Boolean(form.featuredImageUrl.trim())}
                  value={form.featuredImageAlt}
                  onChange={(event) => updateForm("featuredImageAlt", event.target.value)}
                  placeholder="Describe the image"
                />
              </label>

              <h4 className="full-width" style={{ margin: "1rem 0 0.2rem" }}>
                B) Article Body Content
              </h4>


              <div className="full-width card" style={{ padding: "0.9rem", display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", flexWrap: "wrap" }}>
                  <p style={{ margin: 0, fontWeight: 700, color: "var(--md-sys-color-on-surface)" }}>
                    Paste-Once Rich Editor
                  </p>
                  <p className="portal-muted" style={{ margin: 0 }}>
                    {form.bodyBlocks.length} body block{form.bodyBlocks.length === 1 ? "" : "s"} mapped •{" "}
                    {wordsFromBlocks(form.bodyBlocks).toLocaleString()} words
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                    alignItems: "center",
                    paddingBottom: "0.4rem",
                    borderBottom: "1px solid var(--md-sys-color-outline-variant)",
                  }}
                >
                  {BLOCK_FORMAT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="button button-ghost"
                      style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem" }}
                      onMouseDown={handleToolbarMouseDown}
                      onClick={() => applyBlockFormat(option.value as BlockFormatValue)}
                    >
                      {option.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem", minWidth: "2.25rem" }}
                    onMouseDown={handleToolbarMouseDown}
                    onClick={() => runRichCommand("bold")}
                    aria-label="Bold"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem", minWidth: "2.25rem" }}
                    onMouseDown={handleToolbarMouseDown}
                    onClick={() => runRichCommand("italic")}
                    aria-label="Italic"
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem", minWidth: "2.25rem" }}
                    onMouseDown={handleToolbarMouseDown}
                    onClick={() => runRichCommand("underline")}
                    aria-label="Underline"
                  >
                    <span style={{ textDecoration: "underline" }}>U</span>
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem", minWidth: "2.25rem" }}
                    onMouseDown={handleToolbarMouseDown}
                    onClick={() => runRichCommand("strikeThrough")}
                    aria-label="Strikethrough"
                  >
                    <span style={{ textDecoration: "line-through" }}>S</span>
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem" }}
                    onMouseDown={handleToolbarMouseDown}
                    onClick={() => runRichCommand("insertUnorderedList")}
                  >
                    Bullets
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem" }}
                    onMouseDown={handleToolbarMouseDown}
                    onClick={() => runRichCommand("insertOrderedList")}
                  >
                    Numbering
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem" }}
                    onMouseDown={handleToolbarMouseDown}
                    onClick={() => runRichCommand("removeFormat")}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem" }}
                    onMouseDown={handleToolbarMouseDown}
                    onClick={() => runRichCommand("undo")}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.33rem 0.58rem" }}
                    onMouseDown={handleToolbarMouseDown}
                    onClick={() => runRichCommand("redo")}
                  >
                    Redo
                  </button>
                </div>

                <div
                  className="tiptap-editor-container"
                  style={{
                    minHeight: "22rem",
                    padding: "0.9rem",
                    borderRadius: "14px",
                    border: "1px solid var(--md-sys-color-outline-variant)",
                    background: "var(--md-sys-color-surface-container-lowest)",
                    lineHeight: 1.6,
                    fontSize: "1rem",
                    color: "var(--md-sys-color-on-surface)",
                    overflowWrap: "anywhere",
                  }}
                >
                  <EditorContent editor={editor} />
                </div>

                <p className="portal-muted" style={{ margin: 0, fontSize: "0.78rem" }}>
                  Paste your full blog content once, then edit with the toolbar (bold, italic, headings,
                  bullets, and numbering). The editor auto-maps content to your live blog layout.
                </p>
              </div>


              <div className="full-width" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                >
                  {showAdvanced ? "[-]" : "[+]"} Advanced Settings
                </button>
              </div>

              {showAdvanced ? (
                <>
                  <h4 className="full-width" style={{ margin: "1rem 0 0.2rem", paddingTop: "1rem", borderTop: "1px solid var(--md-sys-color-outline-variant)" }}>
                    C) Advanced Header / Settings
                  </h4>

                  <label className="full-width">
                    Subtitle / Dek
                    <textarea
                      rows={2}
                      value={form.subtitle}
                      onChange={(event) => updateForm("subtitle", event.target.value)}
                      placeholder="Optional subtitle shown beneath title"
                    />
                  </label>

                  <label>
                    Slug *
                    <input
                      required
                      value={form.slug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        updateForm("slug", slugify(event.target.value));
                      }}
                      placeholder="article-slug"
                    />
                  </label>

                  <label>
                    Read Time (auto: {autoReadTimeMinutes} min)
                    <input
                      type="number"
                      min={1}
                      value={form.readTimeOverrideMinutes}
                      onChange={(event) => updateForm("readTimeOverrideMinutes", event.target.value)}
                      placeholder="Leave blank for auto"
                    />
                  </label>

                  <label>
                    Publish Date *
                    <input
                      type="date"
                      required
                      value={form.publishDate}
                      onChange={(event) => updateForm("publishDate", event.target.value)}
                    />
                  </label>

                  <label>
                    Article Type
                    <select
                      value={form.articleType}
                      onChange={(event) => updateForm("articleType", event.target.value as BlogArticleType)}
                    >
                      {ARTICLE_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Workflow Status
                    <select
                      value={form.workflowStatus}
                      onChange={(event) => updateForm("workflowStatus", event.target.value as WorkflowStatus)}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </label>

                  <label>
                    Secondary Categories
                    <input
                      value={form.secondaryCategoriesCsv}
                      onChange={(event) => updateForm("secondaryCategoriesCsv", event.target.value)}
                      placeholder="Education, Resources"
                    />
                  </label>

                  <label>
                    Author Role *
                    <input
                      required
                      list="blog-role-options"
                      value={form.authorRole}
                      onChange={(event) => updateForm("authorRole", event.target.value)}
                      placeholder="Author role/title"
                    />
                  </label>

                  <label className="full-width">
                    Author Bio
                    <textarea
                      rows={3}
                      value={form.authorBio}
                      onChange={(event) => updateForm("authorBio", event.target.value)}
                      placeholder="Short author biography"
                    />
                  </label>

                  <label>
                    Featured Image Caption
                    <input
                      value={form.featuredImageCaption}
                      onChange={(event) => updateForm("featuredImageCaption", event.target.value)}
                      placeholder="Optional caption"
                    />
                  </label>

                  <label>
                    Featured Image Credit
                    <input
                      value={form.featuredImageCredit}
                      onChange={(event) => updateForm("featuredImageCredit", event.target.value)}
                      placeholder="Source / credit"
                    />
                  </label>

                  <label className="full-width">
                    Sidebar Thumbnail (Optional)
                    <div style={{ display: "grid", gap: "0.45rem" }}>
                      {form.sidebarThumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.sidebarThumbnailUrl} alt="Thumbnail preview" style={{ maxHeight: "120px", borderRadius: "6px", objectFit: "contain", background: "var(--md-sys-color-surface-container)", justifySelf: "start" }} />
                  )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadAndSetImage(file, "sidebarThumbnailUrl");
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                  {form.sidebarThumbnailUrl && (
                    <button type="button" className="button button-ghost" style={{ justifySelf: "start", fontSize: "0.8rem", padding: "0.2rem 0.5rem" }} onClick={() => updateForm("sidebarThumbnailUrl", "")}>Remove Image</button>
                  )}
                    </div>
                  </label>

                  <h4 className="full-width" style={{ margin: "1rem 0 0.2rem" }}>
                    D) SEO / Social Overrides
                  </h4>

                  <label className="full-width">
                    Tags (comma-separated)
                    <input
                      value={form.tagsCsv}
                      onChange={(event) => updateForm("tagsCsv", event.target.value)}
                      placeholder="literacy, coaching, advocacy"
                    />
                  </label>

                  <label className="full-width">
                    SEO Title
                    <input
                      value={form.seoTitle}
                      onChange={(event) => updateForm("seoTitle", event.target.value)}
                      placeholder="Optional SEO title"
                    />
                  </label>

                  <label className="full-width">
                    Meta Description
                    <textarea
                      rows={2}
                      value={form.metaDescription}
                      onChange={(event) => updateForm("metaDescription", event.target.value)}
                      placeholder="Optional meta description"
                    />
                  </label>

                  <label className="full-width">
                    Social Share Image
                    <div style={{ display: "grid", gap: "0.45rem" }}>
                      {form.socialImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.socialImageUrl} alt="Social share preview" style={{ maxHeight: "120px", borderRadius: "6px", objectFit: "contain", background: "var(--md-sys-color-surface-container)", justifySelf: "start" }} />
                  )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadAndSetImage(file, "socialImageUrl");
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                  {form.socialImageUrl && (
                    <button type="button" className="button button-ghost" style={{ justifySelf: "start", fontSize: "0.8rem", padding: "0.2rem 0.5rem" }} onClick={() => updateForm("socialImageUrl", "")}>Remove Image</button>
                  )}
                    </div>
                  </label>

                  <label className="full-width">
                    Canonical URL
                    <input
                      value={form.canonicalUrl}
                      onChange={(event) => updateForm("canonicalUrl", event.target.value)}
                      placeholder="https://example.com/blog/..."
                    />
                  </label>
                </>
              ) : null}

              <div className="action-row full-width" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--md-sys-color-outline-variant)" }}>
                {error ? (
                  <p className="full-width" style={{ color: "var(--md-sys-color-error)", margin: "0 0 0.5rem 0", fontWeight: 600 }}>
                    {error}
                  </p>
                ) : null}
                <button type="button" className="button button-ghost" onClick={resetComposer} disabled={saveDisabled}>
                  Reset
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  disabled={saveDisabled}
                  onClick={() => {
                    void savePost("draft");
                  }}
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  disabled={saveDisabled}
                  onClick={() => {
                    void savePost("scheduled");
                  }}
                >
                  {saving ? "Scheduling..." : "Schedule"}
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={saveDisabled}
                  onClick={() => {
                    void savePost("published");
                  }}
                >
                  {saving ? "Publishing..." : "Publish"}
                </button>
              </div>

              <p className="portal-muted full-width" style={{ margin: 0 }}>
                Upload status: {uploadingKey ? `uploading ${uploadingKey}...` : "idle"}
              </p>
            </form>

            <datalist id="blog-category-options">
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>

            <datalist id="blog-author-options">
              {authorOptions.map((author) => (
                <option key={author} value={author} />
              ))}
            </datalist>

            <datalist id="blog-role-options">
              {roleOptions.map((role) => (
                <option key={role} value={role} />
              ))}
            </datalist>
          </section>

          {previewOpen ? (
            <section className="card">
              <h3 style={{ marginTop: 0 }}>G) Live Preview</h3>
              <p className="portal-muted">
                Preview uses the same editorial frontend layout components and mapped schema fields.
              </p>
              <div className={blogPoppins.className}>
                <EditorialArticleLayout post={previewPost} allPosts={previewPosts} previewMode />
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="card" style={{ overflow: "auto" }}>
        <DashboardListHeader template="minmax(0,2fr) 130px minmax(0,1fr) 110px 120px minmax(0,1.4fr)">
          <span>Title</span>
          <span>Category</span>
          <span>Author</span>
          <span>Status</span>
          <span>Publish Date</span>
          <span>Actions</span>
        </DashboardListHeader>
        {posts.length === 0 ? (
          <div className="py-3">No blog posts yet.</div>
        ) : (
          posts.map((post) => (
            <DashboardListRow
              key={post.id}
              template="minmax(0,2fr) 130px minmax(0,1fr) 110px 120px minmax(0,1.4fr)"
            >
              <span className="min-w-0">
                <strong className="block truncate">{post.title}</strong>
                <span className="portal-muted block truncate" style={{ fontSize: "0.78rem" }}>
                  /blog/{post.slug}
                </span>
              </span>
              <span className="truncate">{post.primaryCategory || post.category}</span>
              <span className="min-w-0">
                <span className="block truncate">{post.author}</span>
                <span className="portal-muted block truncate" style={{ fontSize: "0.78rem" }}>
                  {post.role}
                </span>
              </span>
              <span>{getWorkflowBadge(post)}</span>
              <span>{new Date(post.publishedAt).toLocaleDateString("en-GB")}</span>
              <span>
                <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                    onClick={() => handleEdit(post)}
                  >
                    Edit
                  </button>
                  <a
                    className="button button-ghost"
                    style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                  {post.publishStatus === "draft" ? (
                    <button
                      type="button"
                      className="button"
                      style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                      onClick={() => {
                        void changeStatus(post.id, "publish");
                      }}
                    >
                      Publish
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button-ghost"
                      style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                      onClick={() => {
                        void changeStatus(post.id, "unpublish");
                      }}
                    >
                      Unpublish
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.25rem 0.5rem",
                      color: "var(--md-sys-color-error)",
                    }}
                    onClick={() => {
                      void deletePost(post.id);
                    }}
                  >
                    Delete
                  </button>
                </span>
              </span>
            </DashboardListRow>
          ))
        )}
      </section>
    </div>
  );
}
