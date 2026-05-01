"use client";

import confetti from "canvas-confetti";
import { CalendarDays, Check, ExternalLink, Heart, MapPin, Plus, Shuffle, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import type { ListItem, ListType, ScheduledDate } from "@/types";

type Props = {
  coupleId: string;
};

type ActivitySection = {
  id: Extract<ListType, "home" | "fun" | "creative" | "food">;
  title: string;
  accent: string;
  bg: string;
  text: string;
  legacyTypes: ListType[];
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type PlaceChoice = {
  id: string;
  name: string;
  detail: string;
  href: string;
};

const sections: ActivitySection[] = [
  {
    id: "home",
    title: "At home",
    accent: "text-[#c98512]",
    bg: "bg-[#fff2b8]",
    text: "text-[#4b3440]",
    legacyTypes: ["movies", "boardgames", "videogames"],
  },
  {
    id: "fun",
    title: "Get out",
    accent: "text-[#1c8f79]",
    bg: "bg-[#dffbf1]",
    text: "text-[#284c45]",
    legacyTypes: ["trails", "thriftstores"],
  },
  {
    id: "creative",
    title: "Make something",
    accent: "text-[#7f63c7]",
    bg: "bg-[#eee7ff]",
    text: "text-[#433963]",
    legacyTypes: ["custom"],
  },
  {
    id: "food",
    title: "Let's eat",
    accent: "text-[#d66a46]",
    bg: "bg-[#ffe2d4]",
    text: "text-[#5d382f]",
    legacyTypes: ["restaurants"],
  },
];

const movieRecommendations: Record<string, string[]> = {
  comedy: ["Palm Springs", "Crazy Rich Asians", "Game Night", "The Proposal", "10 Things I Hate About You"],
  romance: ["About Time", "Set It Up", "The Big Sick", "Pride & Prejudice", "Love, Rosie"],
  thriller: ["Knives Out", "The Prestige", "Searching", "A Simple Favor", "Source Code"],
  animated: ["Spider-Man: Into the Spider-Verse", "Howl's Moving Castle", "Ratatouille", "The Mitchells vs. the Machines", "Kiki's Delivery Service"],
  cozy: ["Julie & Julia", "The Holiday", "Little Women", "Paddington 2", "You've Got Mail"],
};

function getSectionForItem(item: ListItem) {
  return sections.find((section) => item.type === section.id || section.legacyTypes.includes(item.type)) ?? sections[0];
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isRandomMovie(item: ListItem) {
  return item.name.trim().toLowerCase() === "random movie night";
}

function isNearbyTrail(item: ListItem) {
  return item.name.trim().toLowerCase() === "nearby trail or park";
}

function isCraftSpot(item: ListItem) {
  return item.name.trim().toLowerCase() === "find a nearby craft spot";
}

function isRandomRestaurant(item: ListItem) {
  return item.name.trim().toLowerCase() === "random restaurant nearby";
}

function isSuggestionStarter(item: ListItem) {
  return isRandomMovie(item) || isNearbyTrail(item) || isCraftSpot(item) || isRandomRestaurant(item);
}

function shuffle<T>(values: T[]) {
  return [...values].sort(() => Math.random() - 0.5);
}

function getCurrentPosition() {
  return new Promise<Coordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error("Could not get location.")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

function mapsHref(name: string, coordinates?: Coordinates) {
  const query = encodeURIComponent(name);
  if (!coordinates) return `https://www.google.com/maps/search/${query}`;
  return `https://www.google.com/maps/search/${query}/@${coordinates.latitude},${coordinates.longitude},14z`;
}

export default function PickerPage({ coupleId }: Props) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [scheduledDates, setScheduledDates] = useState<ScheduledDate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scheduledFor, setScheduledFor] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [movieGenre, setMovieGenre] = useState("comedy");
  const [pricePoint, setPricePoint] = useState("$$");
  const [zipCode, setZipCode] = useState("");
  const [manualLocationItemId, setManualLocationItemId] = useState<string | null>(null);
  const [suggestionItemId, setSuggestionItemId] = useState<string | null>(null);
  const [movieChoices, setMovieChoices] = useState<string[]>([]);
  const [placeChoices, setPlaceChoices] = useState<PlaceChoice[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    loadItems();
    loadScheduledDates();

    const listChannel = supabase
      .channel(`activities-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items", filter: `couple_id=eq.${coupleId}` },
        loadItems
      )
      .subscribe();

    const calendarChannel = supabase
      .channel(`scheduled-dates-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_dates", filter: `couple_id=eq.${coupleId}` },
        loadScheduledDates
      )
      .subscribe();

    return () => {
      supabase.removeChannel(listChannel);
      supabase.removeChannel(calendarChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const checkoutItems = useMemo(() => {
    return items.filter((item) => item.checkout).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const sortedScheduledDates = useMemo(() => {
    return [...scheduledDates].sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  }, [scheduledDates]);

  const selectedItems = useMemo(() => {
    return checkoutItems.filter((item) => selectedIds.has(item.id));
  }, [checkoutItems, selectedIds]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function loadItems() {
    const { data } = await supabase
      .from("list_items")
      .select("*")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false });

    setItems((data ?? []) as ListItem[]);
  }

  async function loadScheduledDates() {
    const { data } = await supabase
      .from("scheduled_dates")
      .select("*")
      .eq("couple_id", coupleId)
      .order("scheduled_for", { ascending: true });

    setScheduledDates((data ?? []) as ScheduledDate[]);
  }

  async function toggleFavorite(item: ListItem) {
    await supabase.from("list_items").update({ favorite: !item.favorite }).eq("id", item.id);
  }

  async function removeFromCheckout(item: ListItem) {
    const { error } = await supabase.from("list_items").update({ checkout: false }).eq("id", item.id);
    if (error) {
      notify("Could not remove from checkout");
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    notify("Removed from checkout");
  }

  function toggleSelected(item: ListItem) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function pickRandom() {
    if (!checkoutItems.length) return;
    const randomItem = checkoutItems[Math.floor(Math.random() * checkoutItems.length)];
    setSelectedIds(new Set([randomItem.id]));
    notify(`Selected ${randomItem.name}`);
  }

  async function scheduleSelected() {
    if (!selectedItems.length || !scheduledFor || saving) return;
    setSaving(true);

    const { data: authData } = await supabase.auth.getUser();
    const rows = selectedItems.map((item) => ({
      couple_id: coupleId,
      list_item_id: item.id,
      title: item.name,
      scheduled_for: scheduledFor,
      notes: notes.trim() || null,
      created_by: authData.user?.id ?? null,
    }));

    const { error } = await supabase.from("scheduled_dates").insert(rows);

    if (error) {
      notify("Could not schedule date");
      setSaving(false);
      return;
    }

    await Promise.all(
      selectedItems.map((item) =>
        supabase
          .from("list_items")
          .update({ checkout: false, plays: item.plays + 1 })
          .eq("id", item.id)
      )
    );

    setSelectedIds(new Set());
    setNotes("");
    setScheduledFor("");
    setSaving(false);
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.65 } });
    notify(selectedItems.length === 1 ? "Date scheduled" : "Dates scheduled");
    loadItems();
    loadScheduledDates();
  }

  async function deleteScheduledDate(date: ScheduledDate) {
    await supabase.from("scheduled_dates").delete().eq("id", date.id);
    notify("Removed from calendar");
    loadScheduledDates();
  }

  function clearSuggestions() {
    setSuggestionItemId(null);
    setMovieChoices([]);
    setPlaceChoices([]);
    setManualLocationItemId(null);
  }

  function showMovieChoices(item: ListItem) {
    const choices = shuffle(movieRecommendations[movieGenre] ?? movieRecommendations.comedy).slice(0, 3);
    setSuggestionItemId(item.id);
    setMovieChoices(choices);
    setPlaceChoices([]);
    setManualLocationItemId(null);
  }

  function placeQueryForItem(item: ListItem) {
    if (isNearbyTrail(item)) {
      return `
        node(around:12000,{{lat}},{{lon}})["leisure"~"park|nature_reserve|garden"];
        way(around:12000,{{lat}},{{lon}})["leisure"~"park|nature_reserve|garden"];
        relation(around:12000,{{lat}},{{lon}})["leisure"~"park|nature_reserve|garden"];
      `;
    }

    if (isCraftSpot(item)) {
      return `
        node(around:16000,{{lat}},{{lon}})["shop"="craft"];
        node(around:16000,{{lat}},{{lon}})["amenity"="arts_centre"];
        node(around:16000,{{lat}},{{lon}})["craft"];
      `;
    }

    return `
      node(around:12000,{{lat}},{{lon}})["amenity"~"restaurant|cafe"];
      way(around:12000,{{lat}},{{lon}})["amenity"~"restaurant|cafe"];
    `;
  }

  function placeFallbackLabel(item: ListItem) {
    if (isNearbyTrail(item)) return "trail or park";
    if (isCraftSpot(item)) return "craft spot";
    return `${pricePoint} restaurant`;
  }

  async function geocodeZip(zip: string): Promise<Coordinates> {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&postalcode=${encodeURIComponent(zip)}`);
    const results = (await response.json()) as { lat: string; lon: string }[];
    if (!results.length) throw new Error("Could not find that ZIP code.");
    return { latitude: Number(results[0].lat), longitude: Number(results[0].lon) };
  }

  async function fetchPlaceChoices(item: ListItem, coordinates: Coordinates) {
    const rawQuery = placeQueryForItem(item)
      .replaceAll("{{lat}}", String(coordinates.latitude))
      .replaceAll("{{lon}}", String(coordinates.longitude));
    const query = `[out:json][timeout:16];(${rawQuery});out center tags 18;`;
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });
    const result = (await response.json()) as {
      elements?: {
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: { name?: string; cuisine?: string; amenity?: string; leisure?: string; shop?: string };
      }[];
    };

    const choices = (result.elements ?? [])
      .map((element) => {
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        const name = element.tags?.name?.trim();
        if (!lat || !lon || !name) return null;
        const detail = [element.tags?.cuisine, element.tags?.amenity, element.tags?.leisure, element.tags?.shop]
          .filter(Boolean)
          .join(" / ");
        return {
          id: String(element.id),
          name,
          detail: detail || placeFallbackLabel(item),
          href: mapsHref(name, { latitude: lat, longitude: lon }),
        };
      })
      .filter((choice): choice is PlaceChoice => Boolean(choice));

    const uniqueChoices = Array.from(new Map(choices.map((choice) => [choice.name.toLowerCase(), choice])).values());
    return shuffle(uniqueChoices).slice(0, 5);
  }

  async function showNearbyChoices(item: ListItem, zipOverride?: string) {
    setSuggestionsLoading(true);
    setSuggestionItemId(item.id);
    setMovieChoices([]);
    setPlaceChoices([]);

    try {
      const coordinates = zipOverride ? await geocodeZip(zipOverride) : await getCurrentPosition();
      const choices = await fetchPlaceChoices(item, coordinates);
      if (!choices.length) {
        setPlaceChoices([
          {
            id: "maps-search",
            name: `Search for a nearby ${placeFallbackLabel(item)}`,
            detail: "No exact open-map matches came back. Open a broader map search.",
            href: mapsHref(`${placeFallbackLabel(item)} near ${zipOverride ?? "me"}`, coordinates),
          },
        ]);
      } else {
        setPlaceChoices(choices);
      }
      setManualLocationItemId(null);
    } catch {
      if (zipOverride) notify("Could not find choices for that ZIP");
      else {
        setManualLocationItemId(item.id);
        notify("Enter a ZIP code instead");
      }
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function addSuggestionToCheckout(sourceItem: ListItem, title: string, detail?: string) {
    const { data, error } = await supabase
      .from("list_items")
      .insert({
        couple_id: coupleId,
        type: sourceItem.type,
        name: detail ? `${title} - ${detail}` : title,
        plays: 0,
        favorite: false,
        checkout: true,
      })
      .select("*")
      .single();

    if (error) {
      notify("Could not add suggestion");
      return;
    }

    await supabase.from("list_items").update({ checkout: false }).eq("id", sourceItem.id);
    if (data?.id) setSelectedIds(new Set([data.id]));
    clearSuggestions();
    notify("Added suggestion to checkout");
    loadItems();
  }

  return (
    <section className="px-4 pb-32 pt-5 text-[#493343]">
      <Toast message={toast} />

      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Checkout</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#3f2a39]">Plan dates</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#8b687e]">
          Add ideas from Lists, choose what you want to do, then assign a date and notes for the shared calendar.
        </p>
      </div>

      <div className="space-y-3">
        {checkoutItems.length ? (
          checkoutItems.map((item) => {
            const section = getSectionForItem(item);
            const selected = selectedIds.has(item.id);

            return (
              <article key={item.id} className={`rounded-lg border p-4 shadow-xl shadow-[#e06f92]/10 ${section.bg} ${selected ? "border-[#ff8fab]" : "border-white/70"}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSelected(item)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                      selected ? "border-[#ff8fab] bg-[#ff8fab] text-white" : "border-white/70 bg-white/60 text-[#b48ca0] hover:text-[#d65b82]"
                    }`}
                    aria-label={selected ? `Unselect ${item.name}` : `Select ${item.name}`}
                  >
                    {selected ? <Check size={18} /> : <ShoppingBag size={17} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[0.62rem] font-medium uppercase tracking-[0.2em] opacity-60 ${section.accent}`}>{section.title}</p>
                    <h3 className={`truncate text-sm font-medium ${section.text}`}>{item.name}</h3>
                  </div>
                  <button
                    onClick={() => toggleFavorite(item)}
                    className={`rounded-lg p-2 transition hover:bg-white/10 ${section.accent}`}
                    aria-label={item.favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
                  >
                    <Heart size={18} fill={item.favorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => removeFromCheckout(item)}
                    className="rounded-lg p-2 text-[#9a7187] transition hover:bg-white/60 hover:text-[#c7466f]"
                    aria-label={`Remove ${item.name} from checkout`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                {isSuggestionStarter(item) && (
                  <div className="mt-3 rounded-lg border border-white/70 bg-white/55 p-3">
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] ${section.accent}`}>Choose in app</p>

                    {isRandomMovie(item) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={movieGenre}
                          onChange={(event) => setMovieGenre(event.target.value)}
                          className="rounded-md border border-[#f3bfd0] bg-white px-2 py-2 text-xs font-medium text-[#493343] outline-none"
                        >
                          {Object.keys(movieRecommendations).map((genre) => (
                            <option key={genre} value={genre}>
                              {genre[0].toUpperCase()}
                              {genre.slice(1)}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => showMovieChoices(item)}
                          className={`inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-xs font-semibold ${section.accent}`}
                        >
                          <Sparkles size={14} />
                          Show movies
                        </button>
                      </div>
                    )}

                    {isRandomRestaurant(item) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {["$", "$$", "$$$"].map((price) => (
                          <button
                            key={price}
                            onClick={() => setPricePoint(price)}
                            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                              pricePoint === price
                                ? "border-[#ffd67d] bg-[#ffe36e] text-[#6e4d09]"
                                : "border-white/70 bg-white/75 text-[#8b687e]"
                            }`}
                          >
                            {price}
                          </button>
                        ))}
                      </div>
                    )}

                    {!isRandomMovie(item) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => showNearbyChoices(item)}
                          disabled={suggestionsLoading && suggestionItemId === item.id}
                          className={`inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-xs font-semibold ${section.accent} disabled:opacity-50`}
                        >
                          <MapPin size={14} />
                          {suggestionsLoading && suggestionItemId === item.id ? "Finding..." : "Use my location"}
                        </button>
                        <input
                          inputMode="numeric"
                          value={zipCode}
                          onChange={(event) => setZipCode(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") showNearbyChoices(item, zipCode.trim());
                          }}
                          placeholder="ZIP code"
                          className="w-28 rounded-md border border-[#f3bfd0] bg-white px-2 py-2 text-xs font-medium text-[#493343] outline-none placeholder:text-[#b48ca0]"
                        />
                        <button
                          onClick={() => showNearbyChoices(item, zipCode.trim())}
                          className={`rounded-md bg-white px-3 py-2 text-xs font-semibold ${section.accent}`}
                        >
                          Search
                        </button>
                      </div>
                    )}

                    {manualLocationItemId === item.id && (
                      <p className="mt-2 text-xs text-[#8b687e]">Location did not work, so enter a ZIP code and tap Search.</p>
                    )}

                    {suggestionItemId === item.id && movieChoices.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {movieChoices.map((movie) => (
                          <button
                            key={movie}
                            onClick={() => addSuggestionToCheckout(item, `Movie night: ${movie}`, `${movieGenre} movie`)}
                            className="flex items-center justify-between gap-3 rounded-md border border-white/70 bg-white/75 px-3 py-2 text-left text-sm font-semibold text-[#493343]"
                          >
                            <span>{movie}</span>
                            <Plus size={15} />
                          </button>
                        ))}
                      </div>
                    )}

                    {suggestionItemId === item.id && placeChoices.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {placeChoices.map((place) => (
                          <div key={place.id} className="rounded-md border border-white/70 bg-white/75 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-[#493343]">{place.name}</p>
                                <p className="mt-1 text-xs text-[#8b687e]">{place.detail}</p>
                              </div>
                              <a href={place.href} target="_blank" rel="noreferrer" className={`rounded-md p-1.5 ${section.accent}`} aria-label={`Open ${place.name} on map`}>
                                <ExternalLink size={15} />
                              </a>
                            </div>
                            <button
                              onClick={() => addSuggestionToCheckout(item, place.name, place.detail)}
                              className={`mt-3 inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-xs font-semibold ${section.accent}`}
                            >
                              <Plus size={14} />
                              Add this choice
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-[#f3bfd0] bg-white/55 p-8 text-center text-sm text-[#8b687e]">
            Your checkout is empty. Open Lists, choose a category, and tap add on any date idea that sounds good.
          </div>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-[#f3bfd0] bg-white/75 p-4 shadow-2xl shadow-[#e06f92]/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e06f92]">Schedule</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#3f2a39]">{selectedItems.length || "No"} selected</h3>
          </div>
          <button
            onClick={pickRandom}
            disabled={!checkoutItems.length}
            className="inline-flex items-center gap-2 rounded-lg border border-[#ffd67d] bg-[#fff3bf] px-3 py-2 text-sm font-semibold text-[#6e4d09] transition hover:bg-[#ffe36e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Shuffle size={16} />
            Random
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <input
            type="date"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
            className="h-11 rounded-lg border border-[#f3bfd0] bg-white/85 px-3 text-sm text-[#493343] outline-none focus:border-[#ff8fab]"
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes, reservations, reminders..."
            rows={3}
            className="resize-none rounded-lg border border-[#f3bfd0] bg-white/85 px-3 py-3 text-sm text-[#493343] outline-none placeholder:text-[#c9a7b8] focus:border-[#ff8fab]"
          />
          <button
            onClick={scheduleSelected}
            disabled={!selectedItems.length || !scheduledFor || saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#ff8fab] px-4 py-3 font-semibold text-white shadow-lg shadow-[#ff8fab]/25 transition hover:bg-[#f7729b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CalendarDays size={18} />
            {saving ? "Scheduling..." : "Schedule date"}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Calendar</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[#3f2a39]">Upcoming</h3>
          </div>
          <span className="rounded bg-[#ffe36e] px-2 py-1 text-xs font-semibold text-[#6e4d09]">{sortedScheduledDates.length}</span>
        </div>

        <div className="space-y-3">
          {sortedScheduledDates.length ? (
            sortedScheduledDates.map((date) => (
              <article key={date.id} className="rounded-lg border border-[#f3bfd0] bg-white/75 p-4 shadow-xl shadow-[#e06f92]/10">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border border-[#ffd67d] bg-[#fff3bf] px-3 py-2 text-center text-sm font-semibold text-[#8a6514]">
                    {formatDate(date.scheduled_for)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-semibold tracking-tight">{date.title}</h4>
                    {date.notes && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#8b687e]">{date.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteScheduledDate(date)}
                    className="rounded-lg p-2 text-[#9a7187] transition hover:bg-[#fff0f5] hover:text-[#c7466f]"
                    aria-label={`Remove ${date.title} from calendar`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-[#f3bfd0] bg-white/55 p-8 text-center text-sm text-[#8b687e]">
              Scheduled dates will show up here for both people in the couple.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
