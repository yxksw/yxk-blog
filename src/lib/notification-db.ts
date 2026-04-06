// IndexedDB helpers for new post notification

export const DB_NAME = 'blog-rss-store-v2'
export const DB_VERSION = 1
export const STORE_OLD = 'posts'
export const STORE_NEW = 'posts_new'
export const NOTIFICATION_STATE_KEY = 'blog-notification-state'
export const INIT_TIME_KEY = 'blog-notification-init-time'

// Compute a context-aware ID for the current site/path
function getScopeId(): string {
  if (typeof window === 'undefined') return 'root'
  const basePath = window.location.pathname.split('/')[1] || ''
  return basePath || 'root'
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_OLD)) {
        db.createObjectStore(STORE_OLD, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_NEW)) {
        db.createObjectStore(STORE_NEW, { keyPath: 'id' })
      }
    }
  })
}

export function normalizeGuid(guid: string, link: string): string {
  const value = (guid || link || '').trim()
  if (!value) return ''
  try {
    const url = new URL(value, window.location.origin)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return value
  }
}

export function generateId(guid: string): string {
  return `${getScopeId()}:${guid}`
}

export function getStoredPosts(db: IDBDatabase, storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function clearStore(db: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    store.clear()
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export function savePosts(db: IDBDatabase, storeName: string, posts: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    posts.forEach((post) => {
      const itemToSave = { ...post, id: generateId(post.guid) }
      store.put(itemToSave)
    })
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function fetchRSS(): Promise<any[]> {
  try {
    const response = await fetch('/rss.xml', { cache: 'no-store' })
    const text = await response.text()
    const parser = new DOMParser()
    const xml = parser.parseFromString(text, 'text/xml')

    const channelLink = xml.querySelector('channel > link')?.textContent?.trim()
    let prodOrigin = ''
    if (channelLink) {
      try {
        prodOrigin = new URL(channelLink).origin
      } catch {}
    }
    const currentOrigin = window.location.origin

    const items = Array.from(xml.querySelectorAll('item'))

    return items.map((item) => {
      const title = item.querySelector('title')?.textContent || ''
      let link = (item.querySelector('link')?.textContent || '').trim()
      let rawGuid = (item.querySelector('guid')?.textContent || '').trim()
      const pubDate = new Date(item.querySelector('pubDate')?.textContent || '').getTime()
      let description = item.querySelector('description')?.textContent || ''

      let contentEncoded = item.getElementsByTagNameNS(
        'http://purl.org/rss/1.0/modules/content/',
        'encoded',
      )[0]?.textContent
      let content =
        contentEncoded ||
        item.getElementsByTagName('content:encoded')[0]?.textContent ||
        item.querySelector('content')?.textContent ||
        ''

      if (prodOrigin && prodOrigin !== currentOrigin) {
        link = link.replaceAll(prodOrigin, currentOrigin)
        if (rawGuid.includes(prodOrigin)) {
          rawGuid = rawGuid.replaceAll(prodOrigin, currentOrigin)
        }
        description = description.replaceAll(prodOrigin, currentOrigin)
        content = content.replaceAll(prodOrigin, currentOrigin)
      }

      const guid = normalizeGuid(rawGuid || link, link)

      return {
        title,
        link,
        guid,
        pubDate,
        description,
        content,
      }
    })
  } catch (e) {
    console.error('Failed to fetch RSS:', e)
    return []
  }
}
