/**
 * Task-board copy: zh-first dictionaries with an English fallback, selected
 * by the document language. Kept dependency-free (no dsh locale service) so
 * the DOM-injected entry row and the standalone board tree share one tiny
 * lookup.
 */
/** zh dictionary (key-set source of truth). */
export declare const zh: {
    'entry.label': string;
    'board.title': string;
    'board.close': string;
    'board.new': string;
    'board.search': string;
    'board.empty': string;
    'board.filterAll': string;
    'board.status': string;
    'board.status.backlog': string;
    'board.status.todo': string;
    'board.status.running': string;
    'board.status.done': string;
    'board.status.failed': string;
    'board.runs': string;
    'board.updated': string;
    'board.created': string;
    'new.title': string;
    'new.titlePlaceholder': string;
    'new.description': string;
    'new.descriptionPlaceholder': string;
    'new.prompt': string;
    'new.promptPlaceholder': string;
    'new.submit': string;
    'new.cancel': string;
    'new.required': string;
    'detail.title': string;
    'detail.close': string;
    'detail.prompt': string;
    'detail.description': string;
    'detail.execution': string;
    'detail.noExecution': string;
    'detail.run': string;
    'detail.rerun': string;
    'detail.delete': string;
    'detail.viewSession': string;
    'detail.noSession': string;
    'detail.executionStarted': string;
    'detail.executionEnded': string;
    'detail.result.succeeded': string;
    'detail.result.failed': string;
    'detail.result.cancelled': string;
    'detail.result.running': string;
    'delete.title': string;
    'delete.confirm': string;
    'delete.ok': string;
    'delete.cancel': string;
    'status.move.backlog': string;
    'status.move.todo': string;
    'exec.error.noWorkspace': string;
    'exec.error.promptRejected': string;
    'run.failed': string;
    'time.justNow': string;
    'detail.schedule': string;
    'detail.schedule.enable': string;
    'detail.schedule.cron': string;
    'detail.schedule.presets': string;
    'detail.schedule.preset.daily9': string;
    'detail.schedule.preset.hourly': string;
    'detail.schedule.preset.tenMin': string;
    'detail.schedule.preset.weeklyMon9': string;
    'detail.schedule.nextRun': string;
    'detail.schedule.lastTriggered': string;
    'detail.schedule.invalid': string;
    'detail.schedule.notScheduled': string;
    'detail.schedule.dueSoon': string;
    'card.scheduled': string;
    'new.workspace': string;
    'new.mode': string;
    'new.permission': string;
    'exec.workspace.recent': string;
    'exec.mode.default': string;
    'exec.mode.defaultSuffix': string;
    'exec.mode.brokenSuffix': string;
    'exec.mode.removed': string;
    'exec.permission.default': string;
    'exec.permission.read-only': string;
    'exec.permission.workspace-write': string;
    'exec.permission.danger-full-access': string;
    'detail.executionSettings': string;
    'exec.hint': string;
    'settings.title': string;
    'settings.description': string;
    'settings.enabled': string;
    'settings.enabledHint': string;
    'settings.announceToAgent': string;
    'settings.announceToAgentHint': string;
    'settings.inherit': string;
    'settings.on': string;
    'settings.off': string;
    'settings.overridden': string;
    'settings.reset': string;
    'settings.notExposed': string;
    'settings.readOnly': string;
    'settings.expand': string;
    'settings.collapse': string;
    'settings.save': string;
    'settings.saving': string;
    'settings.discard': string;
    'settings.unsaved': string;
    'settings.saveFailed': string;
    'settings.invalidNumber': string;
};
/** en dictionary, complete against the zh key set. */
export declare const en: Record<keyof typeof zh, string>;
/** The dictionary key union. */
export type TaskBoardKey = keyof typeof zh;
/** The settings-card slice of the task-board dictionary. */
export type SettingsCardKey = TaskBoardKey;
/** Active dictionary, picked by the document language at call time. */
export declare function dictionary(): Record<TaskBoardKey, string>;
/** Translate a key with optional {name} template params. */
export declare function t(key: TaskBoardKey, params?: Record<string, string>): string;
