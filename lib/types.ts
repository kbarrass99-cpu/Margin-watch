export type TrackedProduct = {
  id: string;
  user_id: string;
  user_email: string;
  source_url: string;
  title: string | null;
  image_url: string | null;
  is_active: boolean;
  alert_threshold_percent: number;
  created_at: string;
};

export type Snapshot = {
  id: string;
  tracked_product_id: string;
  price: number | null;
  currency: string | null;
  in_stock: boolean | null;
  raw_status: string;
  checked_at: string;
};

export type Alert = {
  id: string;
  tracked_product_id: string;
  type: 'price_up' | 'price_down' | 'out_of_stock' | 'back_in_stock';
  message: string;
  created_at: string;
};
