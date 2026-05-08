export type ListType =
  | "home"
  | "fun"
  | "creative"
  | "food"
  | "movies"
  | "boardgames"
  | "videogames"
  | "trails"
  | "thriftstores"
  | "restaurants"
  | "custom";

export type Tab = "lists" | "itinerary" | "picker" | "profile";

export interface ListItem {
  id: string;
  couple_id: string;
  type: ListType;
  name: string;
  plays: number;
  favorite: boolean;
  checkout: boolean;
  created_at: string;
}

export interface CoupleMember {
  id: string;
  couple_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
}

export interface ScheduledDate {
  id: string;
  couple_id: string;
  list_item_id: string | null;
  title: string;
  scheduled_for: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}
