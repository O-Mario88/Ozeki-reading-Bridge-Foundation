import Link from "next/link";
import { mission, organizationName, vision } from "@/lib/content";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { Target, Eye, Heart } from "lucide-react";

export const metadata = {
  title: "About",
  description:
    "Learn about Ozeki Reading Bridge Foundation's vision, mission, and practical literacy implementation model.",
};

export const revalidate = 300;

const coreValues = [
  {
    title: "Purposeful Service",
    tagline: "We are called to serve with compassion, humility, and excellence.",
    description:
      "Our work is rooted in a deep commitment to children, schools, teachers, and communities, and we strive to ensure that every action contributes to meaningful and lasting transformation.",
  },
  {
    title: "Integrity and Stewardship",
    tagline: "We honor trust through honesty, accountability, and faithful stewardship.",
    description:
      "We are committed to doing what is right, managing resources responsibly, and maintaining transparency in our decisions, relationships, and work.",
  },
  {
    title: "Excellence for Impact",
    tagline: "We pursue excellence because the people we serve deserve our very best.",
    description:
      "We hold ourselves to high standards of quality, professionalism, and discipline so that our work produces credible, measurable, and sustainable impact.",
  },
  {
    title: "Continuous Learning and Growth",
    tagline: "We believe transformation begins with a willingness to learn.",
    description:
      "We remain teachable, reflective, and innovative, always seeking to improve our systems, strengthen our people, and deepen the impact of our work.",
  },
  {
    title: "Partnership for Lasting Change",
    tagline: "We believe the strongest impact is built together.",
    description:
      "We value collaboration, mutual respect, and shared responsibility with schools, communities, partners, supporters, and one another as we work toward a common vision of hope and transformation.",
  },
  {
    title: "Foundations that Last",
    tagline: "We believe strong literacy foundations change lives.",
    description:
      "That is why we are committed to equipping teachers, strengthening schools, and nurturing every child's opportunity to read, learn, and thrive.",
  },
];

import { PageHero } from "@/components/public/PageHero";

export default function AboutPage() {
  return (
    <>
      <PageHero
        tagline="Who we are"
        title={<span className="text-brand-primary">{organizationName}</span>}
        subtitle="A literacy-focused organization based in Gulu City, Northern Uganda, strengthening how reading is taught in primary schools through practical classroom support and measurable outcomes."
        imageSrc="/photos/15.jpeg"
      />

      {/* 2. Quick Navigation Buttons */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <ul className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
            <li>
              <a href="#mission-vision" className="btn-green inline-block px-6 py-2.5 rounded-full text-sm font-bold">
                Mission &amp; Vision
              </a>
            </li>
            <li>
              <a href="#leadership-team" className="btn-green inline-block px-6 py-2.5 rounded-full text-sm font-bold">
                Leadership Team
              </a>
            </li>
            <li>
              <a href="#core-values" className="btn-green inline-block px-6 py-2.5 rounded-full text-sm font-bold">
                Core Values
              </a>
            </li>
            <li>
              <Link href="/transparency/financials" className="btn-green inline-block px-6 py-2.5 rounded-full text-sm font-bold">
                Financial Transparency
              </Link>
            </li>
            <li>
              <Link href="/faqs" className="btn-green inline-block px-6 py-2.5 rounded-full text-sm font-bold">
                FAQs
              </Link>
            </li>
            <li>
              <Link href="/contact" className="btn-green inline-block px-6 py-2.5 rounded-full text-sm font-bold">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* 3. Mission & Vision (Split panels) */}
      <SectionWrapper theme="charius-beige" id="mission-vision">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-stretch max-w-5xl mx-auto">
          <PremiumCard variant="charius" className="p-10 md:p-12 flex flex-col items-start bg-brand-primary text-white border-none" withHover>
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-6">Our Vision</h2>
            <p className="text-xl leading-relaxed text-white/90">
              {vision}
            </p>
          </PremiumCard>
          
          <PremiumCard variant="charius" className="p-10 md:p-12 flex flex-col items-start bg-white" withHover>
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-8">
              <Target className="w-8 h-8 text-brand-primary" />
            </div>
            <h2 className="text-3xl font-bold text-[#111] mb-6">Our Mission</h2>
            <p className="text-xl leading-relaxed text-gray-500">
              {mission}
            </p>
          </PremiumCard>
        </div>
      </SectionWrapper>

      {/* 4. Core Values */}
      <SectionWrapper theme="charius-beige" id="core-values">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
            <Heart size={32} />
          </div>
          <h2 className="text-4xl font-bold text-[#111] mb-6">Our Core Values</h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            These values shape how we measure progress, support schools, work with
            partners, and serve children across Uganda.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {coreValues.map((value, index) => (
            <PremiumCard variant="charius" className="p-8 flex flex-col" key={value.title} withHover>
              <div className="text-5xl font-extrabold text-gray-100 mb-4 tracking-tighter">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="text-2xl font-bold text-[#111] mb-2">{value.title}</h3>
              <p className="text-sm font-semibold text-[#006b61]/70 italic mb-4">{value.tagline}</p>
              <p className="text-gray-500 leading-relaxed break-words">{value.description}</p>
            </PremiumCard>
          ))}
        </div>

        {/* Values CTA */}
        <div className="mt-16 max-w-4xl mx-auto">
            <PremiumCard variant="charius" className="p-8 md:p-12 bg-brand-primary text-white flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-4">Evidence-led values in practice</h3>
                <p className="text-white/80 text-lg">
                  See how these values translate into classroom support, measurable
                  learning outcomes, and partner accountability.
                </p>
              </div>
              <Link href="/impact" className="btn-green px-8 py-4 rounded-full font-bold shrink-0">
                Explore the Impact Hub
              </Link>
            </PremiumCard>
        </div>
      </SectionWrapper>


      {/* 5. Leadership Team */}
      <SectionWrapper theme="light" id="leadership-team">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-brand-primary mb-6">
            Meet Our Team <span className="relative inline-block">Leader<span className="absolute -bottom-2 left-0 w-full h-[4px] bg-[#FA7D15] rounded-full"></span></span>
          </h2>
          <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto mt-8">
            Meet the dedicated individuals driving our mission to strengthen early-grade literacy.
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-0">
          
          {/* Main Bio - Full width story */}
          <div className="w-full mb-12">
            <h3 className="text-4xl font-bold text-brand-primary mb-6 tracking-tight">Ojok Amos</h3>
            <div className="text-gray-500 text-lg md:text-xl leading-relaxed space-y-6">
              <p>
                Ojok Amos is the Co-Founder and Team Lead of Ozeki Reading Bridge Foundation, and his story is one of resilience, purpose, and hope. Growing up in Northern Uganda during the height of the LRA war, he saw how conflict tore through communities and deeply disrupted education. Schools were unstable, learning was interrupted, and for many children, the simple chance to learn to read became painfully uncertain. In that season of fear and displacement, literacy was not only delayed—it was diminished.
              </p>
              <p>
                But from that painful reality, a powerful vision was born.
              </p>
              <p>
                Having witnessed how war robbed children of learning opportunities and weakened the foundation of education across the region, Amos made a personal commitment to be part of a different story—one of restoration, dignity, and transformation. He resolved to help rebuild what conflict had broken by giving children the reading skills they need to thrive, and by equipping teachers with practical tools to teach effectively, even in challenging contexts.
              </p>
              <p>
                Today, that vision lives through Ozeki Reading Bridge Foundation. Amos is driven by the belief that literacy can change the future of a child, strengthen a school, and restore hope in a community. His work focuses on practical, community-centered approaches that empower teachers, support schools, and help children become confident, capable readers.
              </p>
              <p>
                What makes his leadership especially compelling is that it is rooted in lived experience. He is not working to solve a distant problem—he is responding to a reality he has known personally. His mission is bigger than improving reading scores; it is about changing the literacy story of Northern Uganda and helping shape a stronger educational future for the entire country.
              </p>
              <p>
                Ojok Amos leads with conviction, knowing that when a child learns to read, a new future begins. Through his work, he is helping ensure that the next generation will not be defined by the disruptions of the past, but by the opportunities they are given to learn, grow, and succeed.
              </p>
            </div>
            <hr className="border-t border-gray-100 mt-8" />
          </div>

          <div className="grid md:grid-cols-[2fr_3fr] gap-12 lg:gap-20 items-start">
            
            {/* Left Column: Image and Title */}
            <div className="flex flex-col justify-start">
              <div className="relative rounded-xl bg-brand-primary/10 overflow-hidden aspect-square md:aspect-[4/5] shadow-sm w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/photos/ojok_amos.png?v=2" 
                  alt="Ojok Amos" 
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              </div>
              <div className="mt-5 text-center px-4">
                <p className="text-base font-bold text-gray-600 uppercase tracking-widest">Co-Founder & Team Lead</p>
              </div>
            </div>
            
            {/* Right Column: Experience */}
            <div className="flex flex-col text-left py-2">
              <h4 className="text-3xl font-bold text-brand-primary mb-4 tracking-tight">Amos's Experience</h4>
              
              <div className="text-gray-500 text-base md:text-lg leading-relaxed mb-6">
                <p>
                  A qualified primary school teacher by profession, Amos brings extensive experience in early-grade literacy, teacher training, and structured phonics instruction across diverse communities.
                </p>
              </div>

              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-600 text-base md:text-lg"><strong className="text-gray-800 font-bold">Read for Life:</strong> Trained for three years, specializing heavily in reading instruction with a dedicated focus on structured phonics and letter sounds.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-600 text-base md:text-lg"><strong className="text-gray-800 font-bold">African Revival:</strong> Worked for three years providing in-school literacy training, supporting classroom teachers, and training future educators and tutors at Kitgum Core Primary Teachers’ College.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-600 text-base md:text-lg"><strong className="text-gray-800 font-bold">Refugee Education:</strong> Contributed to community literacy implementation by supporting critical reading programs in Rhino and Imvepi Refugee Camps under Plan International and ZOA.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-600 text-base md:text-lg"><strong className="text-gray-800 font-bold">Restore International:</strong> Since 2019, pioneered literacy training for inmate teachers who support fellow inmates in Uganda Prisons, extending opportunities in correctional settings.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* 6. Bottom CTA */}
      <CTAStrip 
        heading="Need our full approach?"
        subheading="Learn how our model adapts to different districts and scales to the national level."
        primaryButtonText="Learn about our programs"
        primaryButtonHref="/programs"
        theme="charius"
      />
    </>
  );
}
