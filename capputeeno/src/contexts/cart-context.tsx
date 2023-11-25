"use client"

import { ReactNode, createContext, useState } from "react";
import { ProductsFetchResponse } from "@/types/products-response";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosPromise } from "axios";
import { useFilter } from "@/hooks/useFilter";
import { mountQuery } from "@/utils/graphql-filters";
import { useDeferredValue } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ProductInCart } from "@/types/product";

interface Product {
  id: string;
  name: string;
  price_in_cents: number;
  image_url: string;
  // Add other product properties as needed
}

interface CartContextType {
  data?: Product[];
  quantity?: (id: string, quantity: number) => void;
}

export const CartContext = createContext<CartContextType>({});
interface ProviderProps {
  children: ReactNode;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

const fetcher = (query: string): AxiosPromise<ProductsFetchResponse> => {
  return axios.post(API_URL, { query })
}

export function CartContextProvider({ children }: ProviderProps) {
  const { value, updateLocalStorage } = useLocalStorage<ProductInCart[]>("cart-items", [])

  const { type, priority, search } = useFilter()
  const searchDeferred = useDeferredValue(search)
  const query = mountQuery(type, priority)
  const { data } = useQuery({
    queryFn: () => fetcher(query),
    queryKey: ['products', type, priority],
    staleTime: 1000 * 60 * 1 // 1 minuto de cache
  })

  const products = data?.data?.data?.allProducts
  const filteredProducts = products?.filter(product => product.name.toLowerCase().includes(searchDeferred.toLowerCase()))

  const handleUpdateQuantity = (id: string, quantity: number) => {
    const newValue = value.map(item => {
      if (item.id !== id) return item
      return { ...item, quantity: quantity }
    })
    updateLocalStorage(newValue)
  }

  return (
    <CartContext.Provider
      value={{
        data: filteredProducts,
        quantity: handleUpdateQuantity
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
