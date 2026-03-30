import Image from "next/image";

interface ChariusPillImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ChariusPillImage({ src, alt, className = "" }: ChariusPillImageProps) {
  return (
    <div className={`relative w-full aspect-[4/5] max-w-lg mx-auto ${className}`}>
      {/* Container rotated to provide the diagonal angle */}
      <div className="absolute inset-0 rotate-[30deg] scale-[1.2] flex gap-4 md:gap-6 justify-center items-center">
        
        {/* Left Pill */}
        <div className="relative w-1/3 h-[70%] rounded-full overflow-hidden shadow-2xl bg-gray-200 translate-y-8">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover object-center -rotate-[30deg] scale-[1.3] origin-center"
            sizes="(max-width: 768px) 33vw, 20vw"
          />
        </div>

        {/* Center Pill */}
        <div className="relative w-1/3 h-full rounded-full overflow-hidden shadow-2xl bg-gray-200 z-10">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover object-center -rotate-[30deg] scale-[1.3] origin-center"
            sizes="(max-width: 768px) 33vw, 20vw"
          />
        </div>

        {/* Right Pill */}
        <div className="relative w-1/3 h-[70%] rounded-full overflow-hidden shadow-2xl bg-gray-200 -translate-y-8">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover object-center -rotate-[30deg] scale-[1.3] origin-center"
            sizes="(max-width: 768px) 33vw, 20vw"
          />
        </div>
      </div>
    </div>
  );
}
