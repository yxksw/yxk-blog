// 音乐播放器类型定义

export interface MusicPlayerTrack {
  id: number | string
  title: string
  artist: string
  cover: string
  url: string
  lrc?: string
  duration: number
}

export interface MusicPlayerConfig {
  enable: boolean
  mode: 'meting' | 'local'
  meting: {
    meting_api: string
    server: 'netease' | 'tencent' | 'kugou' | 'baidu' | 'kuwo'
    type: 'playlist' | 'album' | 'artist' | 'song' | 'search'
    id: string
  }
  local: {
    playlist: MusicPlayerTrack[]
  }
  autoplay?: boolean
}

// Storage keys for local storage
export const STORAGE_KEYS = {
  USER_PAUSED: 'player_user_paused',
  VOLUME: 'player_volume',
  SHUFFLE: 'player_shuffle',
  REPEAT: 'player_repeat',
  LAST_SONG_ID: 'player_last_song_id',
  LAST_SONG_PROGRESS: 'player_last_song_progress',
}
