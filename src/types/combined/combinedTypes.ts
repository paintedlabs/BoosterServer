import { UnifiedCard } from '../unified/unifiedTypes';
import { IScryfallCard } from '../scryfall/IScryfallCard';
import { TCGPlayerData } from '../unified/unifiedTypes';

export interface CombinedCard extends UnifiedCard {
  scryfall?: IScryfallCard;
  tcgplayer: TCGPlayerData;
}
