import { offerSchema, type Offer, type Filters, matches, rank } from "./domain";
import { z } from "zod";
export interface MiningConnector {
  id: string;
  description: string;
  search(offers: Offer[], filters: Filters): Offer[];
}
export const suppliedData: MiningConnector = {
  id: "user-supplied",
  description:
    "Cadastro manual e importação JSON do proprietário. Sem consulta automática à Meta.",
  search: (offers, filters) =>
    offers
      .filter((o) => matches(o, filters))
      .sort((a, b) => rank(b).score - rank(a).score)
      .slice(0, filters.limit),
};
export const importSchema = z.array(offerSchema).min(1).max(100);
