export interface TransferAccount {
  id: string;
  userName: string;
  office: string;
  cbu: string;
  alias: string;
  wallet: 'mercadopago' | 'paypal';
  operator: string;
  agent: string;
  createdAt: Date;
  isActive: boolean;
  mp_client_id?: string;
  mp_client_secret?: string;
  mp_access_token?: string;
  mp_public_key?: string;
  receiver_id?: string;
} 