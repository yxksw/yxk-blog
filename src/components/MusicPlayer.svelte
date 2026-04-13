<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { slide } from "svelte/transition";
  import Icon from "@iconify/svelte";

  import type { MusicPlayerTrack, MusicPlayerConfig } from "@/types/music";
  import { STORAGE_KEYS } from "@/types/music";
  import { 
    formatTime, 
    getAssetPath, 
    parseLRC, 
    fetchLyrics, 
    fetchMetingPlaylist as fetchMetingPlaylistUtil,
    fadeInAudio 
  } from "@/utils/music";

  // Props - 从 config.json 传入配置
  interface Props {
    config?: MusicPlayerConfig;
  }
  
  let { config }: Props = $props();

  // 配置 - 使用传入的配置或默认值
  // 使用 $derived 确保配置变化时重新计算
  let mode = $derived(config?.mode ?? "meting");
  let meting_api = $derived(config?.meting?.meting_api ?? "https://meting-api.314926.xyz/api");
  let meting_server = $derived(config?.meting?.server ?? "netease");
  let meting_type = $derived(config?.meting?.type ?? "playlist");
  let meting_id = $derived(config?.meting?.id ?? "2161912966");
  let isAutoplayEnabled = $derived(config?.autoplay ?? false);
  let enable = $derived(config?.enable ?? true);
  let localPlaylist = $derived(config?.local?.playlist ?? []);

  // 当前歌曲信息
  let currentSong: MusicPlayerTrack = $state({
    id: 0,
    title: "Music",
    artist: "Artist",
    cover: "/favicon.ico",
    url: "",
    duration: 0,
  });
  let playlist: MusicPlayerTrack[] = $state([]);
  let currentIndex = $state(0);
  let audio: HTMLAudioElement | undefined = $state();
  let progressBar: HTMLElement | undefined = $state();
  let volumeBar: HTMLElement | undefined = $state();

  // 状态
  let isPlaying = $state(false);
  let shouldPlay = $state(false);
  let isCollapsed = $state(true);
  let showPlaylist = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let volume = $state(0.75);
  let isMuted = $state(false);
  let isLoading = $state(false);
  let isShuffled = $state(false);
  let isRepeating = $state(0);
  let pendingProgress = $state(0);
  let lastSaveTime = 0;
  let errorMessage = $state("");
  let showError = $state(false);
  let fadeInterval: number | null = null;

  // 歌词状态
  let lyrics: { time: number; text: string }[] = $state([]);
  let currentLrcIndex = $state(-1);
  let lrcContainer: HTMLElement | undefined = $state();
  let isUserScrolling = $state(false);
  let scrollTimeout: number | null = null;
  let noLyrics = $state(false);
  let showLyrics = $state(true);
  let autoplayFailed = $state(false);

  // 加载歌词
  async function loadLyrics(song: MusicPlayerTrack) {
    lyrics = [];
    currentLrcIndex = -1;
    noLyrics = false;
    
    if (!song.lrc) {
      noLyrics = true;
      return;
    }

    const lrcText = await fetchLyrics(song.lrc);

    if (lrcText) {
      lyrics = parseLRC(lrcText);
      if (lyrics.length === 0) noLyrics = true;
    } else {
      noLyrics = true;
    }
  }

  // 跳转到歌词时间
  function seekToLyric(time: number) {
    if (!audio) return;
    audio.currentTime = time;
    currentTime = time;
    if (!isPlaying) {
      togglePlay();
    }
  }

  // 歌词滚动处理
  function handleLrcScroll() {
    isUserScrolling = true;
    if (lrcContainer) {
      lrcContainer.classList.add('scrolling');
    }
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      isUserScrolling = false;
      if (lrcContainer) {
        lrcContainer.classList.remove('scrolling');
      }
    }, 2000);
  }

  // 更新歌词
  function updateLyrics(currentTime: number) {
    if (lyrics.length === 0) return;
    
    let index = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }
    
    if (index !== currentLrcIndex) {
      currentLrcIndex = index;
      if (!isUserScrolling && lrcContainer && index !== -1) {
        const lines = lrcContainer.querySelectorAll('.lyric-line');
        const activeLine = lines[index] as HTMLElement;
        if (activeLine) {
          const containerHeight = lrcContainer.clientHeight;
          const lineOffset = activeLine.offsetTop;
          const lineHeight = activeLine.offsetHeight;
          const scrollTop = lineOffset - (containerHeight / 2) + (lineHeight / 2);
          lrcContainer.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }
    }
  }

  function fadeInVolume(targetVolume: number, duration: number = 2000) {
    if (!audio) return;
    if (fadeInterval) clearInterval(fadeInterval);
    
    fadeInterval = fadeInAudio(audio, targetVolume, duration, () => {
      fadeInterval = null;
    });
  }

  function restoreLastSong() {
    if (playlist.length === 0) return;
    if (typeof localStorage !== 'undefined') {
      const lastId = localStorage.getItem(STORAGE_KEYS.LAST_SONG_ID);
      let index = -1;
      if (lastId) {
        index = playlist.findIndex(s => s.id !== undefined && String(s.id) === String(lastId));
      }
      if (index !== -1) {
        currentIndex = index;
        const savedProgress = localStorage.getItem(STORAGE_KEYS.LAST_SONG_PROGRESS);
        if (savedProgress) {
          pendingProgress = parseFloat(savedProgress);
        }
        loadSong(playlist[currentIndex]);
        return;
      }
    }
    currentIndex = 0;
    loadSong(playlist[0]);
  }

  function showErrorMessage(message: string) {
    errorMessage = message;
    showError = true;
    setTimeout(() => {
      showError = false;
    }, 3000);
  }

  async function fetchMetingPlaylist() {
    // 根据模式选择加载方式
    if (mode === "local") {
      // 本地模式：直接使用配置的播放列表
      if (localPlaylist.length > 0) {
        playlist = [...localPlaylist];
        setTimeout(() => {
          restoreLastSong();
        }, 0);
      } else {
        showErrorMessage("本地播放列表为空");
      }
      return;
    }
    
    // Meting 模式：从 API 获取
    if (!meting_api || !meting_id) return;
    isLoading = true;
    try {
      playlist = await fetchMetingPlaylistUtil(
        meting_api,
        meting_server,
        meting_type,
        meting_id
      );
      if (playlist.length > 0) {
        setTimeout(() => {
          restoreLastSong();
        }, 0);
      }
      isLoading = false;
    } catch (e) {
      showErrorMessage("加载播放列表失败");
      isLoading = false;
    }
  }

  function togglePlay() {
    if (!audio || !currentSong.url) return;
    if (isPlaying) {
      if (fadeInterval) {
        clearInterval(fadeInterval);
        fadeInterval = null;
      }
      audio.pause();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER_PAUSED, "true");
      }
    } else {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          fadeInVolume(volume);
        }).catch(() => {});
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER_PAUSED, "false");
      }
    }
  }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      showPlaylist = false;
    }
  }

  function togglePlaylist() {
    showPlaylist = !showPlaylist;
  }

  function toggleLyrics() {
    showLyrics = !showLyrics;
  }

  function togglePlaybackMode() {
    if (isRepeating === 1) {
      isShuffled = false;
      isRepeating = 2;
    } else if (isShuffled) {
      isShuffled = false;
      isRepeating = 1;
    } else {
      isShuffled = true;
      isRepeating = 2;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SHUFFLE, String(isShuffled));
      localStorage.setItem(STORAGE_KEYS.REPEAT, String(isRepeating));
    }
  }

  function previousSong() {
    if (playlist.length <= 1) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    playSong(newIndex);
  }

  function nextSong() {
    if (playlist.length <= 1) return;
    let newIndex: number;
    if (isShuffled) {
      do {
        newIndex = Math.floor(Math.random() * playlist.length);
      } while (newIndex === currentIndex && playlist.length > 1);
    } else {
      newIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
    }
    playSong(newIndex);
  }

  function playSong(index: number) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    shouldPlay = true;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USER_PAUSED, "false");
    }
    pendingProgress = 0;
    loadSong(playlist[currentIndex]);
  }

  function loadSong(song: MusicPlayerTrack) {
    if (!song || !audio) return;
    currentSong = { ...song };
    if (typeof localStorage !== 'undefined' && song.id !== undefined && song.id !== 0) {
      localStorage.setItem(STORAGE_KEYS.LAST_SONG_ID, String(song.id));
      if (pendingProgress <= 0) {
        localStorage.setItem(STORAGE_KEYS.LAST_SONG_PROGRESS, "0");
      }
    }
    if (song.url) {
      isLoading = true;
      loadLyrics(song);
      if (pendingProgress > 0) {
        currentTime = pendingProgress;
      } else {
        audio.currentTime = 0;
        currentTime = 0;
      }
      duration = song.duration ?? 0;
      audio.removeEventListener("canplay", handleLoadSuccess);
      audio.removeEventListener("error", handleLoadError);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.addEventListener("canplay", handleLoadSuccess, { once: true });
      audio.addEventListener("error", handleLoadError, { once: true });
      audio.addEventListener("loadstart", handleLoadStart, { once: true });
      audio.src = getAssetPath(song.url);
      audio.load();
    } else {
      isLoading = false;
    }
  }

  function handleLoadSuccess() {
    isLoading = false;
    if (audio?.duration && audio.duration > 1) {
      duration = Math.floor(audio.duration);
      if (playlist[currentIndex]) playlist[currentIndex].duration = duration;
      currentSong.duration = duration;
    }
    if (pendingProgress > 0 && audio) {
      const targetTime = Math.min(pendingProgress, duration > 0 ? duration : Infinity);
      audio.currentTime = targetTime;
      currentTime = targetTime;
      pendingProgress = 0;
    }
    if (isAutoplayEnabled || isPlaying || shouldPlay) {
      const playPromise = audio?.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          fadeInVolume(volume);
          isAutoplayEnabled = false;
          autoplayFailed = false;
          shouldPlay = false;
        }).catch((error) => {
          showErrorMessage("自动播放被阻止");
          autoplayFailed = true;
          isPlaying = false;
          shouldPlay = false;
        });
      }
    }
  }

  function handleUserInteraction() {
    if (autoplayFailed && audio && !isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          fadeInVolume(volume);
          autoplayFailed = false;
        }).catch(() => {});
      }
    }
  }

  function handleLoadError(event: Event) {
    isLoading = false;
    showErrorMessage(`加载失败: ${currentSong.title}`);
    if (playlist.length > 1) setTimeout(() => nextSong(), 1000);
    else showErrorMessage("无可用歌曲");
  }

  function handleLoadStart() {}

  function hideError() {
    showError = false;
  }

  function setProgress(event: MouseEvent) {
    if (!audio || !progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audio.currentTime = newTime;
    currentTime = newTime;
  }

  let isVolumeDragging = $state(false);
  let isMouseDown = $state(false);
  let volumeBarRect: DOMRect | null = $state(null);
  let rafId: number | null = $state(null);

  function startVolumeDrag(event: MouseEvent) {
    if (!volumeBar) return;
    isMouseDown = true;
    volumeBarRect = volumeBar.getBoundingClientRect();
    updateVolumeLogic(event.clientX);
  }

  function handleVolumeMove(event: MouseEvent) {
    if (!isMouseDown) return;
    isVolumeDragging = true;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      updateVolumeLogic(event.clientX);
      rafId = null;
    });
  }

  function stopVolumeDrag() {
    isMouseDown = false;
    isVolumeDragging = false;
    volumeBarRect = null;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function updateVolumeLogic(clientX: number) {
    if (!audio || !volumeBar) return;
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
    const rect = volumeBarRect || volumeBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    volume = percent;
    audio.volume = volume;
    isMuted = volume === 0;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.VOLUME, String(volume));
    }
  }

  function toggleMute() {
    if (!audio) return;
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
    isMuted = !isMuted;
    audio.muted = isMuted;
  }

  function handleAudioEvents() {
    if (!audio) return;
    audio.addEventListener("play", () => {
      isPlaying = true;
      autoplayFailed = false;
      isAutoplayEnabled = false;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER_PAUSED, "false");
      }
    });
    audio.addEventListener("pause", () => {
      isPlaying = false;
    });
    audio.addEventListener("timeupdate", () => {
      if (!audio) return;
      currentTime = audio.currentTime;
      updateLyrics(currentTime);
      const now = Date.now();
      if (now - lastSaveTime > 2100) {
        if (typeof localStorage !== 'undefined' && currentSong.id !== 0) {
          localStorage.setItem(STORAGE_KEYS.LAST_SONG_PROGRESS, String(currentTime));
          lastSaveTime = now;
        }
      }
    });
    audio.addEventListener("ended", () => {
      if (!audio) return;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.LAST_SONG_PROGRESS, "0");
      }
      if (isRepeating === 1) {
        audio.currentTime = 0;
        audio.play().then(() => {
          fadeInVolume(volume);
        }).catch(() => {});
      } else if (isRepeating === 2 || isShuffled || (isRepeating === 0 && currentIndex < playlist.length - 1)) {
        nextSong();
      } else {
        isPlaying = false;
      }
    });
    audio.addEventListener("error", () => {
      isLoading = false;
    });
  }

  const interactionEvents = ['click', 'keydown', 'touchstart'];

  onMount(() => {
    if (typeof localStorage !== 'undefined') {
      const userPaused = localStorage.getItem(STORAGE_KEYS.USER_PAUSED) === "true";
      if (userPaused) {
        isAutoplayEnabled = false;
      }
      const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
      if (savedVolume !== null) {
        volume = parseFloat(savedVolume);
      }
      const savedShuffle = localStorage.getItem(STORAGE_KEYS.SHUFFLE);
      if (savedShuffle !== null) {
        isShuffled = savedShuffle === "true";
      }
      const savedRepeat = localStorage.getItem(STORAGE_KEYS.REPEAT);
      if (savedRepeat !== null) {
        isRepeating = parseInt(savedRepeat);
      }
    }

    audio = new Audio();
    audio.volume = volume;
    handleAudioEvents();
    interactionEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { capture: true });
    });
    
    if (!enable) return;
    
    fetchMetingPlaylist();
  });

  onDestroy(() => {
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
    if (typeof document !== 'undefined') {
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleUserInteraction, { capture: true });
      });
    }
    if (audio) {
      audio.pause();
      audio.src = "";
    }
  });
</script>

<svelte:window
  onmousemove={handleVolumeMove}
  onmouseup={stopVolumeDrag}
/>

{#if enable}
  {#if showError}
    <div class="music-player-error fixed bottom-20 right-4 z-[60] max-w-sm">
      <div class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
        <Icon icon="material-symbols:error" class="text-xl shrink-0" />
        <span class="text-sm flex-1">{errorMessage}</span>
        <button onclick={hideError} class="text-white/80 hover:text-white transition-colors">
          <Icon icon="material-symbols:close" class="text-lg" />
        </button>
      </div>
    </div>
  {/if}

  <div class="music-player fixed bottom-4 left-4 z-[101] transition-all duration-300 ease-in-out flex flex-col items-start pointer-events-auto origin-bottom-left"
       class:expanded={!isCollapsed}
       class:collapsed={isCollapsed}>
    
    {#if showPlaylist}
      <div class="playlist-panel bg-[var(--background)] border border-[var(--border)] rounded-xl w-80 max-h-80 overflow-hidden z-50 mb-3 pointer-events-auto shadow-xl"
           transition:slide={{ duration: 300, axis: 'y' }}>
        <div class="playlist-header flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 class="text-lg font-semibold text-[var(--foreground)]">播放列表</h3>
          <div class="flex items-center gap-1">
            <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--muted)] transition-colors"
                    onclick={fetchMetingPlaylist}
                    disabled={isLoading}
                    title="刷新">
              {#if isLoading}
                <Icon icon="eos-icons:loading" class="text-lg" />
              {:else}
                <Icon icon="material-symbols:refresh" class="text-lg" />
              {/if}
            </button>
            <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--muted)] transition-colors" onclick={togglePlaylist}>
              <Icon icon="material-symbols:close" class="text-lg" />
            </button>
          </div>
        </div>
        <div class="playlist-content overflow-y-auto max-h-80">
          {#each playlist as song, index}
            <div class="playlist-item flex items-center gap-3 p-3 hover:bg-[var(--muted)] cursor-pointer transition-colors"
                 class:bg-[var(--muted)]={index === currentIndex}
                 class:text-[var(--primary)]={index === currentIndex}
                 onclick={() => playSong(index)}
                 onkeydown={(e) => {
                   if (e.key === 'Enter' || e.key === ' ') {
                     e.preventDefault();
                     playSong(index);
                   }
                 }}
                 role="button"
                 tabindex="0"
                 aria-label="播放 {song.title} - {song.artist}">
              <div class="w-6 h-6 flex items-center justify-center">
                {#if index === currentIndex && isPlaying}
                  <Icon icon="material-symbols:graphic-eq" class="text-[var(--primary)] animate-pulse" />
                {:else if index === currentIndex}
                  <Icon icon="material-symbols:pause" class="text-[var(--primary)]" />
                {:else}
                  <span class="text-sm text-[var(--muted-foreground)]">{index + 1}</span>
                {/if}
              </div>
              <div class="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-sm">
                <img src={getAssetPath(song.cover)} alt={song.title} class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate" class:text-[var(--primary)]={index === currentIndex} class:text-[var(--foreground)]={index !== currentIndex}>
                  {song.title}
                </div>
                <div class="text-sm text-[var(--muted-foreground)] truncate" class:text-[var(--primary)]={index === currentIndex}>
                  {song.artist}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- 折叠状态的小圆球 -->
    <div class="orb-player w-12 h-12 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full shadow-lg cursor-pointer transition-all duration-500 ease-in-out flex items-center justify-center hover:scale-110 active:scale-95 pointer-events-auto"
         class:opacity-0={!isCollapsed}
         class:scale-0={!isCollapsed}
         class:pointer-events-none={!isCollapsed}
         onclick={toggleCollapse}
         onkeydown={(e) => {
           if (e.key === 'Enter' || e.key === ' ') {
             e.preventDefault();
             toggleCollapse();
           }
         }}
         role="button"
         tabindex="0"
         aria-label="展开播放器">
      {#if isLoading}
        <Icon icon="eos-icons:loading" class="text-[rgb(var(--color-text-primary))] text-lg" />
      {:else if isPlaying}
        <div class="flex space-x-0.5">
          <div class="w-0.5 h-3 bg-[rgb(var(--color-text-primary))] rounded-full animate-pulse"></div>
          <div class="w-0.5 h-4 bg-[rgb(var(--color-text-primary))] rounded-full animate-pulse" style="animation-delay: 150ms;"></div>
          <div class="w-0.5 h-2 bg-[rgb(var(--color-text-primary))] rounded-full animate-pulse" style="animation-delay: 300ms;"></div>
        </div>
      {:else}
        <Icon icon="material-symbols:music-note" class="text-[rgb(var(--color-text-primary))] text-lg" />
      {/if}
    </div>

    <!-- 展开状态的完整播放器 -->
    <div class="expanded-player bg-[var(--background)]/95 backdrop-blur-md border border-[var(--border)] shadow-xl rounded-2xl p-4 transition-all duration-500 ease-in-out w-80 max-w-[calc(100vw-2rem)] pointer-events-auto"
         class:opacity-0={isCollapsed}
         class:scale-95={isCollapsed}
         class:pointer-events-none={isCollapsed}
         class:hidden={isCollapsed}>
      
      <div class="flex items-center gap-4 mb-4">
        <div class="cover-container relative w-16 h-16 rounded-full overflow-hidden shrink-0">
          <img src={getAssetPath(currentSong.cover)} alt="封面"
               class="w-full h-full object-cover transition-transform duration-300"
               class:spinning={isPlaying && !isLoading}
               class:animate-pulse={isLoading} />
        </div>
        <div class="flex-1 min-w-0">
          <div class="song-title text-lg font-bold text-[var(--foreground)] truncate mb-1">{currentSong.title}</div>
          <div class="song-artist text-sm text-[var(--muted-foreground)] truncate">{currentSong.artist}</div>
          <div class="text-xs text-[var(--muted-foreground)] mt-1">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--muted)] transition-colors"
                  class:text-[var(--primary)]={showPlaylist}
                  onclick={togglePlaylist}
                  title="播放列表">
            <Icon icon="material-symbols:queue-music" class="text-lg" />
          </button>
        </div>
      </div>

      {#if showLyrics}
        <div class="lyrics-section mb-2 px-1">
          <div class="lyrics-container h-[88px] overflow-y-auto overflow-x-hidden relative text-center scroll-smooth"
               bind:this={lrcContainer}
               onscroll={handleLrcScroll}>
            {#if noLyrics}
              <div class="h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                暂无歌词
              </div>
            {:else if lyrics.length === 0}
              <div class="h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                加载歌词中...
              </div>
            {:else}
              <div class="py-8">
                {#each lyrics as line, index}
                  <button class="lyric-line w-full block text-sm py-1 transition-all duration-300 cursor-pointer hover:opacity-100 bg-transparent border-none p-0 focus:outline-none"
                     onclick={() => seekToLyric(line.time)}
                     class:text-[var(--primary)]={index === currentLrcIndex}
                     class:font-bold={index === currentLrcIndex}
                     class:scale-105={index === currentLrcIndex}
                     class:text-[var(--foreground)]={index !== currentLrcIndex}
                     class:opacity-60={index !== currentLrcIndex}
                     title="跳转至此句">
                    {line.text}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <div class="progress-section mb-4 w-full">
        <div class="progress-bar w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer relative overflow-hidden"
             bind:this={progressBar}
             onclick={setProgress}
             onkeydown={(e) => {
               if (e.key === 'Enter' || e.key === ' ') {
                 e.preventDefault();
                 const rect = progressBar?.getBoundingClientRect();
                 if (rect) {
                   const percent = 0.5;
                   const newTime = percent * duration;
                   if (audio) {
                     audio.currentTime = newTime;
                     currentTime = newTime;
                   }
                 }
               }
             }}
             role="slider"
             tabindex="0"
             aria-label={`进度 ${formatTime(currentTime)} / ${formatTime(duration)}`}
             aria-valuemin="0"
             aria-valuemax="100"
             aria-valuenow={duration > 0 ? (currentTime / duration * 100) : 0}>
          <div class="h-full bg-blue-500 rounded-full transition-all duration-100"
               style="width: {duration > 0 ? (currentTime / duration) * 100 : 0}%">
          </div>
        </div>
      </div>

      <div class="controls flex items-center justify-center gap-2 mb-4">
        <button class="w-10 h-10 rounded-lg hover:bg-[var(--muted)] transition-colors flex items-center justify-center"
                onclick={togglePlaybackMode}
                title={isRepeating === 1 ? "单曲循环" : (isShuffled ? "随机播放" : "列表循环")}>
          {#if isRepeating === 1}
            <Icon icon="material-symbols:repeat-one" class="text-lg" />
          {:else if isShuffled}
            <Icon icon="material-symbols:shuffle" class="text-lg" />
          {:else}
            <Icon icon="material-symbols:repeat" class="text-lg" />
          {/if}
        </button>
        <button class="hover:bg-[var(--muted)] w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                onclick={previousSong}
                disabled={playlist.length <= 1}>
          <Icon icon="material-symbols:skip-previous" class="text-xl" />
        </button>
        <button class="bg-[var(--primary)] text-[var(--primary-foreground)] w-12 h-12 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                class:opacity-50={isLoading}
                disabled={isLoading}
                onclick={togglePlay}>
          {#if isLoading}
            <Icon icon="eos-icons:loading" class="text-xl" />
          {:else if isPlaying}
            <Icon icon="material-symbols:pause" class="text-xl" />
          {:else}
            <Icon icon="material-symbols:play-arrow" class="text-xl" />
          {/if}
        </button>
        <button class="hover:bg-[var(--muted)] w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                onclick={nextSong}
                disabled={playlist.length <= 1}>
          <Icon icon="material-symbols:skip-next" class="text-xl" />
        </button>
        <button class="w-10 h-10 rounded-lg hover:bg-[var(--muted)] transition-colors flex items-center justify-center"
                onclick={toggleLyrics}
                title="切换歌词显示">
          <Icon icon="material-symbols:lyrics" class="text-lg {showLyrics ? 'text-[var(--primary)]' : 'opacity-90'}" />
        </button>
      </div>

      <div class="bottom-controls flex items-center gap-2">
        <button class="hover:bg-[var(--muted)] w-8 h-8 rounded-lg flex items-center justify-center transition-colors" onclick={toggleMute}>
          {#if isMuted || volume === 0}
            <Icon icon="material-symbols:volume-off" class="text-lg" />
          {:else if volume < 0.5}
            <Icon icon="material-symbols:volume-down" class="text-lg" />
          {:else}
            <Icon icon="material-symbols:volume-up" class="text-lg" />
          {/if}
        </button>
        <div class="flex-1 h-2 bg-[var(--muted)] rounded-full cursor-pointer"
             bind:this={volumeBar}
             onmousedown={startVolumeDrag}
             role="slider"
             tabindex="0"
             aria-label="音量"
             aria-valuemin="0"
             aria-valuemax="100"
             aria-valuenow={volume * 100}>
          <div class="h-full bg-[var(--primary)] rounded-full transition-all"
               class:duration-100={!isVolumeDragging}
               class:duration-0={isVolumeDragging}
               style="width: {volume * 100}%">
          </div>
        </div>
        <button class="hover:bg-[var(--muted)] w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                onclick={toggleCollapse}
                title="收起">
          <Icon icon="material-symbols:expand-more" class="text-lg" />
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slide-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }

  @keyframes spin-continuous {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .spinning {
    animation: spin-continuous 3s linear infinite;
  }

  /* Playlist Scrollbar Styles */
  .playlist-content {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.3s ease;
  }
  .playlist-content:hover {
    scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  }
  .playlist-content::-webkit-scrollbar {
    width: 4px;
  }
  .playlist-content::-webkit-scrollbar-track {
    background: transparent;
  }
  .playlist-content::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 4px;
  }
  .playlist-content:hover::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
  }

  /* Lyrics Scrollbar Styles */
  .lyrics-container {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.3s ease;
  }
  .lyrics-container:hover {
    scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  }
  .lyrics-container::-webkit-scrollbar {
    width: 4px;
  }
  .lyrics-container::-webkit-scrollbar-track {
    background: transparent;
  }
  .lyrics-container::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 4px;
  }
  .lyrics-container:hover::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
  }

  @media (hover: none) and (pointer: coarse) {
    .music-player button,
    .playlist-item {
      min-height: 44px;
    }
    .bottom-controls > div:nth-child(2) {
      height: 12px;
    }
  }

  @media (max-width: 768px) {
    .music-player {
      bottom: 8px !important;
      left: 8px !important;
    }
    .expanded-player {
      width: calc(100vw - 16px) !important;
      max-width: 320px;
    }
    .playlist-panel {
      width: calc(100vw - 16px) !important;
      max-width: 320px;
    }
  }

  /* 确保播放器不会超出视口 */
  .music-player {
    max-width: calc(100vw - 1rem);
  }
</style>
