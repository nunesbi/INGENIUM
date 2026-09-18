import { Globe } from "lucide-react";
import { useT, LANGUAGES, Lang } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  variant?: "icon" | "compact";
}

export function LanguageSwitcher({ variant = "icon" }: Props) {
  const { lang, setLang, t } = useT();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("lang.label", "Idioma")}
          data-testid="button-language"
          className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <Globe size={16} />
          <span className="hidden sm:inline text-xs font-medium uppercase">{current.code}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code as Lang)}
            className={`cursor-pointer text-sm ${l.code === lang ? "bg-muted/60 font-medium" : ""}`}
            data-testid={`lang-option-${l.code}`}
          >
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
