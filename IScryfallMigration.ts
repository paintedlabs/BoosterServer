import { IScryfallObject } from "./IScryfallObject";

/**
 * For the vast majority of Scryfall’s database, Magic card entries are
 * additive. We add new and upcoming cards as we learn about them and obtain
 * images.
 *
 * In rare instances, Scryfall may discover that a card in our database does not
 * really exist, or it has been deleted from a digital game permanently. In
 * these situations, we provide endpoints to help you reconcile downstream data
 * you may have synced or imported from Scryfall.
 */
export interface IScryfallMigration extends IScryfallObject {
  object: "migration";

  /**
   *  A link to the current object on Scryfall’s API.
   */
  uri: string;

  /**
   * This migration’s unique UUID.
   */
  id: string;

  /**
   * The date this migration was performed.
   */
  performed_at: string;

  /**
   * A computer-readable indicator of the migration strategy.
   *
   * `merge` - You should update your records to replace the given old Scryfall ID
   * with the new ID. The old ID is being discarded, and an existing record
   * should be used to replace all instances of it.
   *
   * `delete` - The given UUID is being discarded, and no replacement data is
   * being provided. This likely means the old records are fully invalid. This
   * migration exists to provide evidence that cards were removed from
   * Scryfall’s database.
   */
  migration_strategy: "merge" | "delete" | string;

  /**
   * The `id` of the affected API Card object.
   */
  old_scryfall_id: string;

  /**
   * The replacement `id` of the API Card object if this is a `merge`.
   */
  new_scryfall_id?: string | null;

  /**
   * A note left by the Scryfall team about this migration.
   */
  note?: string | null;

  /**
   * Additional context Scryfall has provided for this migration, designed to be
   * human-read only.
   */
  metadata?: Record<string, string> | null;
}
