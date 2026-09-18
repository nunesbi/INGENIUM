import logoSrc from "@/assets/logo.png";

interface LogoProps {
  className?: string;
  height?: number;
}

/**
 * Brand logo image — transparent PNG, dark-mode safe.
 * In light mode the original colours (black + gold) are preserved.
 * In dark mode we make all black pixels white while keeping gold tones
 * via a CSS filter combination.
 */
export function Logo({ className = "", height = 32 }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Ingenium"
      height={height}
      style={{ height, width: "auto" }}
      className={[
        "object-contain select-none",
        // Dark mode: invert(1) turns black→white; hue-rotate(180deg) rotates
        // the inverted hues back 180° so gold (#d6972b ≈ hue 35°) stays gold.
        // Achromatic pixels (white/black) are unaffected by hue-rotate.
        "dark:[filter:invert(1)_hue-rotate(180deg)]",
        className,
      ].join(" ")}
      draggable={false}
    />
  );
}
