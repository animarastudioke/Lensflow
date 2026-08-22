'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STORE_PRODUCTS } from '@/lib/constants/homepage'

export function StoreDemo() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0)

  function addToCart(id: string) {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }))
    setJustAdded(id)
    window.setTimeout(() => setJustAdded((current) => (current === id ? null : current)), 900)
  }

  return (
    <div className="p-4 text-white sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Gallery Store</p>
          <p className="text-xs text-white/45">Prints, albums &amp; downloads from this gallery</p>
        </div>
        <div className="relative flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs">
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>Cart</span>
          <AnimatePresence>
            {cartCount > 0 ? (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#d6415a] text-[10px] font-semibold text-white"
              >
                {cartCount}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STORE_PRODUCTS.map((product) => (
          <div key={product.id} className="overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
            <div className="relative aspect-square">
              <Image
                src={`https://images.unsplash.com/${product.image}?w=400&q=70&auto=format&fit=crop`}
                alt={product.label}
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
            <div className="p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-white/40">{product.category}</p>
              <p className="mt-0.5 truncate text-xs font-medium">{product.label}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs tabular-nums text-white/70">${product.price}</span>
                <button
                  type="button"
                  onClick={() => addToCart(product.id)}
                  aria-label={`Add ${product.label} to cart`}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
                    justAdded === product.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  )}
                >
                  {justAdded === product.id ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
