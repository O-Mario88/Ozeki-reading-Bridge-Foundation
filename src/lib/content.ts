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
  { href: "/phonics-training", label: "Phonics Training" },
  { href: "/story-project", label: "1001 Story Project" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Blog" },
  { href: "/events", label: "Events" },
  { href: "/impact", label: "Impact" },
  { href: "/diagnostic-quiz", label: "Diagnostic Quiz" },
  { href: "/book-visit", label: "Book a Visit" },
  { href: "/partner-with-us", label: "Partner With Us" },
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
    id: 1,
    title: "Teacher Professional Development (Structured Phonics & Reading Instruction)",
    summary:
      "Practical, demonstration-based training that equips teachers to teach reading step by step.",
    focusAreas: [
      "Letter sounds and sound-to-symbol mapping",
      "Blending, segmenting, decoding, and encoding",
      "Fluency routines, vocabulary, and comprehension",
    ],
    outputs: [
      "Training sessions",
      "Teacher guides",
      "Lesson routines",
      "Classroom implementation plans",
    ],
    outcome: "Teachers deliver clearer and more consistent reading instruction.",
  },
  {
    id: 2,
    title: "In-School Teacher Evaluation, Coaching & Mentorship",
    summary:
      "Classroom observation and targeted coaching that turns training into daily practice.",
    focusAreas: [
      "Lesson observation with simple rubrics",
      "Immediate feedback and coaching cycles",
      "Model lessons and co-teaching",
    ],
    outputs: ["Observation notes", "Teacher improvement plans", "Follow-up coaching"],
    outcome: "Instruction quality improves and adoption of phonics routines is sustained.",
  },
  {
    id: 3,
    title: "Learner Reading Assessments & Progress Tracking",
    summary:
      "Simple, reliable assessment tools that inform targeted instruction.",
    focusAreas: [
      "Letter-sound knowledge",
      "Blending and decoding accuracy",
      "Oral reading fluency and comprehension",
    ],
    outputs: [
      "Baseline, progress, and endline summaries",
      "Learner profiles",
      "Instructional recommendations",
    ],
    outcome: "Schools make better literacy decisions using real learner data.",
  },
  {
    id: 4,
    title: "Remedial & Catch-Up Reading Interventions",
    summary:
      "Small-group interventions for non-readers and struggling readers.",
    focusAreas: [
      "Skill-gap diagnosis",
      "Targeted decoding and blending lessons",
      "Structured fluency building",
    ],
    outputs: ["Intervention plans", "Grouping strategies", "Progress monitoring tools"],
    outcome: "At-risk learners gain foundational reading skills faster.",
  },
  {
    id: 5,
    title: "Reading Materials Development (Learners)",
    summary:
      "Learner-friendly texts aligned to phonics progression and classroom lessons.",
    focusAreas: [
      "Decodable readers",
      "Leveled passages",
      "Comprehension activities",
    ],
    outputs: ["Practice sheets", "Reading passages", "Classroom text sets"],
    outcome: "More meaningful practice leads to stronger fluency and comprehension.",
  },
  {
    id: 6,
    title: "Teaching Aids & Instructional Resources (Teachers)",
    summary:
      "Practical classroom tools that improve consistency and save preparation time.",
    focusAreas: ["Sound charts", "Flashcards", "Blending boards"],
    outputs: ["Word lists", "Lesson templates", "Teacher guides"],
    outcome: "Teachers deliver engaging lessons with stronger structure.",
  },
  {
    id: 7,
    title: "School Literacy Program Strengthening (Systems & Routines)",
    summary:
      "School-wide routines and accountability systems for literacy implementation.",
    focusAreas: [
      "Literacy timetables",
      "Daily and weekly reading routines",
      "Implementation tracking tools",
    ],
    outputs: ["School literacy plans", "Routine trackers", "Accountability checklists"],
    outcome: "Schools sustain literacy gains beyond one-off training.",
  },
  {
    id: 8,
    title: "Instructional Leadership Support (Headteachers & Directors of Studies)",
    summary:
      "Leadership coaching for stronger supervision and teacher support.",
    focusAreas: [
      "Observation and supervision checklists",
      "Coaching conversations",
      "Data-informed decisions",
    ],
    outputs: ["Leadership toolkits", "Supervision routines", "Coaching templates"],
    outcome: "Leaders drive consistent, high-quality reading instruction.",
  },
  {
    id: 9,
    title: "Monitoring, Evaluation & Reporting",
    summary:
      "Data collection and reporting systems that prove impact and guide improvement.",
    focusAreas: ["Program monitoring", "Data quality", "Evidence synthesis"],
    outputs: ["Partner-ready reports", "Learning briefs", "Action recommendations"],
    outcome: "Partners get accountability, transparency, and credible evidence of results.",
  },
  {
    id: 10,
    title: "Literacy Content Creation & Advocacy",
    summary:
      "Practical professional knowledge sharing for teachers and school leaders.",
    focusAreas: ["Guides", "Articles", "Implementation tips"],
    outputs: ["Toolkits", "Campaign content", "Best-practice briefs"],
    outcome: "More educators apply proven literacy practices in real classrooms.",
  },
  {
    id: 11,
    title: "The 1001 Story Project (Learner Authors -> Published Books)",
    summary:
      "School-based writing program that strengthens writing and reinforces reading fluency.",
    focusAreas: [
      "Teacher-led story-writing routines",
      "Drafting and revision workflows",
      "Read-aloud and editing cycles",
    ],
    outputs: [
      "Learner drafts",
      "Edited anthology (digital/print)",
      "School story showcase",
    ],
    outcome: "Learners become confident readers and emerging authors.",
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

export const blogCategories = [
  "Phonics & decoding",
  "Fluency",
  "Comprehension",
  "Teaching routines",
  "Assessments",
  "Remedial strategies",
  "School literacy systems",
  "Teacher coaching",
  "1001 Story",
];

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-teach-reading-using-letter-sounds",
    title: "How to Teach Reading Using Letter Sounds in Primary Classrooms",
    excerpt:
      "A practical sequence schools can use to move from letter sounds to accurate decoding and early fluency.",
    category: "Phonics & decoding",
    author: "Ruth Nakato",
    role: "Literacy Coach",
    publishedAt: "2026-01-15",
    readTime: "8 min read",
    tags: ["phonics", "decoding", "uganda", "teacher training"],
    sections: [
      {
        heading: "Start with explicit sound teaching",
        paragraphs: [
          "Teach one new sound at a time and connect it to common words learners can hear and say.",
          "Use short demonstrations and immediate learner response so every child practices the target sound.",
        ],
      },
      {
        heading: "Move quickly into blending",
        paragraphs: [
          "Blend sounds orally first, then move to print. Keep words short and controlled.",
          "Daily blending practice makes decoding automatic and prevents guessing from pictures.",
        ],
      },
      {
        heading: "Track mastery weekly",
        paragraphs: [
          "Use a one-minute check to see who can identify sounds, blend, and read simple words.",
          "Group learners by need and run short intervention blocks three times a week.",
        ],
      },
    ],
  },
  {
    slug: "building-reading-fluency-with-daily-routines",
    title: "Building Reading Fluency with Daily 15-Minute Routines",
    excerpt:
      "Small daily routines can dramatically improve oral reading speed, accuracy, and expression.",
    category: "Fluency",
    author: "Samuel Ouma",
    role: "Program Lead",
    publishedAt: "2026-01-29",
    readTime: "6 min read",
    tags: ["fluency", "classroom routines", "primary"],
    sections: [
      {
        heading: "Use repeated reading with purpose",
        paragraphs: [
          "Learners read the same short passage multiple times with teacher feedback.",
          "Focus feedback on accuracy first, then pace, then expression.",
        ],
      },
      {
        heading: "Set visible fluency goals",
        paragraphs: [
          "Show class goals for weekly oral reading improvement by grade level.",
          "Celebrate growth publicly to increase motivation and persistence.",
        ],
      },
    ],
  },
  {
    slug: "simple-reading-assessments-for-school-leaders",
    title: "Simple Reading Assessments School Leaders Can Use Every Term",
    excerpt:
      "A low-burden assessment model for headteachers and directors of studies.",
    category: "Assessments",
    author: "Grace Atwine",
    role: "M&E Specialist",
    publishedAt: "2026-02-05",
    readTime: "7 min read",
    tags: ["assessment", "school leadership", "monitoring"],
    sections: [
      {
        heading: "Collect only what decisions need",
        paragraphs: [
          "Track letter sounds, decoding, oral reading fluency, and comprehension.",
          "Avoid over-testing and focus on actionable indicators.",
        ],
      },
      {
        heading: "Use data in coaching conversations",
        paragraphs: [
          "Bring class-level trends into teacher coaching meetings.",
          "Agree one instruction change per cycle and review after two weeks.",
        ],
      },
    ],
  },
  {
    slug: "inside-the-1001-story-project",
    title: "Inside the 1001 Story Project: Turning Learners into Published Authors",
    excerpt:
      "How story writing strengthens reading, spelling, and learner confidence across upper primary grades.",
    category: "1001 Story",
    author: "Evelyn Kizza",
    role: "Writing Program Coordinator",
    publishedAt: "2026-02-10",
    readTime: "9 min read",
    tags: ["writing", "story project", "read aloud"],
    sections: [
      {
        heading: "Prompt, draft, revise, publish",
        paragraphs: [
          "Teachers guide learners through short cycles that build idea generation and sentence quality.",
          "Each cycle includes read-aloud and peer feedback before final editing.",
        ],
      },
      {
        heading: "Connect writing back to reading",
        paragraphs: [
          "Learners read their own stories and peer stories to practice fluency.",
          "Local stories increase engagement and produce culturally relevant reading materials.",
        ],
      },
    ],
  },
];

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
    description: "Access blog, selected resources, and monthly literacy newsletter.",
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
