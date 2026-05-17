import { Room } from "@/shared/types";

export const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

export function roomImage(room: Room) {
  return room.images[0]?.url || room.prices.find((price) => price.imageUrls[0])?.imageUrls[0] || fallbackImage;
}

export function minPrice(room: Room) {
  return room.prices.length ? Math.min(...room.prices.map((price) => price.pricePerNight)) : 0;
}
