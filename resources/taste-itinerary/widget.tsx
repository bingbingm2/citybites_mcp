import { McpUseProvider, useWidget, useWidgetTheme, useCallTool, type WidgetMetadata } from "mcp-use/react";
import React, { useState } from "react";
import { propSchema, type TasteItineraryProps, type ItineraryStop } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Display a time-aware taste itinerary for a city with cultural context for each food stop",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Composing your taste itinerary...",
    invoked: "Itinerary ready",
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
    line: theme === "dark" ? "#2a2a2a" : "#e8e4de",
    cultureBg: theme === "dark" ? "#161610" : "#fffbf5",
    cultureBorder: theme === "dark" ? "#2e2a1a" : "#f0e8d0",
  };
}

const TIME_SLOT_ICONS: Record<string, string> = {
  "Morning Coffee": "☕",
  "Midday Snack": "🌤️",
  "Dinner": "🌙",
  "Late Bites": "✨",
};

const TIME_SLOT_COLORS: Record<string, string> = {
  "Morning Coffee": "#c2853a",
  "Midday Snack": "#5a9e6f",
  "Dinner": "#5a6fa8",
  "Late Bites": "#9a5aaa",
};

const StopCard: React.FC<{
  stop: ItineraryStop;
  index: number;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
  onGetMenu: (stop: ItineraryStop) => void;
  isLoading: boolean;
}> = ({ stop, index, isLast, colors, onGetMenu, isLoading }) => {
  const [expanded, setExpanded] = useState(false);
  const icon = TIME_SLOT_ICONS[stop.timeSlot] ?? "🍽️";
  const slotColor = TIME_SLOT_COLORS[stop.timeSlot] ?? colors.accent;

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* Timeline line + dot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          backgroundColor: colors.accentLight,
          border: `2px solid ${slotColor}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>
          {icon}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: colors.line, marginTop: 4 }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1,
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: "16px 18px",
        marginBottom: isLast ? 0 : 12,
      }}>
        {/* Time + slot label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: slotColor,
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            {stop.timeSlot}
          </span>
          <span style={{ fontSize: 11, color: colors.textSecondary }}>·</span>
          <span style={{ fontSize: 11, color: colors.textSecondary }}>{stop.timeRange}</span>
        </div>

        {/* Restaurant + neighborhood */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{stop.restaurantName}</div>
          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            📍 {stop.neighborhood} · {stop.walkingNote}
          </div>
        </div>

        {/* Dish highlight */}
        <div style={{
          backgroundColor: colors.accentLight,
          border: `1px solid ${colors.accent}25`,
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.accent, marginBottom: 4 }}>
            Order: {stop.dish}
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5 }}>
            {stop.dishDescription}
          </div>
        </div>

        {/* Cultural context — expandable */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none", border: "none", padding: 0,
            fontSize: 12, color: colors.textSecondary,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            marginBottom: expanded ? 8 : 0,
          }}
        >
          <span>{expanded ? "▾" : "▸"}</span>
          <span>Why this matters to {stop.restaurantName.split(" ")[0]}'s story</span>
        </button>

        {expanded && (
          <div style={{
            backgroundColor: colors.cultureBg,
            border: `1px solid ${colors.cultureBorder}`,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            color: colors.textSecondary,
            lineHeight: 1.6,
            marginBottom: 10,
          }}>
            {stop.culturalContext}
          </div>
        )}

        {/* Get menu button */}
        <button
          onClick={() => onGetMenu(stop)}
          disabled={isLoading}
          style={{
            marginTop: 4,
            padding: "7px 12px",
            backgroundColor: "transparent",
            color: slotColor,
            border: `1px solid ${slotColor}40`,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? "Loading..." : "Full menu →"}
        </button>
      </div>
    </div>
  );
};

const TasteItinerary: React.FC = () => {
  const { props, isPending } = useWidget<TasteItineraryProps>();
  const colors = useColors();
  const { callTool: getMenuDishes, isPending: isMenuLoading } = useCallTool("get-menu-dishes");
  const [loadingStop, setLoadingStop] = useState<string | null>(null);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ backgroundColor: colors.bg, padding: 24, borderRadius: 20 }}>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          <div style={{ height: 20, width: 200, backgroundColor: colors.border, borderRadius: 6, marginBottom: 8, animation: "pulse 1.5s infinite" }} />
          <div style={{ height: 13, width: 160, backgroundColor: colors.border, borderRadius: 6, marginBottom: 24, animation: "pulse 1.5s infinite" }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: colors.border, flexShrink: 0, animation: "pulse 1.5s infinite" }} />
              <div style={{ flex: 1, backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, height: 120, animation: "pulse 1.5s infinite" }} />
            </div>
          ))}
        </div>
      </McpUseProvider>
    );
  }

  const { city, preferences, stops } = props;

  const handleGetMenu = (stop: ItineraryStop) => {
    setLoadingStop(stop.restaurantName);
    getMenuDishes(
      { restaurantName: stop.restaurantName, city },
      { onSettled: () => setLoadingStop(null) }
    );
  };

  return (
    <McpUseProvider autoSize>
      <div style={{ backgroundColor: colors.bg, padding: 20, borderRadius: 20, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            CityBites · Taste Itinerary
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.text }}>
            A day of eating in {city}
          </h2>
          {preferences && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: colors.textSecondary }}>
              Tailored for: {preferences}
            </p>
          )}
          <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.textSecondary }}>
            {stops.length} stops · tap each dish to explore the full menu
          </p>
        </div>

        {/* Timeline */}
        <div>
          {stops.map((stop, i) => (
            <StopCard
              key={`${stop.timeSlot}-${i}`}
              stop={stop}
              index={i}
              isLast={i === stops.length - 1}
              colors={colors}
              onGetMenu={handleGetMenu}
              isLoading={loadingStop === stop.restaurantName && isMenuLoading}
            />
          ))}
        </div>

        {stops.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: colors.textSecondary }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
            <p style={{ margin: 0 }}>No itinerary stops found.</p>
          </div>
        )}
      </div>
    </McpUseProvider>
  );
};

export default TasteItinerary;
