export type TransferType = "PIX" | "TED" | "DOC";
export type TransferStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface BankAccount {
  id: string;
  bank: string;
  agency: string;
  account: string;
  holderName?: string;
  type?: TransferType;
}

export interface Transfer {
  id: string;
  status: TransferStatus;
  type: TransferType;
  amount: number;
  description?: string | null;
  toAccount?: BankAccount;
  createdAt: string;
  completedAt?: string | null;
  failureReason?: string;
}

export interface TransferList {
  items: Transfer[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTransferInput {
  type: TransferType;
  amount: number;
  description?: string;
  toAccount?: Partial<BankAccount>;
}
