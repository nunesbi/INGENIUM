import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./lib/theme";
import { LanguageProvider } from "./lib/i18n";
import "./index.css";

// Apply theme class before render to avoid flash of wrong theme
const stored = window.localStorage.getItem("ingenium_theme");
const initial = stored === "light" ? "light" : "dark";
if (initial === "dark") document.documentElement.classList.add("dark");

// Apply lang/dir before render to avoid flash
const storedLang = window.localStorage.getItem("ingenium_lang");
if (storedLang) {
  document.documentElement.lang = storedLang;
  document.documentElement.dir = storedLang === "ar" ? "rtl" : "ltr";
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </ThemeProvider>
);
