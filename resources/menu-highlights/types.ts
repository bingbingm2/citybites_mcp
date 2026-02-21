import { z } from "zod";

export const dishSchema = z.object({
  name: z.string().describe("Dish name"),
  description: z.string().describe("Traveler-friendly description of the dish"),
  mealType: z.string().describe("breakfast, lunch, dinner, snack, or drink"),
  imageQuery: z.string().describe("Unsplash search query for the dish image"),
  imageUrl: z.string().optional().describe("Unsplash image URL if available"),
});

export const propSchema = z.object({
  restaurantName: z.string().describe("The restaurant name"),
  city: z.string().describe("The city"),
  dishes: z.array(dishSchema).describe("Signature dishes from the restaurant"),
});

export type MenuHighlightsProps = z.infer<typeof propSchema>;
export type Dish = z.infer<typeof dishSchema>;
