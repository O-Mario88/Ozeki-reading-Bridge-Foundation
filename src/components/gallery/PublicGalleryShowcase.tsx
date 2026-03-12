"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type GalleryImage = {
  src: string;
  alt: string;
};

const GALLERY_IMAGES: GalleryImage[] = [
  { src: "/photos/10.jpeg", alt: "Teachers during a literacy session workshop." },
  { src: "/photos/11.jpeg", alt: "Facilitator leading phonics instruction with participants." },
  { src: "/photos/12.jpeg", alt: "Teacher collaboration during classroom practice planning." },
  { src: "/photos/13.jpeg", alt: "School-based coaching conversation with literacy mentors." },
  { src: "/photos/14.jpeg", alt: "Participants reviewing reading assessment tools." },
  { src: "/photos/15.jpeg", alt: "Training group engagement in practical lesson routines." },
  { src: "/photos/16.jpeg", alt: "Teachers working through phonics implementation steps." },
  { src: "/photos/17.jpeg", alt: "District-level literacy support and planning moment." },
  { src: "/photos/18.jpeg", alt: "Active school support visit documenting reading routines." },
  { src: "/photos/19.jpeg", alt: "Teachers sharing outcomes from classroom implementation." },
  { src: "/photos/20.jpeg", alt: "Reading lesson facilitation in a school environment." },
  { src: "/photos/21.jpeg", alt: "Educators in an interactive training reflection segment." },
];

function chunkIntoSlides<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

export function PublicGalleryShowcase() {
  const slides = useMemo(() => chunkIntoSlides(GALLERY_IMAGES, 3), []);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="section">
      <div className="container">
        <article className="gallery-showcase-shell">
          <div className="gallery-showcase-head">
            <p className="gallery-showcase-kicker">Gallery</p>
            <h1>Moments From Our Literacy Field Work</h1>
            <p>
              Photos from trainings, coaching visits, and school support sessions across districts.
            </p>
          </div>

          <div className="gallery-showcase-stage">
            <AnimatePresence mode="wait">
              <motion.div
                key={`gallery-slide-${activeSlide}`}
                className="gallery-showcase-grid"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {slides[activeSlide]?.map((image) => (
                  <figure className="gallery-showcase-card" key={image.src}>
                    <img src={image.src} alt={image.alt} loading="lazy" decoding="async" />
                  </figure>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="gallery-showcase-dots" aria-label="Gallery pagination">
            {slides.map((_, index) => (
              <button
                key={`gallery-dot-${index + 1}`}
                type="button"
                className={index === activeSlide ? "is-active" : ""}
                onClick={() => setActiveSlide(index)}
                aria-label={`Open gallery slide ${index + 1}`}
                aria-current={index === activeSlide ? "true" : "false"}
              />
            ))}
          </div>

          <div className="gallery-showcase-actions">
            <Link className="button button-accent" href="/partner-with-us">
              Partner With Us
            </Link>
            <Link className="button" href="/impact/gallery">
              Open Evidence Gallery
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
