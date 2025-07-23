import { IScryfallObject } from "./IScryfallObject";

/**
 * Scryfall provides an overall categorization for each Set in the [set_type]{@link IScryfallSet.set_type} property.
 */
export type ScryfallSetType =
  | "core"
  | "expansion"
  | "masters"
  | "alchemy"
  | "masterpiece"
  | "arsenal"
  | "from_the_vault"
  | "spellbook"
  | "premium_deck"
  | "duel_deck"
  | "draft_innovation"
  | "treasure_chest"
  | "commander"
  | "planechase"
  | "archenemy"
  | "vanguard"
  | "funny"
  | "starter"
  | "box"
  | "promo"
  | "token"
  | "memorabilia"
  | "minigame";

/**
 * A Set object represents a group of related Magic cards. All Card objects on Scryfall belong to exactly one set.
 *
 * Due to Magic’s long and complicated history, Scryfall includes many un-official sets as a way to group promotional or
 * outlier cards together. Such sets will likely have a [code]{@link code} that begins with `p` or `t`, such as `pcel`
 * or `tori`.
 *
 * Official sets always have a three-letter set code, such as `zen`.
 *
 * @see https://scryfall.com/docs/api/sets
 */
export interface IScryfallSet extends IScryfallObject {
  /**
   * @inheritDoc
   */
  object: "set";

  /**
   * A unique ID for this set on Scryfall that will not change.
   */
  id: string;

  /**
   * The unique three to five-letter code for this set.
   */
  code: string;

  /**
   * The unique code for this set on MTGO, which may differ from the regular code.
   */
  mtgo_code?: string | null;

  /**
   * The unique code for this set on Magic Arena.
   */
  arena_code?: string | null;

  /**
   * This set’s ID on TCGplayer’s API, also known as the `groupId`.
   */
  tcgplayer_id?: number | null;

  /**
   * The English name of the set.
   */
  name: string;

  /**
   * A computer-readable classification for this set.
   */
  set_type: ScryfallSetType | string;

  /**
   * The date the set was released or the first card was printed in the set (in GMT-8 Pacific time).
   */
  released_at?: string | null;

  /**
   * The block code for this set, if any.
   */
  block_code?: string | null;

  /**
   * The block or group name code for this set, if any.
   */
  block?: string | null;

  /**
   * The set code for the parent set, if any. `promo` and `token` sets often have a parent set.
   */
  parent_set_code?: string | null;

  /**
   * The number of cards in this set.
   */
  card_count: number;

  /**
   * The denominator for the set’s printed collector numbers.
   */
  printed_size?: number | null;

  /**
   * True if this set was only released in a video game.
   */
  digital: boolean;

  /**
   * True if this set contains only foil cards.
   */
  foil_only: boolean;

  /**
   * True if this set contains only nonfoil cards.
   */
  nonfoil_only: boolean;

  /**
   * A link to this set’s permapage on Scryfall’s website.
   */
  scryfall_uri: string;

  /**
   * A link to this set object on Scryfall’s API.
   */
  uri: string;

  /**
   * A URI to an SVG file for this set’s icon on Scryfall’s CDN. Hotlinking this image isn’t recommended, because it may
   * change slightly over time. You should download it and use it locally for your particular user interface needs.
   */
  icon_svg_uri: string;

  /**
   * A Scryfall API URI that you can request to begin paginating over the cards in this set.
   */
  search_uri: string;
}
