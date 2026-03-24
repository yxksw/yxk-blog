import { icons as riCollection } from '@iconify-json/ri'

type IconifyIconData = {
  body: string
  width?: number
  height?: number
}

const riIcons = (riCollection as { icons: Record<string, IconifyIconData> }).icons

export function getRiIcon(name: string) {
  const normalized = name.replace(/^ri:/, '')
  return riIcons[normalized] ?? riIcons['links-line']
}

export const riPantoneLine = getRiIcon('ri:pantone-line')
export const riArchiveLine = getRiIcon('ri:archive-line')
export const riFlaskLine = getRiIcon('ri:flask-line')
export const riGhostLine = getRiIcon('ri:ghost-line')
export const riHeart2Line = getRiIcon('ri:heart-2-line')
export const riFilmLine = getRiIcon('ri:film-line')
export const riChat1Line = getRiIcon('ri:chat-1-line')
export const riLinksLine = getRiIcon('ri:links-line')
export const riMenuLine = getRiIcon('ri:menu-line')
export const riSearchLine = getRiIcon('ri:search-line')
export const riRocket2Line = getRiIcon('ri:rocket-2-line')
export const riTrainLine = getRiIcon('ri:train-line')
export const riBallPenLine = getRiIcon('ri:ball-pen-line')
export const riLinkM = getRiIcon('ri:link-m')
