import { IScryfallObject } from "./IScryfallObject";

/**
 * Scryfall provides daily exports of our card data in bulk files. Each of these files is represented as a `bulk_data`
 * object via the API. URLs for files change their timestamp each day.
 */
export interface IScryfallBulkData extends IScryfallObject {
  /**
   * @inheritDoc
   */
  object: "bulk_data";

  /**
   * A unique ID for this bulk item.
   */
  id: string;

  /**
   * The Scryfall API URI for this file.
   */
  uri: string;

  /**
   * A computer-readable string for the kind of bulk item.
   */
  type: string;

  /**
   * A human-readable name for this file.
   */
  name: string;

  /**
   * A human-readable description for this file.
   */
  description: string;

  /**
   * The URI that hosts this bulk file for fetching.
   */
  download_uri: string;

  /**
   * The time when this file was last updated.
   */
  updated_at: string;

  /**
   * The size of this file in integer bytes.
   */
  size: number;

  /**
   * The MIME type of this file.
   */
  content_type: string;

  /**
   * The Content-Encoding encoding that will be used to transmit this file when you download it.
   */
  content_encoding: string;
}
