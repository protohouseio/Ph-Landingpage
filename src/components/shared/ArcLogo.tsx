/**
 * Arc-cluster logo mark, recreated 1:1 from the reference site's inline SVG
 * (o-scs.com). NOTE: this is that company's trademark — swap in the real
 * Proto House mark before production. Geometry kept exact per request.
 *
 * Shared between the intro (logo load-in) and the Hero nav so both use the
 * identical mark from a single source.
 */
export default function ArcLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 72 36"
      fill="none"
      width="100%"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 11.9514V17.3372C9.57779 17.3372 17.3372 9.57779 17.3372 0H11.9514C11.9514 6.58646 6.5934 11.9514 0 11.9514Z" fill="currentColor" />
      <path d="M0 18.6625V24.0483C6.58646 24.0483 11.9514 29.4063 11.9514 35.9997H17.3372C17.3372 26.4219 9.57779 18.6625 0 18.6625Z" fill="currentColor" />
      <path d="M54.6559 36H60.0417C60.0417 29.4135 65.3997 24.0486 71.9931 24.0486V18.6628C62.4153 18.6628 54.6559 26.4222 54.6559 36Z" fill="currentColor" />
      <path d="M60.0426 0H54.6569C54.6569 9.57779 62.4163 17.3372 71.994 17.3372V11.9514C65.4076 11.9514 60.0426 6.5934 60.0426 0Z" fill="currentColor" />
      <path d="M36.0011 11.9514C29.4147 11.9514 24.0497 6.5934 24.0497 0H18.6639C18.6639 9.57779 26.4233 17.3372 36.0011 17.3372C45.5789 17.3372 53.3383 9.57779 53.3383 0H47.9525C47.9525 6.58646 42.5945 11.9514 36.0011 11.9514Z" fill="currentColor" />
      <path d="M36.0003 18.6628C26.4225 18.6628 18.6631 26.4222 18.6631 36H24.0489C24.0489 29.4135 29.4069 24.0486 36.0003 24.0486C42.5937 24.0486 47.9517 29.4066 47.9517 36H53.3375C53.3375 26.4222 45.5781 18.6628 36.0003 18.6628Z" fill="currentColor" />
    </svg>
  );
}
