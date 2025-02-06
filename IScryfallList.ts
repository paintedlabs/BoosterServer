import { IScryfallCard } from "./IScryfallCard";
import { IScryfallObject } from "./IScryfallObject";

/**
 * Represents a requested sequence of other objects (Cards, Sets, etc). List objects may be paginated, and also include
 * information about issues raised when generating the list.
 */
export interface IScryfallList<T extends IScryfallObject>
  extends IScryfallObject {
  /**
   * @inheritDoc
   */
  object: "list";

  /**
   * An array of the requested objects, in a specific order.
   */
  data: T[];

  /**
   * True if this List is paginated and there is a page beyond the current page.
   */
  has_more: boolean;

  /**
   * If there is a page beyond the current page, this field will contain a full API URI to that page. You may submit a
   * HTTP GET request to that URI to continue paginating forward on this List.
   */
  next_page?: string | null;

  /**
   * An array of human-readable warnings issued when generating this list, as strings. Warnings are non-fatal issues
   * that the API discovered with your input. In general, they indicate that the List will not contain the all the
   * information you requested. You should fix the warnings and re-submit your request.
   */
  warnings?: string[] | null;
}

export interface IScryfallCardList extends IScryfallList<IScryfallCard> {
  /**
   * The total number of cards found across all pages.
   */
  total_cards: number;
}
