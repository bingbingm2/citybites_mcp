import { MCPServer, error, text, widget } from "mcp-use/server";
import { z } from "zod";
import OpenAI from "openai";
import { tavily } from "@tavily/core";
import { parse } from "node-html-parser";

const server = new MCPServer({
  name: "citybites",
  title: "CityBites",
  version: "1.0.0",
  description: "AI travel companion that helps you explore cities through food — find locally representative restaurants, understand dishes, and build a taste itinerary.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
function getTavily() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });
}

// Simple in-memory cache to avoid redundant API calls
const cache = new Map<string, { data: unknown; expires: number }>();
function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  return null;
}
function setCache(key: string, data: unknown, ttlMs = 10 * 60 * 1000) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

// ─── TOOL 1: search-city-food ────────────────────────────────────────────────

server.tool(
  {
    name: "search-city-food",
    description:
      "Search for locally representative restaurants in a city. Returns a visual card grid with restaurant names, neighborhoods, cuisine types, and URLs. Use this as the first step when a user wants food recommendations for a city.",
    schema: z.object({
      city: z.string().describe("The city to search for food in (e.g. 'Tokyo', 'Mexico City', 'Lisbon')"),
    }),
    widget: {
      name: "restaurant-spots",
      invoking: "Searching for local food spots...",
      invoked: "Restaurants found",
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ city }) => {
    if (!process.env.TAVILY_API_KEY) return error("TAVILY_API_KEY not configured.");
    if (!process.env.OPENAI_API_KEY) return error("OPENAI_API_KEY not configured.");

    const cacheKey = `restaurants:${city.toLowerCase()}`;
    const cached = getCache<{ restaurants: Restaurant[] }>(cacheKey);

    let restaurants: Restaurant[];

    if (cached) {
      restaurants = cached.restaurants;
    } else {
      try {
        const searchResults = await getTavily().search(
          `best local authentic restaurants to try in ${city} food guide`,
          {
            searchDepth: "advanced",
            maxResults: 8,
            includeAnswer: true,
          }
        );

        const snippets = searchResults.results
          .map((r) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`)
          .join("\n\n");

        const completion = await getOpenAI().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a local food expert. Extract restaurant recommendations from search results and return a JSON array. Each restaurant must have: name (string), neighborhood (string), cuisineType (string), vibeTagline (string, max 8 words capturing the local feel), whyLocal (string, 1 sentence on why locals love it), url (string, use the source URL or empty string if none). Return ONLY valid JSON array, no markdown.`,
            },
            {
              role: "user",
              content: `City: ${city}\n\nSearch results:\n${snippets}\n\nExtract up to 6 restaurants. If a URL is a review/article page (not a restaurant's own site), still include it.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
        restaurants = (parsed.restaurants ?? parsed) as Restaurant[];
        if (!Array.isArray(restaurants)) restaurants = [];
        setCache(cacheKey, { restaurants });
      } catch (err) {
        console.error("search-city-food error:", err);
        return error(`Failed to search for restaurants in ${city}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return widget({
      props: { city, restaurants },
      output: text(`Found ${restaurants.length} local food spots in ${city}: ${restaurants.map((r) => r.name).join(", ")}`),
    });
  }
);

// ─── TOOL 2: get-menu-dishes ─────────────────────────────────────────────────

server.tool(
  {
    name: "get-menu-dishes",
    description:
      "Fetch a restaurant's menu and return its signature dishes with traveler-friendly descriptions and food images. Use this after search-city-food when the user wants to know what to order at a specific restaurant.",
    schema: z.object({
      restaurantName: z.string().describe("The name of the restaurant"),
      city: z.string().describe("The city the restaurant is in"),
      url: z.string().optional().describe("The restaurant's website URL if available"),
    }),
    widget: {
      name: "menu-highlights",
      invoking: "Reading the menu...",
      invoked: "Dishes ready",
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ restaurantName, city, url }) => {
    if (!process.env.OPENAI_API_KEY) return error("OPENAI_API_KEY not configured.");

    const cacheKey = `menu:${city.toLowerCase()}:${restaurantName.toLowerCase()}`;
    const cached = getCache<{ dishes: Dish[] }>(cacheKey);

    let dishes: Dish[];

    if (cached) {
      dishes = cached.dishes;
    } else {
      try {
        let menuContext = "";

        // Try to fetch menu text from the restaurant URL
        if (url && url.startsWith("http")) {
          try {
            const res = await fetch(url, {
              headers: { "User-Agent": "Mozilla/5.0 (compatible; CityBitesBot/1.0)" },
              signal: AbortSignal.timeout(8000),
            });
            const html = await res.text();
            const root = parse(html);
            // Remove scripts, styles, nav
            root.querySelectorAll("script, style, nav, footer, header").forEach((el) => el.remove());
            const rawText = root.structuredText.replace(/\s+/g, " ").slice(0, 4000);
            menuContext = `\n\nRestaurant website content:\n${rawText}`;
          } catch {
            // URL fetch failed — fall through to web search
          }
        }

        // If no menu text, search for the menu
        if (!menuContext && process.env.TAVILY_API_KEY) {
          const menuSearch = await getTavily().search(
            `${restaurantName} ${city} menu dishes food`,
            { maxResults: 4, searchDepth: "basic" }
          );
          menuContext = "\n\nSearch results about this restaurant:\n" +
            menuSearch.results.map((r) => r.content).join("\n");
        }

        const completion = await getOpenAI().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a food guide writer helping travelers understand local dishes. Given a restaurant and city, return a JSON object with a "dishes" array. Each dish: name (string), description (string, 2 sentences: what it is + why it matters to the city's food culture), mealType (one of: "breakfast","lunch","dinner","snack","drink"), imageQuery (string, a short Unsplash search query for a photo of this dish, e.g. "ramen noodle soup bowl"). Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: `Restaurant: ${restaurantName}\nCity: ${city}${menuContext}\n\nReturn 4-5 signature dishes.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
        dishes = (parsed.dishes ?? []) as Dish[];

        // Fetch Unsplash images for each dish
        if (process.env.UNSPLASH_ACCESS_KEY) {
          dishes = await Promise.all(
            dishes.map(async (dish) => {
              try {
                const imgRes = await fetch(
                  `https://api.unsplash.com/search/photos?query=${encodeURIComponent(dish.imageQuery)}&per_page=1&orientation=landscape`,
                  { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
                );
                const imgData = (await imgRes.json()) as { results?: { urls?: { small?: string } }[] };
                return { ...dish, imageUrl: imgData.results?.[0]?.urls?.small ?? "" };
              } catch {
                return { ...dish, imageUrl: "" };
              }
            })
          );
        }

        setCache(cacheKey, { dishes });
      } catch (err) {
        console.error("get-menu-dishes error:", err);
        return error(`Failed to get menu for ${restaurantName}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return widget({
      props: { restaurantName, city, dishes },
      output: text(`${restaurantName} serves: ${dishes.map((d) => d.name).join(", ")}`),
    });
  }
);

// ─── TOOL 3: build-taste-itinerary ───────────────────────────────────────────

server.tool(
  {
    name: "build-taste-itinerary",
    description:
      "Compose a time-aware taste itinerary for a city — morning coffee, afternoon snack, dinner, and late bites — with cultural context explaining why each dish represents the city. Use this when the user wants a full day food plan.",
    schema: z.object({
      city: z.string().describe("The city to build the itinerary for"),
      preferences: z.string().optional().describe("Optional dietary preferences or interests, e.g. 'vegetarian', 'street food only', 'no seafood'"),
    }),
    widget: {
      name: "taste-itinerary",
      invoking: "Composing your taste itinerary...",
      invoked: "Itinerary ready",
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ city, preferences }) => {
    if (!process.env.OPENAI_API_KEY) return error("OPENAI_API_KEY not configured.");
    if (!process.env.TAVILY_API_KEY) return error("TAVILY_API_KEY not configured.");

    const cacheKey = `itinerary:${city.toLowerCase()}:${(preferences ?? "").toLowerCase()}`;
    const cached = getCache<{ stops: ItineraryStop[] }>(cacheKey);

    let stops: ItineraryStop[];

    if (cached) {
      stops = cached.stops;
    } else {
      try {
        // Search for cultural food context
        const [foodSearch, cultureSearch] = await Promise.all([
          getTavily().search(`${city} iconic local food dishes must try authentic`, { maxResults: 5, searchDepth: "advanced" }),
          getTavily().search(`${city} food culture history traditional cuisine`, { maxResults: 4, searchDepth: "basic" }),
        ]);

        const context = [
          ...foodSearch.results.map((r) => r.content),
          ...cultureSearch.results.map((r) => r.content),
        ].join("\n\n").slice(0, 5000);

        const prefNote = preferences ? `\nUser preferences: ${preferences}` : "";

        const completion = await getOpenAI().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a local food historian and travel guide. Create a one-day taste itinerary for a traveler. Return a JSON object with a "stops" array. Each stop: timeSlot (one of: "Morning Coffee","Midday Snack","Dinner","Late Bites"), timeRange (string, e.g. "8:00–10:00 AM"), restaurantName (string), neighborhood (string), dish (string, the must-order item), dishDescription (string, 1 sentence plain-English explanation of what it is), culturalContext (string, 2 sentences on why this dish/place is deeply tied to the city's identity), walkingNote (string, 1 short sentence on the vibe of the neighborhood). Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: `City: ${city}${prefNote}\n\nContext from web:\n${context}\n\nBuild a 4-stop day itinerary (morning, midday, dinner, late).`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
        stops = (parsed.stops ?? []) as ItineraryStop[];
        setCache(cacheKey, { stops });
      } catch (err) {
        console.error("build-taste-itinerary error:", err);
        return error(`Failed to build itinerary for ${city}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return widget({
      props: { city, preferences: preferences ?? "", stops },
      output: text(`Taste itinerary for ${city}: ${stops.map((s) => `${s.timeSlot} → ${s.restaurantName} (${s.dish})`).join(" | ")}`),
    });
  }
);

// ─── Types (shared between server and widgets via inference) ──────────────────

export type Restaurant = {
  name: string;
  neighborhood: string;
  cuisineType: string;
  vibeTagline: string;
  whyLocal: string;
  url: string;
};

export type Dish = {
  name: string;
  description: string;
  mealType: string;
  imageQuery: string;
  imageUrl?: string;
};

export type ItineraryStop = {
  timeSlot: string;
  timeRange: string;
  restaurantName: string;
  neighborhood: string;
  dish: string;
  dishDescription: string;
  culturalContext: string;
  walkingNote: string;
};

server.listen().then(() => {
  console.log("CityBites MCP server running");
});
