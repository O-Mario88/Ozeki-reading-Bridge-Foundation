export type ResourceGrade =
  | "Nursery"
  | "P1-P2"
  | "P3-P4"
  | "P5-P7"
  | "All Primary";

export type ResourceSkill =
  | "Phonics"
  | "Fluency"
  | "Comprehension"
  | "Assessment"
  | "Remedial"
  | "Writing";

export type ResourceType =
  | "Toolkit"
  | "Lesson Plan"
  | "Assessment"
  | "Poster"
  | "Guide"
  | "Reader";

export interface Program {
  id: number;
  title: string;
  summary: string;
  focusAreas: string[];
  outputs: string[];
  outcome: string;
}

export interface ResourceItem {
  slug: string;
  title: string;
  description: string;
  grade: ResourceGrade;
  skill: ResourceSkill;
  type: ResourceType;
  filePath: string;
}

export interface BlogSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  role: string;
  publishedAt: string;
  readTime: string;
  tags: string[];
  sections: BlogSection[];
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export interface CaseStudy {
  slug: string;
  school: string;
  district: string;
  challenge: string;
  intervention: string[];
  results: string[];
  testimonial: string;
}

export interface Partner {
  name: string;
  note: string;
}
