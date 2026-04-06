<script lang="ts">
  import type { TimetableViewModel } from '@/types/timetable';

  export let viewModel: TimetableViewModel;

  let isOpen = false;
  let showWeekDropdown = false;
  let selectedWeek = viewModel.currentWeek;

  function handleWeekChange(week: number) {
    selectedWeek = week;
    if (week >= 1 && week <= viewModel.maxWeek) {
      window.location.href = `/timetable/${week}/`;
    }
  }

  function goToCurrentWeek() {
    window.location.href = '/timetable/';
  }

  function toggleWeekDropdown() {
    showWeekDropdown = !showWeekDropdown;
  }

  function selectWeek(week: number) {
    handleWeekChange(week);
    showWeekDropdown = false;
  }
</script>

<div class="mb-4">
  <button
    type="button"
    class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors"
    on:click={() => (isOpen = !isOpen)}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="transition-transform"
      class:rotate-180={isOpen}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
    快速跳转
  </button>

  {#if isOpen}
    <div class="mt-2 p-4 rounded-lg border border-border bg-secondary/50">
      <div class="flex flex-wrap items-center gap-3">
        <label class="text-sm text-muted-foreground">选择周次：</label>
        
        <!-- 自定义下拉选择器 -->
        <div class="relative">
          <button
            type="button"
            class="week-select-trigger inline-flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground hover:bg-secondary/50 transition-colors min-w-[100px]"
            on:click={toggleWeekDropdown}
          >
            <span>第 {selectedWeek} 周</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="transition-transform"
              class:rotate-180={showWeekDropdown}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          
          {#if showWeekDropdown}
            <div class="week-dropdown absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto rounded-md border border-border bg-background shadow-lg">
              {#each viewModel.weeks as week}
                <button
                  type="button"
                  class="week-option w-full px-3 py-2 text-sm text-left text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  class:bg-accent={week === selectedWeek}
                  class:text-accent-foreground={week === selectedWeek}
                  on:click={() => selectWeek(week)}
                >
                  第 {week} 周
                </button>
              {/each}
            </div>
          {/if}
        </div>
        
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
          on:click={goToCurrentWeek}
        >
          回到当前周
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .week-dropdown {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }
  
  .week-dropdown::-webkit-scrollbar {
    width: 6px;
  }
  
  .week-dropdown::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .week-dropdown::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }
</style>
