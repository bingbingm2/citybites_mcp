import { z } from "zod";

export const restaurantSchema = z.object({
  name: z.string().describe("Restaurant name"),
  neighborhood: z.string().describe("Neighborhood or area"),
  cuisineType: z.string().describe("Type of cuisine"),
  vibeTagline: z.string().describe("Short vibe description"),
  whyLocal: z.string().describe("Why locals love it"),
  url: z.string().describe("Restaurant or source URL"),
});

export const propSchema = z.object({
  city: z.string().describe("The city being explored"),
  restaurants: z.array(restaurantSchema).describe("List of recommended restaurants"),
});

export type RestaurantProps = z.infer<typeof propSchema>;
export type Restaurant = z.infer<typeof restaurantSchema>;
