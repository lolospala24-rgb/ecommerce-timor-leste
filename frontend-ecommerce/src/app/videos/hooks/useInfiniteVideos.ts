'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchVideos } from '../services/video.service'
import { Video } from '../types/video'

export function useInfiniteVideos() {
  return useInfiniteQuery<Video[], Error>(['videos-infinite'], ({ pageParam = 1 }) => fetchVideos(pageParam), {
    getNextPageParam: (last, pages) => (last.length ? pages.length + 1 : undefined),
  })
}
