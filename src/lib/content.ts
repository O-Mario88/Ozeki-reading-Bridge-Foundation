import {
  BlogPost,
  CaseStudy,
  Partner,
  Program,
  ResourceItem,
  Testimonial,
} from "@/lib/types";

export const organizationName = "Ozeki Reading Bridge Foundation";

export const tagline =
  "Practical Phonics. Strong Teachers. Confident Readers.";

export const vision =
  "We empower teachers to build confident readers and transform Africa through literacy.";

export const mission =
  "To equip teachers and schools with practical, evidence-based methods and resources that help children read fluently, understand what they read, and express themselves through writing.";

export const signatureProgram = {
  title: "Teacher Training & School Support in Reading Using Phonics",
  summary:
    "A structured phonics training model with ongoing school-based coaching for consistent classroom implementation and measurable learner growth.",
  outcomes: [
    "Improved teacher confidence and instructional quality",
    "Stronger decoding, fluency, and comprehension outcomes",
    "Sustained literacy routines at school level",
  ],
};

export const primaryNav = [
  { href: "/", label: "Home" },
  { href: "/programs", label: "Programs" },
  { href: "/teacher-professional-development", label: "Teacher Professional Development" },
  { href: "/in-school-coaching-mentorship", label: "In-School Coaching & Mentorship" },
  {
    href: "/learner-reading-assessments-progress-tracking",
    label: "Learner Assessments & Progress Tracking",
  },
  {
    href: "/teaching-aids-instructional-resources-teachers",
    label: "Teaching Aids & Instructional Resources",
  },
  {
    href: "/school-systems-routines",
    label: "School Systems & Routines",
  },
  {
    href: "/instructional-leadership-support",
    label: "Instructional Leadership Support",
  },
  {
    href: "/monitoring-evaluation-reporting",
    label: "Monitoring, Evaluation & Reporting",
  },
  {
    href: "/literacy-content-creation-advocacy",
    label: "Literacy Content Creation & Advocacy",
  },
  { href: "/reading-materials-development", label: "Reading Materials Development" },
  { href: "/phonics-training", label: "Phonics Training" },
  { href: "/story-project", label: "1001 Story Project" },
  { href: "/resources", label: "Resources" },

  { href: "/events", label: "Events" },
  { href: "/diagnostic-quiz", label: "Diagnostic Quiz" },
  { href: "/book-visit", label: "Book a Visit" },
  { href: "/partner", label: "Partner With Us" },
  { href: "/contact", label: "Contact" },
];

export const serviceOptions = [
  "School diagnostic visit",
  "Teacher training session",
  "Online training session",
  "Coaching follow-up",
  "Learner reading assessment",
  "1001 Story onboarding",
];

export const programs: Program[] = [
  {
    id: 6,
    title: "Teaching Aids & Instructional Resources (Teachers)",
    summary:
      "Practical classroom tools that improve consistency and save preparation time.",
    focusAreas: ["Sound charts", "Flashcards", "Blending boards"],
    outputs: ["Word lists", "Lesson templates", "Teacher guides"],
    outcome: "Teachers deliver engaging lessons with stronger structure.",
  },
];

export const resources: ResourceItem[] = [
  {
    slug: "phonics-starter-kit",
    title: "Phonics Starter Kit for Teachers",
    description: "Core routines, sound sequence map, and class-ready phonics activities.",
    grade: "P1-P2",
    skill: "Phonics",
    type: "Toolkit",
    filePath: "/downloads/phonics-starter-kit.txt",
  },
  {
    slug: "reading-lesson-routines",
    title: "30 Reading Lesson Routines",
    description: "Fast lesson structures for decoding, fluency, and comprehension blocks.",
    grade: "All Primary",
    skill: "Fluency",
    type: "Guide",
    filePath: "/downloads/30-reading-lesson-routines.txt",
  },
  {
    slug: "assessment-pack",
    title: "Reading Assessment Pack (Baseline + Tracking)",
    description: "Simple diagnostics and term tracking templates for school teams.",
    grade: "All Primary",
    skill: "Assessment",
    type: "Assessment",
    filePath: "/downloads/reading-assessment-pack.txt",
  },
  {
    slug: "catch-up-guide",
    title: "Catch-Up Intervention Guide",
    description: "Small-group intervention flow for non-readers and lagging readers.",
    grade: "P3-P4",
    skill: "Remedial",
    type: "Guide",
    filePath: "/downloads/catch-up-intervention-guide.txt",
  },
  {
    slug: "decodable-reader-sample",
    title: "Decodable Reader Sample Set",
    description: "Skill-aligned decodable passages for classroom read-aloud and practice.",
    grade: "P1-P2",
    skill: "Phonics",
    type: "Reader",
    filePath: "/downloads/decodable-reader-sample-set.txt",
  },
  {
    slug: "story-writing-pack",
    title: "1001 Story Writing Pack",
    description: "Prompts, drafting rubrics, and revision routines for learner authors.",
    grade: "P5-P7",
    skill: "Writing",
    type: "Toolkit",
    filePath: "/downloads/1001-story-writing-pack.txt",
  },
];

export const blogPosts: BlogPost[] = [
  {
    slug: "rebuilding-reading-routines-in-northern-uganda",
    title: "Rebuilding Reading Routines In Northern Uganda",
    subtitle: "How structured phonics turns recovery plans into daily classroom practice.",
    excerpt:
      "Schools in Northern Uganda are rebuilding foundational learning. This article shows how practical routines, coaching, and aligned materials help teachers deliver consistent early-grade reading lessons.",
    category: "Phonics",
    author: "Ozeki Literacy Team",
    role: "Program Team",
    publishedAt: "2026-01-15T08:00:00.000Z",
    readTime: "6 min read",
    tags: ["Northern Uganda", "Phonics", "Teacher Coaching"],
    sections: [
      {
        heading: "Why routines matter",
        paragraphs: [
          "When teachers use the same lesson flow every day, learners spend more time reading and less time waiting.",
          "Structured routines also make school supervision easier because leaders can see exactly what is working and what needs support.",
        ],
      },
      {
        heading: "What changes in class",
        paragraphs: [
          "Teachers model sounds accurately, guide blending, and correct errors immediately.",
          "Learners practice reading words and short sentences at their level, which builds confidence and fluency over time.",
        ],
      },
    ],
    source: "static",
    views: 0,
  },
  {
    slug: "using-assessment-data-for-catch-up-reading",
    title: "Using Assessment Data For Catch-Up Reading",
    subtitle: "Simple progress checks that help schools target support early.",
    excerpt:
      "Assessment is most useful when it leads to action. We explain how schools can move from baseline data to practical grouping and catch-up routines for non-readers.",
    category: "Assessments",
    author: "Monitoring & Evaluation Team",
    role: "MER Unit",
    publishedAt: "2026-01-29T08:00:00.000Z",
    readTime: "5 min read",
    tags: ["Assessment", "Remedial", "Data Use"],
    sections: [
      {
        heading: "Start with clear diagnostics",
        paragraphs: [
          "Schools first identify whether learners are struggling with sounds, blending, fluency, or comprehension.",
          "This prevents generic remediation and focuses teaching time on the exact skill gap.",
        ],
      },
      {
        heading: "Use short monitoring cycles",
        paragraphs: [
          "Progress checks should be short, consistent, and easy for teachers to administer.",
          "When data shows learners are stuck, routines can be adjusted immediately instead of waiting until endline.",
        ],
      },
    ],
    source: "static",
    views: 0,
  },
  {
    slug: "leadership-actions-that-protect-reading-time",
    title: "Leadership Actions That Protect Reading Time",
    subtitle: "How headteachers and Directors of Studies sustain literacy implementation.",
    excerpt:
      "Reading gains depend on school systems. This guide highlights leadership actions that protect timetable time, strengthen supervision, and keep coaching on track.",
    category: "Leadership",
    author: "School Support Team",
    role: "Instructional Leadership",
    publishedAt: "2026-02-10T08:00:00.000Z",
    readTime: "4 min read",
    tags: ["Leadership", "School Systems", "Supervision"],
    sections: [
      {
        heading: "Protect the timetable",
        paragraphs: [
          "School leaders should set and monitor daily reading blocks so literacy routines are not displaced by other activities.",
          "A protected timetable gives teachers predictable time to teach, practice, and check mastery.",
        ],
      },
      {
        heading: "Coach with simple tools",
        paragraphs: [
          "Short lesson observation checklists and quick feedback cycles help leaders support teachers consistently.",
          "When supervision is practical and regular, reading instruction quality improves faster.",
        ],
      },
    ],
    source: "static",
    views: 0,
  },
];

export const blogCategories = [...new Set(blogPosts.map((post) => post.category))].sort();



export const testimonials: Testimonial[] = [
  {
    name: "Esther Namusoke",
    role: "Headteacher, Bright Future Primary",
    quote:
      "Our teachers moved from guessing methods to structured reading lessons. Learner fluency improved within one term.",
  },
  {
    name: "Isaac Ssemanda",
    role: "Director of Studies, Green Hill Schools",
    quote:
      "The coaching visits made the difference. Teachers now use the same routines every week and we can track progress.",
  },
  {
    name: "Janet Ayo",
    role: "P2 Teacher, Starlight Academy",
    quote:
      "The sound charts and blending routines are practical. I can see struggling readers catching up.",
  },
  {
    name: "Mercy Nankya",
    role: "Classroom Teacher, Kyengera Primary",
    quote:
      "The demonstration sessions were immediately usable. My learners now decode words confidently and read with better pace.",
  },
  {
    name: "Peter Okello",
    role: "School Leader, Gulu Sunrise Primary",
    quote:
      "The school systems support helped us align timetables, coaching notes, and assessment tracking in one routine.",
  },
  {
    name: "Scovia Twinomujuni",
    role: "P3 Teacher, Rukungiri Model School",
    quote:
      "Small-group remedial routines helped our non-readers make steady gains. We now monitor progress every week.",
  },
  {
    name: "Ronald Mugisha",
    role: "Director of Studies, Hillside Junior School",
    quote:
      "The assessment summaries gave us clear decisions for instruction. Teachers know exactly what skills to reteach.",
  },
  {
    name: "Harriet Nakato",
    role: "Literacy Champion, Wakiso Cluster",
    quote:
      "The coaching follow-ups kept implementation strong after training. Teachers did not return to old habits.",
  },
  {
    name: "Samuel Ochieng",
    role: "Headteacher, Lira Community School",
    quote:
      "Our 1001 Story sessions increased both reading and writing confidence. Learners are proud to read their own stories aloud.",
  },
  {
    name: "Brenda Atuhura",
    role: "P1 Teacher, Mbarara Junior Academy",
    quote:
      "Phonics routines are now consistent across classes, and we can see stronger blending and spelling accuracy.",
  },
];

export const caseStudies: CaseStudy[] = [
  {
    slug: "makindye-literacy-turnaround",
    school: "Makindye Community School",
    district: "Kampala",
    challenge:
      "P2 and P3 learners showed weak decoding and low oral reading fluency despite regular reading periods.",
    intervention: [
      "Teacher phonics refresher and model lessons",
      "Weekly coaching with observation rubrics",
      "Baseline to endline learner fluency tracking",
    ],
    results: [
      "Teacher routine adoption rose from 38% to 86%",
      "Average oral reading fluency improved by 31 words per minute",
      "Non-reader proportion reduced by 22 percentage points",
    ],
    testimonial:
      "The structured routines changed everything. We now know exactly what to teach and how to track it.",
  },
  {
    slug: "gulu-remedial-acceleration",
    school: "Gulu Sunrise Primary",
    district: "Gulu",
    challenge:
      "Large group of non-readers in P4 required accelerated catch-up support without disrupting regular classes.",
    intervention: [
      "Skill-grouped remedial lessons three times per week",
      "Decodable practice packs and progress checks",
      "Instructional leadership mentoring for school management",
    ],
    results: [
      "74% of targeted learners progressed at least one fluency band",
      "Teachers sustained intervention routines after coaching phase",
      "School integrated literacy tracking into weekly supervision",
    ],
    testimonial:
      "Our catch-up learners gained confidence and now participate fully in class reading tasks.",
  },
];

export const partners: Partner[] = [
  {
    name: "District Education Offices",
    note: "Co-deliver school literacy strengthening and local implementation support.",
  },
  {
    name: "School Networks",
    note: "Scale teacher training and coaching models across clusters.",
  },
  {
    name: "Education NGOs",
    note: "Align reading interventions with monitoring and reporting needs.",
  },
];

export const impactMetrics = [
  { label: "Teachers trained", value: 1240 },
  { label: "Schools supported", value: 87 },
  { label: "Coaching visits", value: 519 },
  { label: "Learners assessed", value: 18320 },
  { label: "Stories published", value: 612 },
];

export const academyFeatures = [
  "Teacher accounts and school affiliation",
  "Structured courses: phonics, fluency, comprehension, assessment, remedial",
  "Quizzes, mastery checks, and auto-generated certificates",
  "Live online training calendar with reminders",
  "Premium resource vault and term packs",
  "School dashboards with bulk enrollment and reporting",
  "Coaching calls, lesson feedback, and action plans",
  "Membership tiers and school licensing",
];

export const pricingTiers = [
  {
    name: "Free",
    audience: "All educators",
    description: "Access selected resources and monthly literacy newsletter.",
  },
  {
    name: "Teacher Pro",
    audience: "Individual teachers",
    description:
      "Full course library, verified certificates, premium vault, live masterclass recordings.",
  },
  {
    name: "School Plus",
    audience: "Schools",
    description:
      "Bulk enrollments, school dashboard, progress reports, private training sessions, implementation reviews.",
  },
  {
    name: "District/Network",
    audience: "Partners and NGOs",
    description:
      "Multi-school licensing, consolidated reporting, coaching plans, and donor-ready evidence packs.",
  },
];
