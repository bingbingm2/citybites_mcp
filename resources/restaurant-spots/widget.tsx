import { McpUseProvider, useWidget, useWidgetTheme, useCallTool, type WidgetMetadata } from "mcp-use/react";
import React, { useState } from "react";
import { propSchema, type RestaurantProps, type Restaurant } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Display locally representative restaurant recommendations for a city",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Searching for local food spots...",
    invoked: "Restaurants found",
    csp: { connectDomains: ["https://api.unsplash.com"] },
  },
};

function useColors() {
  const theme = useWidgetTheme();
  return {
    bg: theme === "dark" ? "#111" : "#fafaf8",
    card: theme === "dark" ? "#1c1c1c" : "#ffffff",
    border: theme === "dark" ? "#2a2a2a" : "#e8e4de",
    text: theme === "dark" ? "#f0ede8" : "#1a1714",
    textSecondary: theme === "dark" ? "#888" : "#6b6560",
    accent: "#d4622a",
    accentLight: theme === "dark" ? "#3a1f10" : "#fdf0e8",
    tag: theme === "dark" ? "#252525" : "#f2ede7",
    tagText: theme === "dark" ? "#aaa" : "#7a6f66",
    hover: theme === "dark" ? "#242424" : "#f7f3ee",
  };
}

const RestaurantCard: React.FC<{
  restaurant: Restaurant;
  index: number;
  colors: ReturnType<typeof useColors>;
  onGetMenu: (r: Restaurant) => void;
  isLoading: boolean;
}> = ({ restaurant, index, colors, onGetMenu, isLoading }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        backgroundColor: hovered ? colors.hover : colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: "20px",
        transition: "all 0.2s ease",
        cursor: "default",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor: colors.accentLight,
            color: colors.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {index + 1}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, lineHeight: 1.3 }}>
              {restaurant.name}
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              📍 {restaurant.neighborhood}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500,
          backgroundColor: colors.tag, color: colors.tagText,
          padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {restaurant.cuisineType}
        </span>
      </div>

      <div style={{
        fontSize: 13, fontStyle: "italic", color: colors.accent, fontWeight: 500,
      }}>
        "{restaurant.vibeTagline}"
      </div>

      <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 }}>
        {restaurant.whyLocal}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
        <button
          onClick={() => onGetMenu(restaurant)}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "8px 12px",
            backgroundColor: colors.accent,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {isLoading ? "Loading menu..." : "See what to order →"}
        </button>
        {restaurant.url && (
          <a
            href={restaurant.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 10px",
              backgroundColor: colors.tag,
              color: colors.tagText,
              border: "none",
              borderRadius: 10,
              fontSize: 12,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            🔗
          </a>
        )}
      </div>
    </div>
  );
};

const RestaurantSpots: React.FC = () => {
  const { props, isPending } = useWidget<RestaurantProps>();
  const colors = useColors();
  const { callTool: getMenuDishes, isPending: isMenuLoading } = useCallTool("get-menu-dishes");
  const { callTool: buildItinerary, isPending: isItineraryLoading } = useCallTool("build-taste-itinerary");
  const [loadingRestaurant, setLoadingRestaurant] = useState<string | null>(null);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ backgroundColor: colors.bg, padding: 24, borderRadius: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 20, width: 180, backgroundColor: colors.border, borderRadius: 6, marginBottom: 8, animation: "pulse 1.5s infinite" }} />
            <div style={{ height: 14, width: 120, backgroundColor: colors.border, borderRadius: 6, animation: "pulse 1.5s infinite" }} />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, marginBottom: 12, height: 120, animation: "pulse 1.5s infinite" }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      </McpUseProvider>
    );
  }

  const { city, restaurants } = props;

  const handleGetMenu = (restaurant: Restaurant) => {
    setLoadingRestaurant(restaurant.name);
    getMenuDishes(
      { restaurantName: restaurant.name, city, url: restaurant.url },
      { onSettled: () => setLoadingRestaurant(null) }
    );
  };

  return (
    <McpUseProvider autoSize>
      <div style={{ backgroundColor: colors.bg, padding: 20, borderRadius: 20, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            CityBites
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.text }}>
            Eat like a local in {city}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: colors.textSecondary }}>
            {restaurants.length} locally representative spots · tap any to see what to order
          </p>
        </div>

        {/* Restaurant grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {restaurants.map((r, i) => (
            <RestaurantCard
              key={r.name}
              restaurant={r}
              index={i}
              colors={colors}
              onGetMenu={handleGetMenu}
              isLoading={loadingRestaurant === r.name && isMenuLoading}
            />
          ))}
        </div>

        {/* Footer CTA */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${colors.border}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => buildItinerary({ city })}
            disabled={isItineraryLoading}
            style={{
              padding: "9px 16px",
              backgroundColor: colors.accentLight,
              color: colors.accent,
              border: `1px solid ${colors.accent}30`,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: isItineraryLoading ? "not-allowed" : "pointer",
              opacity: isItineraryLoading ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {isItineraryLoading ? "Building itinerary…" : "🗺️ Build my taste itinerary"}
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
};

export default RestaurantSpots;
