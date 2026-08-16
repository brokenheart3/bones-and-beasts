import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { useSettingsStore } from "../store/useSettingsStore";
import en from "./locales/en.json";
import af from "./locales/af.json";
import am from "./locales/am.json";
import ar from "./locales/ar.json";
import az from "./locales/az.json";
import bg from "./locales/bg.json";
import bn from "./locales/bn.json";
import bs from "./locales/bs.json";
import ca from "./locales/ca.json";
import cs from "./locales/cs.json";
import da from "./locales/da.json";
import de from "./locales/de.json";
import el from "./locales/el.json";
import es from "./locales/es.json";
import et from "./locales/et.json";
import fa from "./locales/fa.json";
import fi from "./locales/fi.json";
import fil from "./locales/fil.json";
import fr from "./locales/fr.json";
import gu from "./locales/gu.json";
import he from "./locales/he.json";
import hi from "./locales/hi.json";
import hr from "./locales/hr.json";
import hu from "./locales/hu.json";
import hy from "./locales/hy.json";
import id from "./locales/id.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import ka from "./locales/ka.json";
import kk from "./locales/kk.json";
import kn from "./locales/kn.json";
import ko from "./locales/ko.json";
import lt from "./locales/lt.json";
import lv from "./locales/lv.json";
import mk from "./locales/mk.json";
import ml from "./locales/ml.json";
import mr from "./locales/mr.json";
import ms from "./locales/ms.json";
import no from "./locales/no.json";
import pa from "./locales/pa.json";
import pl from "./locales/pl.json";
import pt from "./locales/pt.json";
import ro from "./locales/ro.json";
import ru from "./locales/ru.json";
import sk from "./locales/sk.json";
import sl from "./locales/sl.json";
import sq from "./locales/sq.json";
import sr from "./locales/sr.json";
import sv from "./locales/sv.json";
import sw from "./locales/sw.json";
import ta from "./locales/ta.json";
import te from "./locales/te.json";
import th from "./locales/th.json";
import tr from "./locales/tr.json";
import uk from "./locales/uk.json";
import ur from "./locales/ur.json";
import vi from "./locales/vi.json";
import zh from "./locales/zh.json";

// All languages are bundled eagerly. An earlier version lazy-loaded each
// language via dynamic import() to save memory, but Metro's web serializer
// doesn't reliably resolve those async chunks at runtime (fails with
// "Requiring unknown module") — see the accompanying fix in this commit.
// Bundling everything trades some bundle size for a language switch that
// actually works, and stays simple enough to reason about across platforms.
const RESOURCES: Record<string, { translation: Record<string, unknown> }> = {
  en: { translation: en },
  af: { translation: af },
  am: { translation: am },
  ar: { translation: ar },
  az: { translation: az },
  bg: { translation: bg },
  bn: { translation: bn },
  bs: { translation: bs },
  ca: { translation: ca },
  cs: { translation: cs },
  da: { translation: da },
  de: { translation: de },
  el: { translation: el },
  es: { translation: es },
  et: { translation: et },
  fa: { translation: fa },
  fi: { translation: fi },
  fil: { translation: fil },
  fr: { translation: fr },
  gu: { translation: gu },
  he: { translation: he },
  hi: { translation: hi },
  hr: { translation: hr },
  hu: { translation: hu },
  hy: { translation: hy },
  id: { translation: id },
  it: { translation: it },
  ja: { translation: ja },
  ka: { translation: ka },
  kk: { translation: kk },
  kn: { translation: kn },
  ko: { translation: ko },
  lt: { translation: lt },
  lv: { translation: lv },
  mk: { translation: mk },
  ml: { translation: ml },
  mr: { translation: mr },
  ms: { translation: ms },
  no: { translation: no },
  pa: { translation: pa },
  pl: { translation: pl },
  pt: { translation: pt },
  ro: { translation: ro },
  ru: { translation: ru },
  sk: { translation: sk },
  sl: { translation: sl },
  sq: { translation: sq },
  sr: { translation: sr },
  sv: { translation: sv },
  sw: { translation: sw },
  ta: { translation: ta },
  te: { translation: te },
  th: { translation: th },
  tr: { translation: tr },
  uk: { translation: uk },
  ur: { translation: ur },
  vi: { translation: vi },
  zh: { translation: zh },
};

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "af", label: "Afrikaans" },
  { code: "am", label: "አማርኛ" },
  { code: "ar", label: "العربية" },
  { code: "az", label: "Azərbaycan dili" },
  { code: "bg", label: "Български" },
  { code: "bn", label: "বাংলা" },
  { code: "bs", label: "Bosanski" },
  { code: "ca", label: "Català" },
  { code: "cs", label: "Čeština" },
  { code: "da", label: "Dansk" },
  { code: "de", label: "Deutsch" },
  { code: "el", label: "Ελληνικά" },
  { code: "es", label: "Español" },
  { code: "et", label: "Eesti" },
  { code: "fa", label: "فارسی" },
  { code: "fi", label: "Suomi" },
  { code: "fil", label: "Filipino" },
  { code: "fr", label: "Français" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "he", label: "עברית" },
  { code: "hi", label: "हिन्दी" },
  { code: "hr", label: "Hrvatski" },
  { code: "hu", label: "Magyar" },
  { code: "hy", label: "Հայերեն" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "ka", label: "ქართული" },
  { code: "kk", label: "Қазақ тілі" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ko", label: "한국어" },
  { code: "lt", label: "Lietuvių" },
  { code: "lv", label: "Latviešu" },
  { code: "mk", label: "Македонски" },
  { code: "ml", label: "മലയാളം" },
  { code: "mr", label: "मराठी" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "no", label: "Norsk" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "pl", label: "Polski" },
  { code: "pt", label: "Português" },
  { code: "ro", label: "Română" },
  { code: "ru", label: "Русский" },
  { code: "sk", label: "Slovenčina" },
  { code: "sl", label: "Slovenščina" },
  { code: "sq", label: "Shqip" },
  { code: "sr", label: "Српски" },
  { code: "sv", label: "Svenska" },
  { code: "sw", label: "Kiswahili" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "th", label: "ไทย" },
  { code: "tr", label: "Türkçe" },
  { code: "uk", label: "Українська" },
  { code: "ur", label: "اردو" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
] as const;

const SUPPORTED_CODES: string[] = SUPPORTED_LANGUAGES.map((l) => l.code);

function systemLanguage(): string {
  const code = Localization.getLocales()[0]?.languageCode ?? "en";
  return SUPPORTED_CODES.includes(code) ? code : "en";
}

function resolveLanguage(): string {
  const override = useSettingsStore.getState().language;
  return override === "system" ? systemLanguage() : override;
}

// The one place that should be used to switch the active language. Every
// language's bundle is already registered in `resources` below, so this is
// just a synchronous handoff to i18next — no network/chunk load in flight,
// so there's no window where a screen could render raw keys mid-switch.
export function setActiveLanguage(lang: string): void {
  i18n.changeLanguage(lang);
}

i18n.use(initReactI18next).init({
  resources: RESOURCES,
  lng: resolveLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// The store starts at its default ("system") and only reflects the
// persisted override once AsyncStorage rehydration finishes, so the very
// first render may briefly use the device's system language (or English)
// before correcting itself once rehydration resolves — same lag the theme
// setting already lives with.
useSettingsStore.subscribe((state, prevState) => {
  if (state.language !== prevState.language) {
    setActiveLanguage(resolveLanguage());
  }
});

const FACE_KEYS: Record<number, string> = {
  1: "lion",
  2: "elephant",
  3: "monkey",
  4: "tiger",
  5: "giraffe",
  6: "zebra",
};

// Non-hook accessor for code that builds display strings outside of a
// React render (e.g. useGameStore's message templates) — components that
// also call useTranslation() re-render on language change and will pick up
// the new value here; store state computed once at action-time (like a
// stored game-log message) intentionally does not retroactively translate.
export function getFaceName(faceId: number): string {
  return i18n.t(`faces.${FACE_KEYS[faceId]}`);
}

export default i18n;
