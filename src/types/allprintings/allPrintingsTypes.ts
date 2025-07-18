import { CardAtomic } from '../mtgjson/mtgjsonTypes';

export interface AllPrintingsData {
  data: Record<
    string,
    {
      baseSetSize: number;
      block?: string;
      booster?: Record<string, number>;
      cards: CardAtomic[];
      code: string;
      codeV3?: string;
      isFoilOnly: boolean;
      isForeignOnly: boolean;
      isNonFoilOnly: boolean;
      isOnlineOnly: boolean;
      isPaperOnly: boolean;
      isPartialPreview: boolean;
      keyruneCode: string;
      languages?: string[];
      mcmId?: number;
      mcmIdExtras?: number;
      mcmName?: string;
      mtgoCode?: string;
      name: string;
      parentCode?: string;
      releaseDate: string;
      sealedProduct?: Array<{
        category: string;
        identifier: string;
        name: string;
        purchaseUrl?: string;
        releaseDate?: string;
      }>;
      tcgplayerGroupId?: number;
      tokens: Array<{
        artist?: string;
        borderColor: string;
        colorIdentity?: string[];
        colors?: string[];
        faceName?: string;
        flavorText?: string;
        frameVersion: string;
        hasFoil: boolean;
        hasNonFoil: boolean;
        identifiers: {
          cardKingdomFoilId?: string;
          cardKingdomId?: string;
          mcmId?: string;
          mcmMetaId?: string;
          mtgjsonV4Id: string;
          scryfallId?: string;
          scryfallIllustrationId?: string;
          scryfallOracleId?: string;
          tcgplayerProductId?: string;
        };
        isFullArt: boolean;
        isOnlineOnly: boolean;
        isPromo: boolean;
        isReprint: boolean;
        keywords?: string[];
        layout: string;
        loyalty?: string;
        name: string;
        number: string;
        power?: string;
        promoTypes?: string[];
        reverseRelated?: string[];
        setCode: string;
        side?: string;
        subtypes?: string[];
        supertypes?: string[];
        text?: string;
        toughness?: string;
        type: string;
        types: string[];
        uuid: string;
        watermark?: string;
      }>;
      totalSetSize: number;
      translations: Record<string, string>;
      type: string;
    }
  >;
  meta: {
    date: string;
    version: string;
  };
}
