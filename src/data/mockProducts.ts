import productRing from "@/assets/product-ring.jpg";
import productEarrings from "@/assets/product-earrings.jpg";
import productBracelet from "@/assets/product-bracelet.jpg";
import productScarf from "@/assets/product-scarf.jpg";

import type { Product } from "@/types/store";
export type { Product } from "@/types/store";

export interface Store {
  name: string;
  slug: string;
  description: string;
  instagram: string;
}

export const mockStore: Store = {
  name: "Alina's Atelier",
  slug: "alina",
  description: "Handcrafted jewellery & textiles, made with care in Almaty.",
  instagram: "@alinas.atelier",
};

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Мөлдір Ring",
    price: 18500,
    image: productRing,
    description: "Hand-polished 14k gold ring. Minimalist and timeless — crafted to feel weightless on the hand.",
    stock: 4,
  },
  {
    id: "2",
    name: "Terracotta Earrings",
    price: 8900,
    image: productEarrings,
    description: "Ceramic drop earrings on gold-filled hooks. Each pair is slightly unique due to the handmade process.",
    stock: 12,
  },
  {
    id: "3",
    name: "Steppe Bracelet",
    price: 6200,
    image: productBracelet,
    description: "Hand-twisted natural hemp cord with a brass clasp. Inspired by traditional Kazakh textile patterns.",
    stock: 8,
  },
  {
    id: "4",
    name: "Silk Dusk Scarf",
    price: 24000,
    image: productScarf,
    description: "100% mulberry silk scarf in sunset gradient. Naturally dyed using pomegranate and onion skins.",
    stock: 3,
  },
];
