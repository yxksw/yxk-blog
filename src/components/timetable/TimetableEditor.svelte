<script lang="ts">
  import type {
    ParsedTimetableData,
    TimetableCourseArrangement,
    TimetableViewModel,
  } from '@/types/timetable';
  import { buildTimetableViewModel } from '@/utils/timetable-normalizer';
  import { parseTimetableFile } from '@/utils/timetable-parser';

  export let viewModel: TimetableViewModel;
  export let jsonText: string;

  const dayLabels: Record<number, string> = {
    1: '周一',
    2: '周二',
    3: '周三',
    4: '周四',
    5: '周五',
    6: '周六',
    7: '周日',
  };

  let visibleDays: number[] = [];
  let maxNode = 1;
  let baselineParsed = parseBaselineText(jsonText);

  let editMode = false;
  let draftParsed = cloneParsedData(baselineParsed);
  let previewViewModel = buildTimetableViewModel(
    draftParsed,
    viewModel.currentWeek,
  );
  let selectedArrangementRef: number | null = null;
  let validationError = '';
  let isDirty = false;
  let creatingCourse = false;

  type NewCourseDraft = {
    courseName: string;
    teacher: string;
    room: string;
    day: number;
    startNode: number;
    startWeek: number;
    endWeek: number;
  };

  type ArrangementCardItem = {
    arrangementIndex: number;
    title: string;
    teacher: string;
    room: string;
    nodeText: string;
    weekText: string;
    color: string;
  };

  type ArrangementCardGroup = {
    day: number;
    label: string;
    items: ArrangementCardItem[];
  };

  let arrangementCards: ArrangementCardGroup[] = [];
  let selectedArrangement: TimetableCourseArrangement | null = null;
  let selectedCourseName = '';
  let newCourseDraft = createNewCourseDraft();

  $: visibleDays = viewModel.dayColumns.map((column) => column.day);
  $: maxNode = Math.max(...viewModel.nodeRows.map((row) => row.node), 1);
  $: arrangementCards = buildArrangementCards(
    previewViewModel,
    draftParsed.schedules,
  );
  $: selectedArrangement =
    selectedArrangementRef === null
      ? null
      : (draftParsed.schedules[selectedArrangementRef] ?? null);
  $: selectedCourseName = selectedArrangement
    ? draftParsed.courses.find(
        (course) => course.id === selectedArrangement?.id,
      )?.courseName || ''
    : '';
  $: existingCourseNames = [
    ...new Set(
      draftParsed.courses.map((c) => c.courseName).filter(Boolean),
    ),
  ];
  $: existingTeachers = [
    ...new Set(draftParsed.schedules.map((a) => a.teacher).filter(Boolean)),
  ];
  $: existingRooms = [
    ...new Set(draftParsed.schedules.map((a) => a.room).filter(Boolean)),
  ];

  function parseBaselineText(text: string): ParsedTimetableData {
    try {
      return parseTimetableFile(text);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : '课表基线数据解析失败',
      );
    }
  }

  function deepClone<T>(value: T): T {
    if (typeof globalThis.structuredClone === 'function') {
      return globalThis.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function cloneParsedData(data: ParsedTimetableData): ParsedTimetableData {
    return {
      courseLen: data.courseLen,
      id: data.id,
      name: data.name,
      sameBreakLen: data.sameBreakLen,
      sameLen: data.sameLen,
      theBreakLen: data.theBreakLen,
      timeTable: deepClone(data.timeTable),
      settings: deepClone(data.settings),
      courses: deepClone(data.courses),
      schedules: deepClone(data.schedules),
    };
  }

  function buildArrangementCards(
    currentViewModel: TimetableViewModel,
    schedules: ParsedTimetableData['schedules'],
  ): ArrangementCardGroup[] {
    return currentViewModel.dayColumns.map((dayColumn) => {
      const cards = currentViewModel.coursesByDay[dayColumn.day] ?? [];
      const items = cards
        .map((courseView) => {
          const arrangementIndex = schedules.findIndex(
            (arrangement) =>
              arrangement.id === courseView.courseId &&
              arrangement.day === courseView.day &&
              arrangement.startNode === courseView.startNode &&
              arrangement.startWeek === courseView.startWeek &&
              arrangement.endWeek === courseView.endWeek,
          );

          if (arrangementIndex < 0) {
            return null;
          }

          return {
            arrangementIndex,
            title: courseView.courseName,
            teacher: courseView.teacher,
            room: courseView.room,
            nodeText: courseView.nodeText,
            weekText: `${courseView.startWeek}-${courseView.endWeek}周`,
            color: courseView.color,
          };
        })
        .filter((item): item is ArrangementCardItem => Boolean(item));

      return {
        day: dayColumn.day,
        label: dayLabels[dayColumn.day] ?? dayColumn.label,
        items,
      };
    });
  }

  function createNewCourseDraft(): NewCourseDraft {
    const defaultDay = visibleDays[0] ?? 1;
    const maxWeek = Math.max(1, draftParsed.settings.maxWeek || 1);
    return {
      courseName: '',
      teacher: '',
      room: '',
      day: defaultDay,
      startNode: 1,
      startWeek: 1,
      endWeek: maxWeek,
    };
  }

  function enterEditMode() {
    draftParsed = cloneParsedData(baselineParsed);
    previewViewModel = buildTimetableViewModel(
      draftParsed,
      viewModel.currentWeek,
    );
    selectedArrangementRef = null;
    creatingCourse = false;
    newCourseDraft = createNewCourseDraft();
    validationError = '';
    isDirty = false;
    editMode = true;
  }

  function cancelEditMode() {
    restoreBaselineAndExit();
  }

  function restoreBaselineAndExit() {
    draftParsed = cloneParsedData(baselineParsed);
    previewViewModel = buildTimetableViewModel(
      draftParsed,
      viewModel.currentWeek,
    );
    selectedArrangementRef = null;
    creatingCourse = false;
    newCourseDraft = createNewCourseDraft();
    validationError = '';
    isDirty = false;
    editMode = false;
  }

  function selectArrangement(index: number) {
    creatingCourse = false;
    selectedArrangementRef = index;
    validationError = '';
  }

  function beginCreateCourse() {
    creatingCourse = true;
    selectedArrangementRef = null;
    validationError = '';
    newCourseDraft = createNewCourseDraft();
  }

  function cancelCreateCourse() {
    creatingCourse = false;
    newCourseDraft = createNewCourseDraft();
    validationError = '';
  }

  function updateNewCourseDraft(
    field:
      | 'courseName'
      | 'teacher'
      | 'room'
      | 'day'
      | 'startNode'
      | 'startWeek'
      | 'endWeek',
    value: string,
  ) {
    if (field === 'courseName' || field === 'teacher' || field === 'room') {
      (newCourseDraft as Record<string, string>)[field] = value;
      return;
    }

    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
      return;
    }
    (newCourseDraft as Record<string, number>)[field] = Math.floor(nextValue);
  }

  function submitCreateCourse() {
    const courseName = newCourseDraft.courseName.trim();
    if (!courseName) {
      validationError = '新增课程的课程名不能为空';
      return;
    }

    const maxWeek = Math.max(1, draftParsed.settings.maxWeek || 1);
    if (!visibleDays.includes(newCourseDraft.day)) {
      validationError = '新增课程的星期不在当前课表显示范围内';
      return;
    }
    if (newCourseDraft.startNode < 1 || newCourseDraft.startNode > maxNode) {
      validationError = `新增课程的起始节次超出范围（1-${maxNode}）`;
      return;
    }
    if (newCourseDraft.startWeek < 1 || newCourseDraft.endWeek < 1) {
      validationError = '新增课程的周次必须大于等于 1';
      return;
    }
    if (newCourseDraft.startWeek > newCourseDraft.endWeek) {
      validationError = '新增课程的起止周非法（开始周不能大于结束周）';
      return;
    }
    if (newCourseDraft.endWeek > maxWeek) {
      validationError = `新增课程的结束周超出最大周次 ${maxWeek}`;
      return;
    }

    const maxCourseId = draftParsed.courses.reduce(
      (maxId, course) => Math.max(maxId, course.id),
      0,
    );
    const nextCourseId = maxCourseId + 1;
    draftParsed.courses.push({
      id: nextCourseId,
      courseName,
      color: '',
      credit: 0,
      note: '',
      tableId: draftParsed.id,
    });
    draftParsed.schedules.push({
      id: nextCourseId,
      day: newCourseDraft.day,
      startNode: newCourseDraft.startNode,
      step: 2,
      startWeek: newCourseDraft.startWeek,
      endWeek: newCourseDraft.endWeek,
      teacher: newCourseDraft.teacher,
      room: newCourseDraft.room,
      endTime: '',
      level: 0,
      ownTime: false,
      startTime: '',
      tableId: draftParsed.id,
      type: 0,
    });

    creatingCourse = false;
    selectedArrangementRef = draftParsed.schedules.length - 1;
    validationError = '';
    afterDraftChange();
    newCourseDraft = createNewCourseDraft();
  }

  function updateSelectedArrangement(
    field: 'teacher' | 'room' | 'day' | 'startNode' | 'startWeek' | 'endWeek',
    value: string,
  ) {
    if (selectedArrangementRef === null) {
      return;
    }

    const arrangement = draftParsed.schedules[selectedArrangementRef];
    if (!arrangement) {
      return;
    }

    if (field === 'teacher' || field === 'room') {
      arrangement[field] = value;
    } else {
      const nextValue = Number(value);
      if (!Number.isFinite(nextValue)) {
        return;
      }
      (arrangement as Record<string, unknown>)[field] = Math.floor(nextValue);
    }

    afterDraftChange();
  }

  function deleteSelectedArrangement() {
    if (selectedArrangementRef === null) {
      return;
    }

    draftParsed.schedules.splice(selectedArrangementRef, 1);
    selectedArrangementRef = null;
    afterDraftChange();
  }

  function updateCourseName(value: string) {
    if (!selectedArrangement) {
      return;
    }
    const courseDef = draftParsed.courses.find(
      (course) => course.id === selectedArrangement?.id,
    );
    if (!courseDef) {
      return;
    }
    courseDef.courseName = value;
    afterDraftChange();
  }

  function afterDraftChange() {
    validationError = validateDraft(draftParsed);
    previewViewModel = buildTimetableViewModel(
      draftParsed,
      viewModel.currentWeek,
    );
    isDirty = true;
  }

  function validateDraft(data: ParsedTimetableData): string {
    const maxWeek = Math.max(1, data.settings.maxWeek || 1);

    for (let index = 0; index < data.schedules.length; index += 1) {
      const arrangement = data.schedules[index];
      if (arrangement.day < 1 || arrangement.day > 7) {
        return `第 ${index + 1} 条课程安排的星期超出范围（1-7）`;
      }
      if (!visibleDays.includes(arrangement.day)) {
        return `第 ${index + 1} 条课程安排的星期不在当前课表显示范围内`;
      }
      if (arrangement.startNode < 1 || arrangement.startNode > maxNode) {
        return `第 ${index + 1} 条课程安排的起始节次超出范围（1-${maxNode}）`;
      }
      if (arrangement.startWeek < 1 || arrangement.endWeek < 1) {
        return `第 ${index + 1} 条课程安排的周次必须大于等于 1`;
      }
      if (arrangement.startWeek > arrangement.endWeek) {
        return `第 ${index + 1} 条课程安排的起止周非法（开始周不能大于结束周）`;
      }
      if (arrangement.endWeek > maxWeek) {
        return `第 ${index + 1} 条课程安排的结束周超出最大周次 ${maxWeek}`;
      }
      const courseDef = data.courses.find(
        (course) => course.id === arrangement.id,
      );
      if (!courseDef || !courseDef.courseName?.trim()) {
        return `第 ${index + 1} 条课程安排关联课程名为空`;
      }
    }

    for (const course of data.courses) {
      if (!course.courseName?.trim()) {
        return `课程定义 #${course.id} 的课程名不能为空`;
      }
    }

    return '';
  }

  function resetDraft() {
    draftParsed = cloneParsedData(baselineParsed);
    previewViewModel = buildTimetableViewModel(
      draftParsed,
      viewModel.currentWeek,
    );
    selectedArrangementRef = null;
    creatingCourse = false;
    newCourseDraft = createNewCourseDraft();
    validationError = '';
    isDirty = false;
  }

  function exportJson() {
    const error = validateDraft(draftParsed);
    if (error) {
      validationError = error;
      return;
    }

    validationError = '';
    const dataToExport = {
      courseLen: draftParsed.courseLen,
      id: draftParsed.id,
      name: draftParsed.name,
      sameBreakLen: draftParsed.sameBreakLen,
      sameLen: draftParsed.sameLen,
      theBreakLen: draftParsed.theBreakLen,
      timeTable: draftParsed.timeTable,
      settings: draftParsed.settings,
      courses: draftParsed.courses,
      schedules: draftParsed.schedules,
    };
    const text = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${draftParsed.settings.tableName || 'timetable'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    restoreBaselineAndExit();
  }

  function getNumberValue(value: number | undefined): string {
    return Number.isFinite(value) ? String(value) : '';
  }

  function getEventValue(event: Event): string {
    const target = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    return target?.value ?? '';
  }
</script>

<div class="mb-5 flex items-center gap-2">
  {#if editMode}
    <button
      type="button"
      class="px-3 py-2 text-sm font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors"
      on:click={cancelEditMode}
    >
      退出编辑
    </button>
    <button
      type="button"
      class="px-3 py-2 text-sm font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors"
      on:click={resetDraft}
      disabled={!isDirty}
    >
      重置
    </button>
    <button
      type="button"
      class="px-3 py-2 text-sm font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors"
      on:click={beginCreateCourse}
    >
      新增课程
    </button>
    <button
      type="button"
      class="px-3 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
      on:click={exportJson}
    >
      导出 JSON
    </button>
  {:else}
    <button
      type="button"
      class="px-3 py-2 text-sm font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors"
      on:click={enterEditMode}
    >
      编辑课表
    </button>
  {/if}
</div>

{#if editMode}
  <div class="mb-4 rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 text-xs text-foreground">
    当前为临时编辑模式：导出后将自动退出并恢复原始课表展示。
  </div>

  {#if validationError}
    <div class="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">
      {validationError}
    </div>
  {/if}

  <div class="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
    <section class="rounded-xl border border-border bg-card p-4">
      <h3 class="mb-3 text-sm font-semibold text-foreground">可视化课程列表（当前周）</h3>
      <div class="grid gap-3 md:grid-cols-2">
        {#each arrangementCards as dayGroup}
          <div class="rounded-lg border border-border p-3 bg-secondary/30">
            <div class="mb-2 text-sm font-medium text-foreground">{dayGroup.label}</div>
            {#if dayGroup.items.length === 0}
              <p class="text-xs text-muted-foreground">本日暂无课程</p>
            {:else}
              <div class="flex flex-col gap-2">
                {#each dayGroup.items as item}
                  <button
                    type="button"
                    class={`w-full rounded-lg border px-3 py-2 text-left transition ${selectedArrangementRef === item.arrangementIndex ? 'border-accent bg-accent/15' : 'border-border bg-card hover:border-accent/50'}`}
                    on:click={() => selectArrangement(item.arrangementIndex)}
                  >
                    <div class="mb-1 text-sm font-semibold" style={`color:${item.color}`}>{item.title}</div>
                    <div class="text-xs text-muted-foreground">{item.nodeText} · {item.weekText}</div>
                    <div class="text-xs text-muted-foreground">{item.teacher} / {item.room}</div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    <section class="rounded-xl border border-border bg-card p-4">
      <h3 class="mb-3 text-sm font-semibold text-foreground">属性编辑面板</h3>
      {#if creatingCourse}
        <div class="space-y-3">
          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">课程名</span>
            <input
              type="text"
              list="course-name-list"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={newCourseDraft.courseName}
              on:input={(event) =>
                updateNewCourseDraft('courseName', getEventValue(event))}
            />
            <datalist id="course-name-list">
              {#each existingCourseNames as name}
                <option value={name} />
              {/each}
            </datalist>
          </label>

          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">教师</span>
            <input
              type="text"
              list="teacher-list"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={newCourseDraft.teacher}
              on:input={(event) => updateNewCourseDraft('teacher', getEventValue(event))}
            />
            <datalist id="teacher-list">
              {#each existingTeachers as teacher}
                <option value={teacher} />
              {/each}
            </datalist>
          </label>

          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">教室</span>
            <input
              type="text"
              list="room-list"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={newCourseDraft.room}
              on:input={(event) => updateNewCourseDraft('room', getEventValue(event))}
            />
            <datalist id="room-list">
              {#each existingRooms as room}
                <option value={room} />
              {/each}
            </datalist>
          </label>

          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">星期</span>
            <select
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={getNumberValue(newCourseDraft.day)}
              on:change={(event) => updateNewCourseDraft('day', getEventValue(event))}
            >
              {#each visibleDays as day}
                <option value={String(day)}>{dayLabels[day]}</option>
              {/each}
            </select>
          </label>

          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">起始节</span>
            <input
              type="number"
              min="1"
              max={String(maxNode)}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={getNumberValue(newCourseDraft.startNode)}
              on:input={(event) =>
                updateNewCourseDraft('startNode', getEventValue(event))}
            />
          </label>

          <div class="grid grid-cols-2 gap-2">
            <label class="block text-xs text-muted-foreground">
              <span class="mb-1 block">起始周</span>
              <input
                type="number"
                min="1"
                max={String(draftParsed.settings.maxWeek)}
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                value={getNumberValue(newCourseDraft.startWeek)}
                on:input={(event) =>
                  updateNewCourseDraft('startWeek', getEventValue(event))}
              />
            </label>

            <label class="block text-xs text-muted-foreground">
              <span class="mb-1 block">结束周</span>
              <input
                type="number"
                min="1"
                max={String(draftParsed.settings.maxWeek)}
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                value={getNumberValue(newCourseDraft.endWeek)}
                on:input={(event) =>
                  updateNewCourseDraft('endWeek', getEventValue(event))}
              />
            </label>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <button
              type="button"
              class="px-3 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
              on:click={submitCreateCourse}
            >
              保存新增课程
            </button>
            <button
              type="button"
              class="px-3 py-2 text-sm font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors"
              on:click={cancelCreateCourse}
            >
              取消新增
            </button>
          </div>
        </div>
      {:else if selectedArrangement}
        <div class="space-y-3">
          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">课程名</span>
            <input
              type="text"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={selectedCourseName}
              on:input={(event) => updateCourseName(getEventValue(event))}
            />
          </label>

          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">教师</span>
            <input
              type="text"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={selectedArrangement.teacher ?? ''}
              on:input={(event) => updateSelectedArrangement('teacher', getEventValue(event))}
            />
          </label>

          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">教室</span>
            <input
              type="text"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={selectedArrangement.room ?? ''}
              on:input={(event) => updateSelectedArrangement('room', getEventValue(event))}
            />
          </label>

          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">星期</span>
            <select
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={getNumberValue(selectedArrangement.day)}
              on:change={(event) => updateSelectedArrangement('day', getEventValue(event))}
            >
              {#each visibleDays as day}
                <option value={String(day)}>{dayLabels[day]}</option>
              {/each}
            </select>
          </label>

          <label class="block text-xs text-muted-foreground">
            <span class="mb-1 block">起始节</span>
            <input
              type="number"
              min="1"
              max={String(maxNode)}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              value={getNumberValue(selectedArrangement.startNode)}
              on:input={(event) =>
                updateSelectedArrangement('startNode', getEventValue(event))}
            />
          </label>

          <div class="grid grid-cols-2 gap-2">
            <label class="block text-xs text-muted-foreground">
              <span class="mb-1 block">起始周</span>
              <input
                type="number"
                min="1"
                max={String(draftParsed.settings.maxWeek)}
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                value={getNumberValue(selectedArrangement.startWeek)}
                on:input={(event) =>
                  updateSelectedArrangement('startWeek', getEventValue(event))}
              />
            </label>

            <label class="block text-xs text-muted-foreground">
              <span class="mb-1 block">结束周</span>
              <input
                type="number"
                min="1"
                max={String(draftParsed.settings.maxWeek)}
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                value={getNumberValue(selectedArrangement.endWeek)}
                on:input={(event) =>
                  updateSelectedArrangement('endWeek', getEventValue(event))}
              />
            </label>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <button
              type="button"
              class="px-3 py-2 text-sm font-medium rounded-lg border border-red-400/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              on:click={deleteSelectedArrangement}
            >
              删除课程
            </button>
          </div>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">请先在左侧点击课程卡片，或点击上方"新增课程"。</p>
      {/if}
    </section>
  </div>
{:else}
  <div class="mb-4 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
    点击"编辑课表"进入图形化编辑模式，导出后会自动还原页面临时修改。
  </div>
{/if}
