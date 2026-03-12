import Image from "next/image";
import { listPublicGalleryPhotos } from "@/lib/gallery-store";

export const metadata = {
  title: "Gallery",
  description:
    "A curated gallery of literacy trainings, school support visits, and implementation moments.",
};

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export default async function GalleryPage() {
  const photos = await listPublicGalleryPhotos(300);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Gallery</p>
          <h1>Photo Gallery</h1>
          <p>Photos are ordered by post time, with the newest uploads shown first.</p>
        </div>
      </section>

      <section className="section">
        <div className="container public-gallery-grid">
          {photos.map((photo) => (
            <article className="card public-gallery-card" key={photo.id}>
              <div className="public-gallery-image-wrap">
                <Image
                  src={photo.imageUrl}
                  alt={photo.altText || photo.description}
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="public-gallery-content">
                <p className="public-gallery-description">{photo.description}</p>
                <p className="public-gallery-meta">{formatDate(photo.createdAt)}</p>
              </div>
            </article>
          ))}
          {photos.length === 0 ? (
            <article className="card public-gallery-empty">
              <h2>No photos yet</h2>
              <p>Upload photos in the portal gallery manager to publish them here.</p>
            </article>
          ) : null}
        </div>
      </section>
    </>
  );
}
