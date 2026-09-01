export type AssetType = "CR" | "AC" | "RF";

export interface Asset {
  id: number;
  name: string;
  ticker: string;
  type: AssetType;
  value: number;
  change: number;
}

export interface HistoryEntry {
  date: string;
  value: number;
}

export interface Currency {
  id: string;
  ticker: string;
  name: string;
  rate: number;
  variation: number;
  fee: number;
}

export interface NewsItem {
  id: number;
  category: string;
  title: string;
  time: string;
  impact: string;
  description: string;
}

export type TransferStatusKey = "concluded" | "processing" | "failed";

export interface TransferAccount {
  id: string;
  label: string;
}

export interface TransferHistoryItem {
  id: number;
  amount: number;
  bank: string;
  date: string;
  status: TransferStatusKey;
}
