import type { Language } from "../languages";
import type { Translation } from "../i18n-messages";
import it from "./it.json";
import nl from "./nl.json";
import pl from "./pl.json";
import sv from "./sv.json";
import da from "./da.json";
import nb from "./nb.json";
import fi from "./fi.json";
import cs from "./cs.json";
import ro from "./ro.json";
import hu from "./hu.json";
import el from "./el.json";
import tr from "./tr.json";
import ru from "./ru.json";
import uk from "./uk.json";
import zh from "./zh.json";
import ja from "./ja.json";
import ko from "./ko.json";
import hi from "./hi.json";
import th from "./th.json";
import he from "./he.json";

export const catalogs: Record<CatalogLanguage, Readonly<Record<string, string>>> = {
  it, nl, pl, sv, da, nb, fi, cs, ro, hu, el, tr, ru, uk, zh, ja, ko, hi, th, he,
};

export type CatalogLanguage = Exclude<Language, "en" | keyof Translation>;
