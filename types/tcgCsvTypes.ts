export interface TcgCsvProduct {
  productId: number;
  name: string;
  groupId: number;
  url?: string;
  imageUrl?: string;
  categoryId?: number;
  modifiedOn?: string;
  marketPrice?: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
}
