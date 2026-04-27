export type ListType = "movies" | "boardgames" | "videogames" | "trails" | "thriftstores" | "restaurants" | "custom";

export type Tab = "lists" | "favorites" | "picker" | "stats";

export interface ListItem {
  id: string;
  couple_id: string;
  type: ListType;
  name: string;
  plays: number;
  favorite: boolean;
  created_at: string;
}

export interface CoupleMember {
  id: string;
  couple_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
}
