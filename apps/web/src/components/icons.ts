import { Building2, Briefcase, Construction, Gavel, HeartHandshake, House, Landmark, Receipt, Scale, Shield, ShieldAlert, ShoppingBag, Trash2, Wallet, type LucideIcon } from "lucide-react";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  money: ShoppingBag,
  work: Briefcase,
  home: House,
  civic: Building2,
  police: Shield,
  cyber: ShieldAlert,
  govt: Landmark,
  legal: Scale,
};

export const TILE_ICON: Record<string, LucideIcon> = {
  pothole: Construction,
  garbage: Trash2,
  police: Gavel,
  cyber: ShieldAlert,
  refund: Receipt,
  salary: Wallet,
  deposit: House,
  legalaid: HeartHandshake,
};
