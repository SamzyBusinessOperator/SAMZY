import Image from "next/image";

type BrandProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function Brand({
  compact = false,
  inverse = false,
}: BrandProps) {
  const logoSize = compact ? 32 : 42;

  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/samzy-logo.png"
        alt="SAMZY"
        width={logoSize}
        height={logoSize}
        className="rounded-[10px] object-contain"
        priority={!compact}
      />

      <span
        className={[
          "font-extrabold tracking-[-0.045em]",
          compact ? "text-lg" : "text-[25px]",
          inverse ? "text-white" : "text-[#07113b]",
        ].join(" ")}
      >
        SAMZY
      </span>
    </div>
  );
}