import { McpUseProvider, useWidget, useWidgetTheme, type WidgetMetadata } from "mcp-use/react";
import React, { useState } from "react";
import { propSchema, type MenuHighlightsProps, type Dish } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Display signature dishes from a restaurant with traveler-friendly descriptions and food images",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Reading the menu...",
    invoked: "Dishes ready",
    csp: {
      resourceDomains: ["https://images.unsplash.com"],
      connectDomains: ["https://api.unsplash.com"],
    },
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
    imageBg: theme === "dark" ? "#1a1a1a" : "#f0ece6",
  };
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍡",
  drink: "🍵",
};

const DishCard: React.FC<{
  dish: Dish;
  colors: ReturnType<typeof useColors>;
}> = ({ dish, colors }) => {
  const [imgError, setImgError] = useState(false);
  const icon = MEAL_ICONS[dish.mealType] ?? "🍽️";

  return (
    <div style={{
      backgroundColor: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Image area */}
      <div style={{
        height: 160,
        backgroundColor: colors.imageBg,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {dish.imageUrl && !imgError ? (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 48, opacity: 0.4 }}>🍽️</span>
        )}
        {/* Meal type badge */}
        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          backgroundColor: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: 20,
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          {icon} {dish.mealType}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
          {dish.name}
        </div>
        <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.55, flex: 1 }}>
          {dish.description}
        </div>
      </div>
    </div>
  );
};

const MenuHighlights: React.FC = () => {
  const { props, isPending } = useWidget<MenuHighlightsProps>();
  const colors = useColors();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div style={{ backgroundColor: colors.bg, padding: 24, borderRadius: 20 }}>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          <div style={{ height: 18, width: 200, backgroundColor: colors.border, borderRadius: 6, marginBottom: 8, animation: "pulse 1.5s infinite" }} />
          <div style={{ height: 13, width: 140, backgroundColor: colors.border, borderRadius: 6, marginBottom: 20, animation: "pulse 1.5s infinite" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, height: 260, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { restaurantName, city, dishes } = props;

  return (
    <McpUseProvider autoSize>
      <div style={{ backgroundColor: colors.bg, padding: 20, borderRadius: 20, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Menu Highlights · {city}
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.text }}>
            What to order at {restaurantName}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: colors.textSecondary }}>
            {dishes.length} signature dishes · explained for travelers
          </p>
        </div>

        {/* Dish grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {dishes.map((dish) => (
            <DishCard key={dish.name} dish={dish} colors={colors} />
          ))}
        </div>

        {dishes.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: colors.textSecondary }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
            <p style={{ margin: 0 }}>No dishes found for this restaurant.</p>
          </div>
        )}
      </div>
    </McpUseProvider>
  );
};

export default MenuHighlights;
