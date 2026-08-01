'use client'

import { useMemo, useState } from 'react'
import { MediaItem, Album } from './GalleryDetailContent'

interface UseMediaGridOptions {
  media: MediaItem[]
  albums: Album[]
}

export function useMediaGrid({ media, albums }: UseMediaGridOptions) {
  const [searchQuery, setSearchQuery] = useState('')
  const [albumFilter, setAlbumFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'filename' | 'size'>('createdAt')

  const filteredMedia = useMemo(() => {
    let result = [...media]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.filename.toLowerCase().includes(query) ||
        item.metadata?.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    if (albumFilter === 'unassigned') {
      result = result.filter(item => !item.albumId)
    } else if (albumFilter) {
      result = result.filter(item => item.albumId === albumFilter)
    }

    result.sort((a, b) => {
      if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'filename') return a.filename.localeCompare(b.filename)
      if (sortBy === 'size') return b.size - a.size
      return 0
    })

    return result
  }, [media, searchQuery, albumFilter, sortBy])

  return {
    filteredMedia,
    searchQuery,
    setSearchQuery,
    albumFilter,
    setAlbumFilter,
    sortBy,
    setSortBy,
  }
}