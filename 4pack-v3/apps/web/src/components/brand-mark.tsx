import Image from "next/image";
export function BrandMark() {
  return (
    <span className="brand-approved">
      <Image
        src="/branding/4pack-logo.png"
        alt="4PACK"
        width={435}
        height={164}
        priority
      />
    </span>
  );
}
