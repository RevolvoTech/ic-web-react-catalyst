import Image from "next/image";
import type { ReactNode } from "react";

interface EditorialHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  image: string;
  imageAlt: string;
  actions?: ReactNode;
  home?: boolean;
  atmosphere?: ReactNode;
}

export function EditorialHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  actions,
  home = false,
  atmosphere,
}: EditorialHeroProps) {
  return (
    <section className={home ? "editorial-hero editorial-hero--home" : "editorial-hero"}>
      <Image
        className="editorial-hero__image"
        src={image}
        alt={imageAlt}
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
      />
      <div className="editorial-hero__wash" aria-hidden="true" />
      {atmosphere}
      <div className="shell editorial-hero__content">
        <p className="eyebrow editorial-hero__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="editorial-hero__description">{description}</p>
        {actions ? <div className="editorial-hero__actions">{actions}</div> : null}
      </div>
      <div className="editorial-hero__index" aria-hidden="true">
        <span>CAT / OPS</span>
        <span>35°44′N</span>
      </div>
    </section>
  );
}
