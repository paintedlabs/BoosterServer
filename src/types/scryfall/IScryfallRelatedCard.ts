import { IScryfallObject } from "./IScryfallObject";

/**
 * Cards that are closely related to other cards (because they call them by
 * name, or generate a token, or meld, etc) have a `all_parts` property that
 * contains Related Card objects.
 */
export interface IScryfallRelatedCard extends IScryfallObject {
  /**
   * A content type for this object, always related_card.
   */
  object: "related_card";

  /**
   * An unique ID for this card in Scryfall’s database.
   */
  id: string;

  /**
   * A field explaining what role this card plays in this relationship.
   */
  component: "token" | "meld_part" | "meld_result" | "combo_piece" | string;

  /**
   * The name of this particular related card.
   */
  name: string;

  /**
   * The type line of this card.
   */
  type_line: string;

  /**
   * A URI where you can retrieve a full object describing this card on
   * Scryfall’s API.
   */
  uri: string;
}
