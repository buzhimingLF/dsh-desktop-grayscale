window.__ModuleLoader__.load({
	id: "@linxin666/dsh-client-ui-task-board",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_dom_client = require("react-dom/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		//#region src/core/tasks.ts
		/** Permission presets a task may pin on its execution session (the `/permission <id>` ids). */
		const TASK_PERMISSIONS = [
			"read-only",
			"workspace-write",
			"danger-full-access"
		];
		/** Whether an unknown value is a known permission preset id. */
		function isTaskPermission(value) {
			return typeof value === "string" && TASK_PERMISSIONS.includes(value);
		}
		/** The five kanban columns, in display order. */
		const COLUMNS = [
			{
				status: "backlog",
				label: "待规划"
			},
			{
				status: "todo",
				label: "待办"
			},
			{
				status: "running",
				label: "进行中"
			},
			{
				status: "done",
				label: "已完成"
			},
			{
				status: "failed",
				label: "已失败"
			}
		];
		/** Statuses a user may move a card to manually (execution states are owned by the runner). */
		const MANUAL_STATUSES = ["backlog", "todo"];
		/** All valid statuses (closed union guard). */
		const ALL_STATUSES = [
			"backlog",
			"todo",
			"running",
			"done",
			"failed"
		];
		/** Brand an unknown string as a status; undefined when it is not one. */
		function isTaskStatus(value) {
			return typeof value === "string" && ALL_STATUSES.includes(value);
		}
		/** Normalize one optional execution-target string: trim; blank collapses to undefined. */
		function normalizeTargetId$2(value) {
			const trimmed = value?.trim();
			return trimmed === void 0 || trimmed === "" ? void 0 : trimmed;
		}
		/** Create a task from user input. */
		function createTask(input, now, id) {
			return {
				id,
				title: input.title.trim(),
				description: input.description.trim(),
				prompt: input.prompt.trim(),
				status: "todo",
				createdAt: now,
				updatedAt: now,
				executions: [],
				workspaceId: normalizeTargetId$2(input.workspaceId),
				mode: normalizeTargetId$2(input.mode),
				permission: isTaskPermission(input.permission) ? input.permission : void 0
			};
		}
		/** Clone a task with an updated status and a fresh updatedAt. */
		function withStatus(task, status, now) {
			return {
				...task,
				status,
				updatedAt: now
			};
		}
		/**
		* Merge a schedule patch into a task's schedule rule (creating it when
		* absent), with a fresh updatedAt. Keys present in the patch overwrite the
		* current value — including explicit `undefined`, which clears a field (used
		* to disarm `nextRunAt`); absent keys keep their current value.
		*/
		function withSchedule(task, patch, now) {
			const current = task.schedule;
			const schedule = {
				enabled: current?.enabled ?? false,
				cron: current?.cron ?? "",
				nextRunAt: current?.nextRunAt,
				lastTriggeredAt: current?.lastTriggeredAt
			};
			if ("enabled" in patch) schedule.enabled = patch.enabled ?? false;
			if ("cron" in patch) schedule.cron = patch.cron ?? "";
			if ("nextRunAt" in patch) schedule.nextRunAt = patch.nextRunAt;
			if ("lastTriggeredAt" in patch) schedule.lastTriggeredAt = patch.lastTriggeredAt;
			return {
				...task,
				updatedAt: now,
				schedule
			};
		}
		/**
		* Open a fresh execution on a task: move it to 'running' and append a
		* running execution record. Returns the new task and the new execution.
		*/
		function startExecution(task, now, executionId) {
			const execution = {
				id: executionId,
				sessionId: void 0,
				startedAt: now,
				endedAt: void 0,
				result: void 0,
				error: void 0
			};
			return {
				task: {
					...task,
					status: "running",
					updatedAt: now,
					executions: [...task.executions, execution]
				},
				execution
			};
		}
		/**
		* Settle a running execution: record the outcome and move the task into the
		* matching column. No-op (returns the input task) when the execution is not
		* the task's latest or is already settled.
		*/
		function settleExecution(task, executionId, outcome, now, error) {
			const index = task.executions.findIndex((execution) => execution.id === executionId);
			if (index === -1) return task;
			const execution = task.executions[index];
			if (execution.endedAt !== void 0) return task;
			const settled = {
				...execution,
				endedAt: now,
				result: outcome,
				error
			};
			const executions = [...task.executions];
			executions[index] = settled;
			const status = outcome === "succeeded" ? "done" : outcome === "failed" ? "failed" : task.status === "running" ? "todo" : task.status;
			return {
				...task,
				status,
				updatedAt: now,
				executions
			};
		}
		/** A settled-execution summary string for the detail view. */
		function executionLabel(execution) {
			if (execution.result === "succeeded") return "succeeded";
			if (execution.result === "failed") return "failed";
			if (execution.result === "cancelled") return "cancelled";
			return "running";
		}
		//#endregion
		//#region src/core/use-cases/task-create.ts
		/**
		* Create-task use case: mint a new task from user input, rejecting a blank
		* title. Pure ledger transition (no persistence or notify — the controller
		* orchestrates those), so it is unit-testable without any runtime face.
		*/
		/**
		* Apply a create against the current ledger. Returns the new task and the
		* appended ledger, or the unchanged ledger when the title is blank.
		* @param tasks - current ledger.
		* @param input - raw user input (title/description/prompt).
		* @param now - clock instant (ms epoch).
		* @param id - minted task id.
		*/
		function applyCreateTask(tasks, input, now, id) {
			if (input.title.trim() === "") return {
				task: void 0,
				tasks
			};
			const task = createTask(input, now, id);
			return {
				task,
				tasks: [...tasks, task]
			};
		}
		//#endregion
		//#region src/core/use-cases/task-delete.ts
		/**
		* Apply a delete across the ledger. The selection (a task id) is cleared when
		* it matches the removed task, so the UI never lingers on a vanished detail.
		* @param tasks - current ledger.
		* @param selectedTaskId - the currently selected task id (may be undefined).
		* @param id - the task to remove.
		*/
		function applyDeleteTask(tasks, selectedTaskId, id) {
			return {
				tasks: tasks.filter((task) => task.id !== id),
				selectionCleared: selectedTaskId === id
			};
		}
		//#endregion
		//#region src/core/schedule.ts
		/** Inclusive ranges per field, in cron order. */
		const FIELD_RANGES = [
			[0, 59],
			[0, 23],
			[1, 31],
			[1, 12],
			[0, 7]
		];
		/**
		* Parse a 5-field cron expression.
		* @returns the match sets, or null when the expression is invalid.
		*/
		function parseCron(expr) {
			const fields = expr.trim().split(/\s+/);
			if (fields.length !== 5) return null;
			const sets = [];
			for (let index = 0; index < 5; index++) {
				const [min, max] = FIELD_RANGES[index];
				const set = /* @__PURE__ */ new Set();
				if (!parseField(fields[index], min, max, set)) return null;
				sets.push(set);
			}
			const weekdays = /* @__PURE__ */ new Set();
			for (const day of sets[4]) weekdays.add(day === 7 ? 0 : day);
			return {
				minutes: sets[0],
				hours: sets[1],
				days: sets[2],
				months: sets[3],
				weekdays,
				dayWildcard: fields[2] === "*",
				weekdayWildcard: fields[4] === "*"
			};
		}
		/** Whether the expression parses. */
		function isValidCron(expr) {
			return parseCron(expr) !== null;
		}
		/**
		* Compute the next matching instant after `fromMs` (ms epoch), in local time,
		* at minute granularity, strictly greater than `fromMs`. Returns the ms epoch
		* of the matching minute's start, or undefined when nothing matches within
		* 366 days (e.g. `0 0 30 2 *`).
		*/
		function nextRunAtMs(expr, fromMs) {
			const schedule = parseCron(expr);
			if (schedule === null) return void 0;
			const from = new Date(fromMs);
			const scan = new Date(from.getFullYear(), from.getMonth(), from.getDate(), from.getHours(), from.getMinutes() + 1, 0, 0);
			const limitMs = fromMs + 366 * 24 * 60 * 60 * 1e3;
			while (scan.getTime() <= limitMs) {
				if (matches(schedule, scan)) return scan.getTime();
				scan.setMinutes(scan.getMinutes() + 1);
			}
		}
		/** Parse one comma-list field into the match set. */
		function parseField(field, min, max, out) {
			if (field === "*") {
				for (let value = min; value <= max; value++) out.add(value);
				return true;
			}
			for (const part of field.split(",")) {
				if (part === "") return false;
				const [range, stepRaw] = part.split("/");
				let low;
				let high;
				if (range === "*") {
					low = min;
					high = max;
				} else if (range.includes("-")) {
					const [a, b] = range.split("-");
					if (a === "" || b === "" || !isDigits(a) || !isDigits(b)) return false;
					low = Number(a);
					high = Number(b);
				} else if (isDigits(range)) {
					low = Number(range);
					high = Number(range);
				} else return false;
				if (low < min || high > max || low > high) return false;
				const step = stepRaw === void 0 ? 1 : isDigits(stepRaw) ? Number(stepRaw) : NaN;
				if (!Number.isInteger(step) || step < 1) return false;
				for (let value = low; value <= high; value += step) out.add(value);
			}
			return true;
		}
		/** Day/weekday OR semantics: a restricted day field alone gates, and vice versa. */
		function matches(schedule, date) {
			if (!schedule.minutes.has(date.getMinutes())) return false;
			if (!schedule.hours.has(date.getHours())) return false;
			if (!schedule.months.has(date.getMonth() + 1)) return false;
			const dayMatches = schedule.days.has(date.getDate());
			const weekdayMatches = schedule.weekdays.has(date.getDay());
			if (schedule.dayWildcard) return weekdayMatches;
			if (schedule.weekdayWildcard) return dayMatches;
			return dayMatches || weekdayMatches;
		}
		function isDigits(value) {
			return /^\d+$/.test(value);
		}
		//#endregion
		//#region src/core/use-cases/task-schedule.ts
		/**
		* Schedule use case: arm/disarm a task's cron rule and roll a rule forward.
		* Pure ledger transitions (no persistence or notify — the controller
		* orchestrates those). Validation and next-run computation live here, sharing
		* the core cron parser (schedule.ts) and the withSchedule transition.
		*/
		/**
		* Set a task's schedule rule. A blank or invalid cron is rejected (state
		* untouched); an enabled rule computes the next run instant immediately, a
		* disabled or invalid one carries no next-run instant.
		* @param tasks - current ledger.
		* @param id - the task to schedule.
		* @param patch - rule fields to change (absent fields keep their current value).
		* @param now - clock instant (ms epoch).
		*/
		function applySetSchedule(tasks, id, patch, now) {
			const task = tasks.find((candidate) => candidate.id === id);
			if (task === void 0) return {
				tasks,
				applied: false
			};
			const current = task.schedule;
			const cron = (patch.cron ?? current?.cron ?? "").trim();
			if (cron === "" || !isValidCron(cron)) return {
				tasks,
				applied: false
			};
			const enabled = patch.enabled ?? current?.enabled ?? false;
			const nextRunAt = enabled ? nextRunAtMs(cron, now) : void 0;
			return {
				tasks: tasks.map((candidate) => candidate.id === id ? withSchedule(candidate, {
					enabled,
					cron,
					nextRunAt
				}, now) : candidate),
				applied: true
			};
		}
		/**
		* Roll a task's schedule rule forward (scheduler callback): persist the next
		* due instant and the trigger instant. No-op for tasks without a rule (deleted
		* mid-tick, for example).
		* @param tasks - current ledger.
		* @param id - the task to roll forward.
		* @param nextRunAt - next due instant (may be undefined to clear).
		* @param lastTriggeredAt - the trigger instant of this run.
		* @param now - clock instant (ms epoch).
		*/
		function applyScheduleNextRun(tasks, id, nextRunAt, lastTriggeredAt, now) {
			return tasks.map((task) => task.id === id && task.schedule !== void 0 ? withSchedule(task, {
				nextRunAt,
				lastTriggeredAt
			}, now) : task);
		}
		//#endregion
		//#region src/core/use-cases/task-update.ts
		/**
		* Update-task use case: apply an editable-field patch (title/description/
		* prompt plus the execution targets workspaceId/mode/permission) with a
		* fresh updatedAt. Pure ledger transition (no persistence or notify — the
		* controller orchestrates those).
		*
		* An explicit `undefined` in the patch clears the field (the task falls
		* back to the runtime default); an unknown permission string is ignored so
		* stale UI can never persist a value the execution service rejects.
		*/
		/** Collapse a blank target string to undefined (clears the pin). */
		function normalizeTargetId$1(value) {
			return value !== void 0 && value.trim() === "" ? void 0 : value;
		}
		/** Keep an unknown permission string from entering the ledger. */
		function normalizePermission(current, value) {
			if (value === void 0) return void 0;
			return isTaskPermission(value) ? value : current;
		}
		/**
		* Apply an update across the ledger. Tasks that do not match the id are left
		* untouched; the matched task receives the patch plus a fresh updatedAt.
		* @param tasks - current ledger.
		* @param id - the task to update.
		* @param patch - editable-field changes.
		* @param now - clock instant (ms epoch).
		*/
		function applyUpdateTask(tasks, id, patch, now) {
			return tasks.map((task) => {
				if (task.id !== id) return task;
				const workspaceId = "workspaceId" in patch ? normalizeTargetId$1(patch.workspaceId) : void 0;
				const mode = "mode" in patch ? normalizeTargetId$1(patch.mode) : void 0;
				const permission = "permission" in patch ? normalizePermission(task.permission, patch.permission) : void 0;
				const next = {
					...task,
					...patch,
					updatedAt: now
				};
				if (workspaceId !== void 0 || "workspaceId" in patch) next.workspaceId = workspaceId;
				if (mode !== void 0 || "mode" in patch) next.mode = mode;
				if (permission !== void 0 || "permission" in patch) next.permission = permission;
				return next;
			});
		}
		//#endregion
		//#region src/core/controller.ts
		/** The selected task (resolved from the ledger), or undefined. */
		function selectedTaskOf(snapshot) {
			if (snapshot.selectedTaskId === void 0) return void 0;
			return snapshot.tasks.find((task) => task.id === snapshot.selectedTaskId);
		}
		function randomUuid() {
			const bytes = globalThis.crypto?.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
			if (bytes === void 0) return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
			bytes[6] = bytes[6] & 15 | 64;
			bytes[8] = bytes[8] & 63 | 128;
			const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
			return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
		}
		/** Read the current selection off a session-list snapshot (structural). */
		function currentOf(sessions) {
			return sessions.list.getSnapshot().current;
		}
		/**
		* Board controller (see module doc). All mutations bump the snapshot and
		* persist through the store; UI and DOM mounts subscribe and re-render.
		*/
		var BoardController = class {
			deps;
			tasks = [];
			boardOpen = false;
			selectedTaskId;
			executionOptions = {
				workspaces: [],
				presets: []
			};
			listeners = /* @__PURE__ */ new Set();
			disposers = [];
			now;
			uuid;
			/** @param deps - store, execution service, and the sessions navigation face. */
			constructor(deps) {
				this.deps = deps;
				this.now = deps.now ?? (() => Date.now());
				this.uuid = deps.uuid ?? randomUuid;
			}
			/** Load the persisted ledger and start the navigation/status subscriptions. */
			start() {
				this.tasks = this.deps.store.load();
				this.reconcileRunningTasks();
				const unsubscribeExternal = this.deps.store.subscribeExternal?.(() => {
					this.tasks = this.deps.store.load();
					this.notify();
				});
				if (unsubscribeExternal !== void 0) this.disposers.push(unsubscribeExternal);
				this.disposers.push(this.deps.sessions.list.subscribe(() => {
					this.onSessionsChanged();
				}));
				this.notify();
			}
			/** Stop all subscriptions and drop retained state (idempotent). */
			dispose() {
				for (const dispose of this.disposers.splice(0)) dispose();
				this.listeners.clear();
				if (this.reconcileTimer !== void 0) clearTimeout(this.reconcileTimer);
				this.reconcileTimer = void 0;
			}
			getSnapshot() {
				return {
					tasks: this.tasks,
					boardOpen: this.boardOpen,
					selectedTaskId: this.selectedTaskId,
					executionOptions: this.executionOptions
				};
			}
			subscribe(fn) {
				this.listeners.add(fn);
				return () => {
					this.listeners.delete(fn);
				};
			}
			openBoard() {
				if (this.boardOpen) return;
				this.lastCurrent = currentOf(this.deps.sessions);
				this.boardOpen = true;
				this.notify();
			}
			closeBoard() {
				if (!this.boardOpen) return;
				this.boardOpen = false;
				this.notify();
			}
			toggleBoard() {
				if (this.boardOpen) this.closeBoard();
				else this.openBoard();
			}
			openTask(id) {
				if (this.tasks.some((task) => task.id === id)) {
					this.selectedTaskId = id;
					this.notify();
				}
			}
			closeTask() {
				if (this.selectedTaskId === void 0) return;
				this.selectedTaskId = void 0;
				this.notify();
			}
			createTask(input) {
				const { task, tasks } = applyCreateTask(this.tasks, input, this.now(), this.uuid());
				if (task === void 0) return void 0;
				this.tasks = [...tasks];
				this.persistAndNotify();
				return task;
			}
			updateTask(id, patch) {
				this.tasks = [...applyUpdateTask(this.tasks, id, patch, this.now())];
				this.persistAndNotify();
			}
			/**
			* Replace (a part of) the picker option sets the UI feeds (workspace list
			* and agent-preset roster come from the runtime, not the ledger).
			*/
			setExecutionOptions(patch) {
				this.executionOptions = {
					...this.executionOptions,
					...patch
				};
				this.notify();
			}
			moveTask(id, status) {
				this.tasks = this.tasks.map((task) => task.id === id ? withStatus(task, status, this.now()) : task);
				this.persistAndNotify();
			}
			deleteTask(id) {
				const { tasks, selectionCleared } = applyDeleteTask(this.tasks, this.selectedTaskId, id);
				this.tasks = [...tasks];
				if (selectionCleared) this.selectedTaskId = void 0;
				this.persistAndNotify();
			}
			/**
			* Update a task's schedule rule. A blank or invalid cron expression is
			* rejected (returns false, state untouched). When the rule ends up enabled
			* the next run instant is computed immediately; a disabled rule carries no
			* next-run instant. Delegates the domain transition to the schedule use case.
			* @param id - the task to schedule.
			* @param patch - fields to change (absent fields keep their current value).
			* @returns true when applied, false when rejected (invalid cron / unknown task).
			*/
			setSchedule(id, patch) {
				const { tasks, applied } = applySetSchedule(this.tasks, id, patch, this.now());
				if (!applied) return false;
				this.tasks = [...tasks];
				this.persistAndNotify();
				return true;
			}
			/**
			* Roll a task's schedule forward (scheduler callback): persist the next due
			* instant and the trigger instant of this run. No-op when the task has no
			* schedule rule (it was deleted mid-tick, for example).
			*/
			applyScheduleNextRun(id, nextRunAt, lastTriggeredAt) {
				const next = applyScheduleNextRun(this.tasks, id, nextRunAt, lastTriggeredAt, this.now());
				this.tasks = [...next];
				this.persistAndNotify();
			}
			/**
			* Jump to an execution's session transcript. Selecting the session changes
			* `current`, which closes the board (the conversation view takes over).
			* @param sessionId - the execution session to open.
			*/
			openSession(sessionId) {
				this.deps.sessions.open(sessionId);
			}
			/**
			* Execute a task for real: move it to 'running', open an execution record,
			* and hand off to the ExecutionService. A second call while the task is
			* already running is ignored.
			*/
			async runTask(id) {
				const task = this.tasks.find((candidate) => candidate.id === id);
				if (task === void 0 || task.status === "running") return false;
				const { task: next, execution } = startExecution(task, this.now(), this.uuid());
				this.tasks = this.tasks.map((candidate) => candidate.id === id ? next : candidate);
				this.persistAndNotify();
				this.activeExecutionIds.add(execution.id);
				await this.deps.exec.run(next, execution, (event) => {
					this.handleExecutionEvent(event);
				});
				return true;
			}
			/** Re-run a settled task: move it back to 'todo' first, then execute. */
			async rerunTask(id) {
				const task = this.tasks.find((candidate) => candidate.id === id);
				if (task === void 0) return;
				if (task.status !== "running") {
					this.tasks = this.tasks.map((candidate) => candidate.id === id ? withStatus(candidate, "todo", this.now()) : candidate);
					this.persistAndNotify();
				}
				await this.runTask(id);
			}
			handleExecutionEvent(event) {
				if (event.kind === "started") {
					this.tasks = this.tasks.map((task) => task.id === event.taskId ? attachSessionId(task, event.executionId, event.sessionId, this.now()) : task);
					this.persistAndNotify();
					return;
				}
				this.activeExecutionIds.delete(event.executionId);
				this.tasks = this.tasks.map((task) => task.id === event.taskId ? settleExecution(task, event.executionId, event.outcome, this.now(), event.error) : task);
				this.persistAndNotify();
			}
			/** Reconcile running tasks and close the board when the user navigates. */
			onSessionsChanged() {
				this.scheduleReconcile();
				if (!this.boardOpen) return;
				const current = currentOf(this.deps.sessions);
				if (current !== this.lastCurrent) this.closeBoard();
				this.lastCurrent = current;
			}
			lastCurrent = void 0;
			/** Execution ids launched on this page; they settle via their live watch, never list reconciliation. */
			activeExecutionIds = /* @__PURE__ */ new Set();
			/** Debounce timer for {@link reconcileRunningTasks}. */
			reconcileTimer = void 0;
			/** Whether a reconcile pass is underway (single-flight guard). */
			reconcileInFlight = false;
			/**
			* Debounce + single-flight trigger for the running-task reconciliation.
			* Session-list notifications arrive in bursts (one per session status
			* change); both guards together keep a burst from reading the history API
			* once per running task.
			*/
			scheduleReconcile() {
				if (this.reconcileTimer !== void 0) return;
				this.reconcileTimer = setTimeout(() => {
					this.reconcileTimer = void 0;
					this.reconcileRunningTasks();
				}, this.deps.reconcileDebounceMs ?? 350);
			}
			/** Settle tasks left 'running' whose sessions already finished. */
			async reconcileRunningTasks() {
				if (this.reconcileInFlight) return;
				this.reconcileInFlight = true;
				try {
					const events = [];
					for (const task of this.tasks) {
						if (task.status !== "running") continue;
						const execution = task.executions[task.executions.length - 1];
						if (execution !== void 0 && this.activeExecutionIds.has(execution.id)) continue;
						const event = await this.deps.exec.reconcile(task);
						if (event !== void 0 && event.kind === "settled") events.push({
							taskId: task.id,
							event
						});
					}
					if (events.length === 0) return;
					let changed = false;
					for (const { taskId, event } of events) {
						const task = this.tasks.find((candidate) => candidate.id === taskId);
						if (task === void 0) continue;
						const next = settleExecution(task, event.executionId, event.outcome, this.now(), event.error);
						if (next === task) continue;
						this.tasks = this.tasks.map((candidate) => candidate.id === taskId ? next : candidate);
						changed = true;
					}
					if (changed) this.persistAndNotify();
				} finally {
					this.reconcileInFlight = false;
				}
			}
			persistAndNotify() {
				this.deps.store.save(this.tasks);
				this.notify();
			}
			notify() {
				for (const fn of [...this.listeners]) fn();
			}
		};
		/** Record which session ran an execution (once the execution service reports it). */
		function attachSessionId(task, executionId, sessionId, now) {
			return {
				...task,
				updatedAt: now,
				executions: task.executions.map((execution) => execution.id === executionId ? {
					...execution,
					sessionId
				} : execution)
			};
		}
		//#endregion
		//#region src/core/execution.ts
		/** Human copy for a run failure. */
		function messageOf(error) {
			if (error instanceof Error) return error.message;
			return String(error);
		}
		/**
		* Whether a rejected preset switch actually means "the session already runs
		* this preset" (the host's agent-preset-conflict with a matching
		* existingPreset). A blank-session reuse race can produce this even though
		* the requested composition is in place.
		*/
		function presetAlreadyRuns(error, mode) {
			if (typeof error !== "object" || error === null) return false;
			const details = error.details;
			if (typeof details !== "object" || details === null) return false;
			return details.existingPreset === mode;
		}
		/** Whether a `turn/end` payload closed the turn with an error reason. */
		function isErrorTurnEnd(data) {
			if (typeof data !== "object" || data === null) return false;
			const reason = data.reason;
			return typeof reason === "object" && reason !== null && reason.kind === "error";
		}
		/**
		* Run one task to completion (or to a settled failure).
		*
		* @param task - the task being executed.
		* @param execution - the freshly opened execution record (id + start time).
		* @param onEvent - callback for started/settled events.
		* @returns resolves when the run settles (or fails to start); never rejects —
		*   every failure path is reported as a settled event.
		*/
		var ExecutionService = class {
			env;
			/** @param env - the runtime faces (real or fake). */
			constructor(env) {
				this.env = env;
			}
			async run(task, execution, onEvent) {
				const settleFailed = (error) => {
					onEvent({
						kind: "settled",
						taskId: task.id,
						executionId: execution.id,
						outcome: "failed",
						error
					});
				};
				try {
					const sessionId = await this.connectSession(task.workspaceId);
					onEvent({
						kind: "started",
						taskId: task.id,
						executionId: execution.id,
						sessionId
					});
					const driver = this.driverOf(sessionId);
					if (driver === void 0) {
						settleFailed("execution session is not ready");
						return;
					}
					if (!await this.applyMode(driver, task, sessionId, settleFailed)) return;
					if (!await this.applyPermission(driver, task, settleFailed)) return;
					await driver.rename(task.title).catch(() => {});
					const baseline = driver.getSnapshot().turnEnds.size;
					const accepted = await this.sendPrompt(driver, task);
					if (!accepted.ok) {
						settleFailed(messageOf(accepted.error));
						return;
					}
					this.watchForSettlement(driver, task.id, execution.id, onEvent, baseline);
				} catch (error) {
					settleFailed(messageOf(error));
				}
			}
			/**
			* Recompose the execution session's agent from the task-pinned preset.
			* No-op when the task pins none or the session already runs it; fails the
			* run when the session is no longer blank, the preset face is missing, or
			* the wire refuses.
			*/
			async applyMode(driver, task, sessionId, settleFailed) {
				const mode = task.mode;
				if (mode === void 0 || mode === "") return true;
				const summary = this.env.sessions.list.getSnapshot().byId[sessionId];
				if (summary?.blank === false) {
					settleFailed(`cannot switch agent preset to ${mode}: the execution session is not blank`);
					return false;
				}
				if (summary?.agentPreset === mode) return true;
				if (this.env.presets === void 0) {
					settleFailed(`this deployment does not support agent presets (task asks for ${mode})`);
					return false;
				}
				try {
					const result = await this.env.presets.select(sessionId, mode);
					if (!result.ok) {
						if (presetAlreadyRuns(result.error, mode)) {
							this.env.sessions.noteAgentPreset?.(sessionId, mode);
							return true;
						}
						settleFailed(`agent preset switch to ${mode} rejected: ${messageOf(result.error)}`);
						return false;
					}
				} catch (error) {
					settleFailed(`agent preset switch to ${mode} failed: ${messageOf(error)}`);
					return false;
				}
				this.env.sessions.noteAgentPreset?.(sessionId, mode);
				return true;
			}
			/**
			* Apply the task-pinned permission preset through the `/permission <id>`
			* slash command. No-op when the task pins none; fails the run when the
			* admission is rejected or no command claimed the line.
			*/
			async applyPermission(driver, task, settleFailed) {
				const permission = task.permission;
				if (permission === void 0) return true;
				const line = `/permission ${permission}`;
				try {
					const result = await driver.command(line);
					if (!result.ok) {
						settleFailed(`permission command rejected: ${messageOf(result.error)}`);
						return false;
					}
					if (!result.matched) {
						settleFailed(`permission command not recognized: ${line}`);
						return false;
					}
				} catch (error) {
					settleFailed(`permission command failed: ${messageOf(error)}`);
					return false;
				}
				return true;
			}
			/**
			* Inspect a reloaded/background task that was left 'running' and emit a
			* settled event when its session already finished.
			*
			* A session that was never opened keeps a cold conversation snapshot (the
			* runtime only maintains the window for the staged/current session), so the
			* settled outcome is decided by the strongest available signal, in order:
			* 1. the list summary — missing session → cancelled; still running → pending;
			* 2. a warm conversation snapshot → `lastAgentError` decides failed/succeeded;
			* 3. the raw history tail (when a history face is wired) — a `turn/end`
			*    error reason proves failure;
			* 4. otherwise a finished session counts as succeeded.
			*
			* @param task - a task whose latest execution has no endedAt.
			* @returns a settled event when the session state proves completion, else undefined.
			*/
			async reconcile(task) {
				const execution = task.executions[task.executions.length - 1];
				if (execution === void 0 || execution.sessionId === void 0 || execution.endedAt !== void 0) return void 0;
				const list = this.env.sessions.list.getSnapshot();
				if (list.phase !== "ready") return void 0;
				const summary = list.byId[execution.sessionId];
				if (summary === void 0) return {
					kind: "settled",
					taskId: task.id,
					executionId: execution.id,
					outcome: "cancelled",
					error: "execution session no longer exists"
				};
				if (summary.running) return void 0;
				const driver = this.driverOf(execution.sessionId);
				if (driver !== void 0) {
					const snapshot = driver.getSnapshot();
					if (snapshot.turnEnds.size > 0) {
						const outcome = snapshot.lastAgentError !== null ? "failed" : "succeeded";
						return {
							kind: "settled",
							taskId: task.id,
							executionId: execution.id,
							outcome,
							error: snapshot.lastAgentError ?? void 0
						};
					}
				}
				if (await this.historyShowsFailure(execution.sessionId)) return {
					kind: "settled",
					taskId: task.id,
					executionId: execution.id,
					outcome: "failed",
					error: "agent turn failed"
				};
				return {
					kind: "settled",
					taskId: task.id,
					executionId: execution.id,
					outcome: "succeeded"
				};
			}
			/** Best-effort failure probe over the raw history tail (false when unavailable). */
			async historyShowsFailure(sessionId) {
				const history = this.env.history;
				if (history === void 0) return false;
				try {
					const tail = await history.loadTail(sessionId);
					if (tail === void 0) return false;
					return tail.events.some((event) => event.type === "turn/end" && isErrorTurnEnd(event.data));
				} catch (error) {
					console.error("[dsh-task-board] history failure probe failed", error);
					return false;
				}
			}
			async connectSession(taskWorkspaceId) {
				const workspace = this.env.workspaces.list.getSnapshot();
				if (taskWorkspaceId !== void 0 && taskWorkspaceId !== "") {
					if (!workspace.items.some((item) => item.workspaceId === taskWorkspaceId)) throw new Error(`task workspace is not available: ${taskWorkspaceId}`);
					return this.env.workspaces.connectWorkspace(taskWorkspaceId);
				}
				const workspaceId = workspace.recentWorkspaceId ?? workspace.items[0]?.workspaceId;
				if (workspaceId === void 0) throw new Error("no workspace available to run the task in");
				return this.env.workspaces.connectWorkspace(workspaceId);
			}
			driverOf(sessionId) {
				return this.env.sessions.binding(sessionId)?.session;
			}
			async sendPrompt(driver, task) {
				const text = task.prompt.trim() !== "" ? task.prompt : task.title;
				try {
					return await driver.prompt([{
						type: "text",
						text
					}], "queue");
				} catch (error) {
					return {
						ok: false,
						error
					};
				}
			}
			/**
			* Subscribe to the execution session and settle the run once the accepted
			* turn completes (turn counter advanced past the acceptance baseline and
			* the session is no longer running). Never settles while the session is
			* still running; unsubscribes on settle.
			*/
			watchForSettlement(driver, taskId, executionId, onEvent, baseline) {
				let settled = false;
				let unsubscribe = () => {};
				const check = () => {
					if (settled) return;
					const snapshot = driver.getSnapshot();
					if (snapshot.running || snapshot.turnEnds.size <= baseline) return;
					settled = true;
					unsubscribe();
					onEvent({
						kind: "settled",
						taskId,
						executionId,
						outcome: snapshot.lastAgentError !== null ? "failed" : "succeeded",
						error: snapshot.lastAgentError ?? void 0
					});
				};
				unsubscribe = driver.subscribe(check);
				check();
			}
		};
		//#endregion
		//#region src/core/scheduler.ts
		/**
		* Browser-side scheduler: the heartbeat behind scheduled task runs.
		*
		* The board is a pure client plugin with no server channel, so "定时任务"
		* lives in the tab: a timer ticks every minute (plus immediately on tab
		* visibility recovery) and triggers any task whose `schedule.nextRunAt` is
		* due, rolling the schedule forward to the next cron match before triggering
		* so the same tick never double-fires. Missed runs are skipped, never queued:
		* a task still running at its due instant is skipped by the controller's
		* runTask guard and simply waits for the next cron match.
		*
		* The ticker is controlled: `start` arms a single interval guarded by an
		* idempotence check (a second start while running is a no-op, so wiring can
		* never leak a duplicate timer), and `stop`/`dispose` clear the timer and
		* drop the environment listeners. The board unmount path calls stop/dispose,
		* so no interval or listener outlives the board.
		*
		* Framework-free: all runtime access flows through the injected deps
		* (structural faces), so tests drive ticks directly without timers.
		*/
		/**
		* The schedule heartbeat (see module doc). `tick` is public so tests and
		* callers can drive a check without waiting for the interval.
		*/
		var SchedulerService = class {
			deps;
			timer;
			environmentListener;
			disposed = false;
			started = false;
			/** @param deps - tasks/clock/trigger/apply faces (see {@link SchedulerDeps}). */
			constructor(deps) {
				this.deps = deps;
			}
			/**
			* Start ticking: one immediate check (catch-up after reload) + the interval.
			* Single-instance: a second start while already armed is a no-op, so a
			* re-entrant mount can never stack a duplicate timer.
			*/
			start() {
				if (this.disposed) return;
				if (this.started) return;
				this.started = true;
				this.tick();
				this.timer = setInterval(() => {
					this.tick();
				}, this.deps.tickMs ?? 6e4);
				if (this.deps.environment !== void 0) {
					this.environmentListener = () => {
						this.tick();
					};
					this.deps.environment.addEventListener("visibilitychange", this.environmentListener);
				}
			}
			/**
			* Stop ticking and drop listeners (idempotent). Preferred shutdown verb for
			* callers that treat the scheduler as a controlled ticker; `dispose` is an
			* alias.
			*/
			stop() {
				this.dispose();
			}
			/** Stop ticking and drop listeners (idempotent). */
			dispose() {
				if (this.disposed && this.timer === void 0 && this.environmentListener === void 0) return;
				this.disposed = true;
				this.started = false;
				if (this.timer !== void 0) {
					clearInterval(this.timer);
					this.timer = void 0;
				}
				if (this.environmentListener !== void 0 && this.deps.environment !== void 0) {
					this.deps.environment.removeEventListener("visibilitychange", this.environmentListener);
					this.environmentListener = void 0;
				}
			}
			/**
			* Check every enabled schedule and trigger the due ones. Idempotent per
			* task per tick: the schedule is rolled forward only after runTask accepts
			* the run, so a rejected run keeps its due slot and is retried on the next
			* tick instead of being silently dropped.
			*/
			async tick() {
				if (this.disposed) return;
				if (this.deps.ready !== void 0 && !this.deps.ready()) return;
				const now = this.deps.now();
				for (const task of this.deps.tasks()) {
					const schedule = task.schedule;
					if (schedule === void 0 || !schedule.enabled) continue;
					if (schedule.nextRunAt === void 0) {
						const repaired = nextRunAtMs(schedule.cron, now);
						if (repaired === void 0) continue;
						this.deps.applySchedule(task.id, repaired, void 0);
						continue;
					}
					if (schedule.nextRunAt > now) continue;
					const next = nextRunAtMs(schedule.cron, schedule.nextRunAt);
					if (await this.deps.runTask(task.id)) this.deps.applySchedule(task.id, next, now);
				}
			}
		};
		//#endregion
		//#region src/core/store.ts
		/**
		* Task persistence: a small storage seam with a localStorage backend.
		*
		* The task-board client plugin runs in the browser, and dsh exposes no
		* browser-writable file channel (same conclusion the skin-center research
		* reached for cordis.patch.yml), so tasks persist in the browser's
		* localStorage under a versioned key — the same persistence mechanism dsh's
		* own client snapshot stores use (`createSnapshotStore` persist). Data
		* survives page refreshes and dsh restarts (same origin), and survives
		* plugin uninstall (the key is simply left in place).
		*
		* The seam keeps the backend swappable (e.g. an IndexedDB or a host-file
		* channel later); tests run against the in-memory backend and a jsdom
		* localStorage backend.
		*/
		/** Storage key for the task ledger document. */
		const DEFAULT_STORAGE_KEY = "dsh.taskBoard.v1";
		/**
		* Structural row check with the status left unvalidated (see {@link parseLedger}).
		* The `schedule` field is deliberately NOT checked here: a malformed schedule
		* never drops the task row — {@link normalizeSchedule} repairs or drops the
		* schedule alone.
		*/
		function isTaskRecordShape(value) {
			if (typeof value !== "object" || value === null) return false;
			const record = value;
			if (typeof record.id !== "string" || record.id === "") return false;
			if (typeof record.title !== "string") return false;
			if (typeof record.description !== "string") return false;
			if (typeof record.prompt !== "string") return false;
			if (typeof record.createdAt !== "number") return false;
			if (typeof record.updatedAt !== "number") return false;
			if (record.workspaceId !== void 0 && typeof record.workspaceId !== "string") return false;
			if (record.mode !== void 0 && typeof record.mode !== "string") return false;
			if (record.permission !== void 0 && typeof record.permission !== "string") return false;
			if (!Array.isArray(record.executions)) return false;
			for (const execution of record.executions) {
				if (typeof execution !== "object" || execution === null) return false;
				const entry = execution;
				if (typeof entry.id !== "string") return false;
				if (entry.sessionId !== void 0 && typeof entry.sessionId !== "string") return false;
				if (typeof entry.startedAt !== "number") return false;
				if (entry.endedAt !== void 0 && typeof entry.endedAt !== "number") return false;
				if (entry.result !== void 0 && entry.result !== "succeeded" && entry.result !== "failed" && entry.result !== "cancelled") return false;
				if (entry.error !== void 0 && typeof entry.error !== "string") return false;
			}
			return true;
		}
		/** Collapse a blank persisted target string to undefined (clears the pin). */
		function normalizeTargetId(value) {
			return value !== void 0 && value.trim() === "" ? void 0 : value;
		}
		/** Normalize an unknown persisted status back into the closed status union. */
		function normalizeStatus(status) {
			return isTaskStatus(status) ? status : "todo";
		}
		/**
		* Repair a persisted schedule rule: drop rules without a usable cron string,
		* coerce booleans/numbers, and leave `nextRunAt`/`lastTriggeredAt` undefined
		* when missing (a fresh recompute or the next tick fixes them).
		*/
		function normalizeSchedule(schedule) {
			if (typeof schedule !== "object" || schedule === null) return void 0;
			const rule = schedule;
			if (typeof rule.cron !== "string") return void 0;
			if (rule.cron.trim() === "" || !isValidCron(rule.cron)) return void 0;
			return {
				enabled: rule.enabled === true,
				cron: rule.cron,
				nextRunAt: typeof rule.nextRunAt === "number" ? rule.nextRunAt : void 0,
				lastTriggeredAt: typeof rule.lastTriggeredAt === "number" ? rule.lastTriggeredAt : void 0
			};
		}
		/** Parse + validate a persisted ledger document; invalid rows are dropped. */
		function parseLedger(raw) {
			if (raw === null) return [];
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch (error) {
				console.error("[dsh-task-board] persisted task ledger is not valid JSON; starting empty", error);
				return [];
			}
			if (!Array.isArray(parsed)) {
				console.error("[dsh-task-board] persisted task ledger is not an array; starting empty");
				return [];
			}
			const tasks = [];
			for (const row of parsed) {
				if (!isTaskRecordShape(row)) {
					console.warn("[dsh-task-board] dropping invalid task row from persisted ledger", row);
					continue;
				}
				const task = {
					...row,
					status: normalizeStatus(row.status)
				};
				task.schedule = normalizeSchedule(row.schedule);
				task.workspaceId = normalizeTargetId(row.workspaceId);
				task.mode = normalizeTargetId(row.mode);
				task.permission = isTaskPermission(row.permission) ? row.permission : void 0;
				tasks.push(task);
			}
			return tasks;
		}
		/** localStorage-backed store (the browser backend). */
		var LocalStorageTaskStore = class {
			key;
			storage;
			events;
			/**
			* @param key - storage key for the ledger document.
			* @param storage - storage backend (defaults to the global localStorage; tests inject fakes).
			* @param events - storage-event target for cross-tab notifications (defaults
			*   to the browser global; undefined in non-browser runtimes, where the
			*   subscription becomes a no-op).
			*/
			constructor(key = DEFAULT_STORAGE_KEY, storage = globalThis.localStorage, events = typeof globalThis.addEventListener === "function" ? globalThis : void 0) {
				this.key = key;
				this.storage = storage;
				this.events = events;
			}
			load() {
				if (this.storage === void 0) return [];
				try {
					return parseLedger(this.storage.getItem(this.key));
				} catch (error) {
					console.error("[dsh-task-board] task ledger read failed; starting empty", error);
					return [];
				}
			}
			save(tasks) {
				if (this.storage === void 0) return;
				try {
					this.storage.setItem(this.key, JSON.stringify(tasks));
				} catch (error) {
					console.error("[dsh-task-board] task ledger write failed (persistence skipped)", error);
				}
			}
			clear() {
				if (this.storage === void 0) return;
				try {
					this.storage.removeItem(this.key);
				} catch (error) {
					console.error("[dsh-task-board] task ledger clear failed", error);
				}
			}
			/**
			* Cross-tab change subscription (see {@link TaskStore.subscribeExternal}).
			* The browser fires the storage event in every OTHER tab of the same origin
			* when one tab writes; a null key means the whole storage was cleared. Both
			* cases reload the ledger here; unrelated keys are ignored.
			*/
			subscribeExternal(listener) {
				if (this.events === void 0) return () => {};
				const onStorage = (event) => {
					if (event.key !== null && event.key !== this.key) return;
					listener();
				};
				this.events.addEventListener("storage", onStorage);
				return () => {
					this.events?.removeEventListener("storage", onStorage);
				};
			}
		};
		//#endregion
		//#region src/client/apply-guard.ts
		/** Claims the plugin apply slot. Returns true when this call won the slot. */
		function claimTaskboardApply() {
			if (globalThis.__dshTaskboardApplied === true) return false;
			globalThis.__dshTaskboardApplied = true;
			return true;
		}
		/**
		* Releases the claim. Called from the client fiber cleanup so that a
		* hot-reloaded bundle (the loader unloads the old plugin fiber and invokes
		* the rebuilt one in the same page) can claim again instead of being
		* silently dropped.
		*/
		function releaseTaskboardApply() {
			globalThis.__dshTaskboardApplied = void 0;
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Task-board copy: zh-first dictionaries with an English fallback, selected
		* by the document language. Kept dependency-free (no dsh locale service) so
		* the DOM-injected entry row and the standalone board tree share one tiny
		* lookup.
		*/
		/** zh dictionary (key-set source of truth). */
		const zh = {
			"entry.label": "任务看板",
			"board.title": "任务看板",
			"board.close": "返回对话",
			"board.new": "新建任务",
			"board.search": "筛选任务…",
			"board.empty": "这个状态还没有任务",
			"board.filterAll": "全部",
			"board.status": "状态",
			"board.status.backlog": "待规划",
			"board.status.todo": "待办",
			"board.status.running": "进行中",
			"board.status.done": "已完成",
			"board.status.failed": "已失败",
			"board.runs": "次执行",
			"board.updated": "更新于",
			"board.created": "创建于",
			"new.title": "标题",
			"new.titlePlaceholder": "一句话描述要做什么",
			"new.description": "描述",
			"new.descriptionPlaceholder": "补充背景、范围与验收（可选）",
			"new.prompt": "执行 Prompt",
			"new.promptPlaceholder": "发给 agent 的完整指令（留空则使用标题）",
			"new.submit": "创建",
			"new.cancel": "取消",
			"new.required": "标题不能为空",
			"detail.title": "任务详情",
			"detail.close": "关闭",
			"detail.prompt": "执行 Prompt",
			"detail.description": "描述",
			"detail.execution": "执行记录",
			"detail.noExecution": "尚未执行",
			"detail.run": "执行",
			"detail.rerun": "重新执行",
			"detail.delete": "删除",
			"detail.viewSession": "查看会话",
			"detail.noSession": "暂无会话",
			"detail.executionStarted": "已启动",
			"detail.executionEnded": "已结束",
			"detail.result.succeeded": "成功",
			"detail.result.failed": "失败",
			"detail.result.cancelled": "已取消",
			"detail.result.running": "进行中",
			"delete.title": "删除任务",
			"delete.confirm": "确定删除「{name}」吗？删除后不可恢复。",
			"delete.ok": "删除",
			"delete.cancel": "取消",
			"status.move.backlog": "移到待规划",
			"status.move.todo": "移到待办",
			"exec.error.noWorkspace": "没有可用工作区，无法执行任务",
			"exec.error.promptRejected": "Prompt 被拒绝",
			"run.failed": "执行失败：{error}",
			"time.justNow": "刚刚",
			"detail.schedule": "定时运行",
			"detail.schedule.enable": "启用定时执行",
			"detail.schedule.cron": "Cron 表达式",
			"detail.schedule.presets": "预设",
			"detail.schedule.preset.daily9": "每天 09:00",
			"detail.schedule.preset.hourly": "每小时",
			"detail.schedule.preset.tenMin": "每 10 分钟",
			"detail.schedule.preset.weeklyMon9": "每周一 09:00",
			"detail.schedule.nextRun": "下次运行",
			"detail.schedule.lastTriggered": "上次触发",
			"detail.schedule.invalid": "Cron 表达式无效",
			"detail.schedule.notScheduled": "尚未排程",
			"detail.schedule.dueSoon": "即将运行",
			"card.scheduled": "定时",
			"new.workspace": "工作区",
			"new.mode": "模式",
			"new.permission": "权限",
			"exec.workspace.recent": "最近使用（默认）",
			"exec.mode.default": "部署默认",
			"exec.mode.defaultSuffix": "（默认）",
			"exec.mode.brokenSuffix": "（不可用）",
			"exec.mode.removed": "（已移除）",
			"exec.permission.default": "会话默认",
			"exec.permission.read-only": "只读",
			"exec.permission.workspace-write": "工作区可写",
			"exec.permission.danger-full-access": "完全访问",
			"detail.executionSettings": "执行设置",
			"exec.hint": "执行时生效：工作区决定执行会话落在哪个工作区；模式决定会话的 agent 预设；权限经 /permission 命令应用到会话。留空则使用运行时默认。",
			"settings.title": "任务看板",
			"settings.description": "控制看板在 agent 系统提示中的播报行为。",
			"settings.enabled": "启用任务看板",
			"settings.enabledHint": "关闭后隐藏侧边栏入口与看板视图。",
			"settings.announceToAgent": "向 agent 播报任务看板",
			"settings.announceToAgentHint": "开启：每条 agent 系统提示都会包含本看板的说明；关闭：不播报，agent 仅在用户主动提及时了解看板。",
			"settings.inherit": "继承",
			"settings.on": "开",
			"settings.off": "关",
			"settings.overridden": "已覆盖",
			"settings.reset": "恢复默认",
			"settings.notExposed": "当前 DSH 版本未向设置页暴露本插件的配置命名空间，表单不可用。可编辑 ~/.dsh/settings.yaml 直接配置，或为 dsh-host-apiproxy 的 WEB_SETTINGS_NAMESPACES 白名单补充本命名空间后重启。",
			"settings.readOnly": "当前部署的设置只读。",
			"settings.expand": "展开设置",
			"settings.collapse": "收起设置",
			"settings.save": "保存",
			"settings.saving": "保存中…",
			"settings.discard": "放弃",
			"settings.unsaved": "未保存",
			"settings.saveFailed": "部署未接受这些值，已保留供你修改。",
			"settings.invalidNumber": "请输入数字，留空则使用默认值。"
		};
		/** en dictionary, complete against the zh key set. */
		const en = {
			"entry.label": "Task Board",
			"board.title": "Task Board",
			"board.close": "Back to chat",
			"board.new": "New Task",
			"board.search": "Filter tasks…",
			"board.empty": "No tasks in this column",
			"board.filterAll": "All",
			"board.status": "Status",
			"board.status.backlog": "Backlog",
			"board.status.todo": "To Do",
			"board.status.running": "In Progress",
			"board.status.done": "Done",
			"board.status.failed": "Failed",
			"board.runs": "runs",
			"board.updated": "Updated",
			"board.created": "Created",
			"new.title": "Title",
			"new.titlePlaceholder": "What should be done, in one line",
			"new.description": "Description",
			"new.descriptionPlaceholder": "Background, scope, acceptance criteria (optional)",
			"new.prompt": "Run Prompt",
			"new.promptPlaceholder": "The full instruction sent to the agent (title is used when blank)",
			"new.submit": "Create",
			"new.cancel": "Cancel",
			"new.required": "Title is required",
			"detail.title": "Task Detail",
			"detail.close": "Close",
			"detail.prompt": "Run Prompt",
			"detail.description": "Description",
			"detail.execution": "Execution History",
			"detail.noExecution": "Not executed yet",
			"detail.run": "Run",
			"detail.rerun": "Run Again",
			"detail.delete": "Delete",
			"detail.viewSession": "View Session",
			"detail.noSession": "No session",
			"detail.executionStarted": "Started",
			"detail.executionEnded": "Ended",
			"detail.result.succeeded": "Succeeded",
			"detail.result.failed": "Failed",
			"detail.result.cancelled": "Cancelled",
			"detail.result.running": "Running",
			"delete.title": "Delete Task",
			"delete.confirm": "Delete \"{name}\"? This cannot be undone.",
			"delete.ok": "Delete",
			"delete.cancel": "Cancel",
			"status.move.backlog": "Move to Backlog",
			"status.move.todo": "Move to To Do",
			"exec.error.noWorkspace": "No workspace is available to run the task",
			"exec.error.promptRejected": "Prompt rejected",
			"run.failed": "Run failed: {error}",
			"time.justNow": "just now",
			"detail.schedule": "Scheduled Runs",
			"detail.schedule.enable": "Enable scheduled runs",
			"detail.schedule.cron": "Cron expression",
			"detail.schedule.presets": "Presets",
			"detail.schedule.preset.daily9": "Every day 09:00",
			"detail.schedule.preset.hourly": "Every hour",
			"detail.schedule.preset.tenMin": "Every 10 minutes",
			"detail.schedule.preset.weeklyMon9": "Every Monday 09:00",
			"detail.schedule.nextRun": "Next run",
			"detail.schedule.lastTriggered": "Last triggered",
			"detail.schedule.invalid": "Invalid cron expression",
			"detail.schedule.notScheduled": "Not scheduled yet",
			"detail.schedule.dueSoon": "Due soon",
			"card.scheduled": "scheduled",
			"new.workspace": "Workspace",
			"new.mode": "Mode",
			"new.permission": "Permission",
			"exec.workspace.recent": "Most recent (default)",
			"exec.mode.default": "Deployment default",
			"exec.mode.defaultSuffix": " (default)",
			"exec.mode.brokenSuffix": " (unavailable)",
			"exec.mode.removed": " (removed)",
			"exec.permission.default": "Session default",
			"exec.permission.read-only": "Read-only",
			"exec.permission.workspace-write": "Workspace Write",
			"exec.permission.danger-full-access": "Full Access",
			"detail.executionSettings": "Execution Settings",
			"exec.hint": "Applied when the task runs: the workspace decides where the execution session lands; the mode composes the session's agent preset; the permission is applied through the /permission command. Blank = runtime default.",
			"settings.title": "Task Board",
			"settings.description": "How the board announces itself in each agent system prompt.",
			"settings.enabled": "Enable the task board",
			"settings.enabledHint": "When off, the sidebar entry and board view are hidden.",
			"settings.announceToAgent": "Announce the task board to agents",
			"settings.announceToAgentHint": "On: every agent system prompt includes a note about this board. Off: no announcement; agents learn about the board only when you mention it.",
			"settings.inherit": "Inherit",
			"settings.on": "On",
			"settings.off": "Off",
			"settings.overridden": "Overridden",
			"settings.reset": "Reset to default",
			"settings.notExposed": "This DSH version does not expose this plugin's settings namespace to the configuration page, so the form is unavailable. Edit ~/.dsh/settings.yaml directly, or add the namespace to dsh-host-apiproxy's WEB_SETTINGS_NAMESPACES allowlist and restart.",
			"settings.readOnly": "This deployment stores settings read-only.",
			"settings.expand": "Show settings",
			"settings.collapse": "Hide settings",
			"settings.save": "Save",
			"settings.saving": "Saving…",
			"settings.discard": "Discard",
			"settings.unsaved": "Unsaved",
			"settings.saveFailed": "The deployment did not accept these values; they were left for you to correct.",
			"settings.invalidNumber": "Enter a number, or leave blank to use the default."
		};
		/** Active dictionary, picked by the document language at call time. */
		function dictionary() {
			return (typeof document !== "undefined" ? document.documentElement.lang : "zh").toLowerCase().startsWith("en") ? en : zh;
		}
		/** Translate a key with optional {name} template params. */
		function t(key, params) {
			let text = dictionary()[key];
			if (params !== void 0) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, value);
			return text;
		}
		//#endregion
		//#region \0dsh-css:packages/dsh-task-board/src/client/board.module.css.mjs
		const css$1 = "[data-pane=conversation],[class*=centerCol]{position:relative}[data-dsh-taskboard-view]{z-index:60;background:var(--dsw-alias-bg-base);display:none;position:absolute;inset:0}html[data-dsh-taskboard-active]:not([data-dsh-ssh-active]) [data-dsh-taskboard-view]{display:block}html[data-dsh-taskboard-active]:not([data-dsh-ssh-active]) [data-pane=conversation]>:not([data-dsh-taskboard-view]),html[data-dsh-taskboard-active]:not([data-dsh-ssh-active]) [class*=centerCol]>:not([data-dsh-taskboard-view]){display:none!important}._7D6uKa_entry{width:100%;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:0 12px;font-size:13px;display:flex}._7D6uKa_entry:hover{background:var(--dsw-specific-sidebar-nav-item-hover);color:var(--dsw-alias-label-primary)}._7D6uKa_entry[data-active]{background:var(--dsw-specific-sidebar-nav-item-active);color:var(--dsw-alias-label-primary);font-weight:600}._7D6uKa_entryIcon{flex:none;justify-content:center;align-items:center;display:inline-flex}._7D6uKa_entryLabel{text-overflow:ellipsis;overflow:hidden}[data-dsh-frame][data-sidebar-collapsed] ._7D6uKa_entry{justify-content:center;width:100%;padding:0}[data-dsh-frame][data-sidebar-collapsed] ._7D6uKa_entryLabel{display:none}._7D6uKa_board{background:var(--dsw-alias-bg-base);min-width:0;height:100%;min-height:0;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);flex-direction:column;gap:12px;padding:14px 16px 16px;display:flex}._7D6uKa_boardHeader{flex:none;align-items:center;gap:10px;display:flex}._7D6uKa_boardTitle{color:var(--dsw-alias-label-primary);white-space:nowrap;margin:0;font-size:16px;font-weight:700}._7D6uKa_search{min-width:120px;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;outline:none;flex:0 260px;padding:6px 10px;font-size:13px}._7D6uKa_search::placeholder{color:var(--dsw-alias-label-tertiary)}._7D6uKa_columns{flex:1;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;min-height:0;display:grid}._7D6uKa_column{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;flex-direction:column;min-height:0;display:flex;overflow:hidden}._7D6uKa_columnHeader{flex:none;align-items:center;gap:6px;padding:10px 12px;display:flex}._7D6uKa_columnTitle{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;margin:0;font-size:13px;font-weight:700;overflow:hidden}._7D6uKa_columnCount{min-width:0;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;flex:none;padding:1px 8px;font-size:12px}._7D6uKa_statusDot{border-radius:50%;flex:none;width:8px;height:8px}._7D6uKa_statusDot[data-status=backlog]{background:var(--dsw-alias-label-tertiary)}._7D6uKa_statusDot[data-status=todo]{background:var(--dsw-alias-state-business-primary)}._7D6uKa_statusDot[data-status=running]{background:var(--dsw-alias-state-warn-primary)}._7D6uKa_statusDot[data-status=done]{background:var(--dsw-alias-state-success-primary)}._7D6uKa_statusDot[data-status=failed]{background:var(--dsw-alias-state-error-primary)}._7D6uKa_cards{flex-direction:column;flex:1;gap:8px;min-height:0;padding:2px 8px 10px;display:flex;overflow-y:auto}._7D6uKa_columnEmpty{text-align:center;color:var(--dsw-alias-label-tertiary);padding:24px 8px;font-size:12px}._7D6uKa_card{text-align:left;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);cursor:pointer;color:var(--dsw-alias-label-primary);border-radius:10px;flex-direction:column;gap:6px;padding:10px 12px;font-family:inherit;transition:box-shadow .12s,border-color .12s,transform .12s;display:flex}._7D6uKa_card:hover{box-shadow:var(--dsw-shadow-lv2);border-color:var(--dsw-alias-border-l3);transform:translateY(-1px)}._7D6uKa_card[data-status=running]{border-color:var(--dsw-alias-state-warn-primary)}._7D6uKa_cardTitle{-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:13px;font-weight:600;line-height:1.35;display:-webkit-box;overflow:hidden}._7D6uKa_cardExcerpt{color:var(--dsw-alias-label-secondary);-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:12px;line-height:1.4;display:-webkit-box;overflow:hidden}._7D6uKa_cardMeta{color:var(--dsw-alias-label-tertiary);align-items:center;gap:8px;font-size:11px;display:flex}._7D6uKa_cardTime{text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}._7D6uKa_cardSchedule{white-space:nowrap;min-width:0;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;flex:none;padding:2px 6px;font-size:12px;line-height:1}._7D6uKa_cardRun{flex:none}._7D6uKa_cardRun[data-result=failed]{color:var(--dsw-alias-state-error-primary)}._7D6uKa_cardRun[data-result=succeeded]{color:var(--dsw-alias-state-success-primary)}._7D6uKa_cardSession{color:var(--dsw-alias-state-business-primary);flex:none}._7D6uKa_cardRunningLabel{color:var(--dsw-alias-state-warn-primary);font-size:11px}._7D6uKa_cardSpinner{border:2px solid var(--dsw-alias-state-warn-primary);border-top-color:#0000;border-radius:50%;flex:none;width:10px;height:10px;animation:.8s linear infinite _7D6uKa_dshTbSpin}@keyframes _7D6uKa_dshTbSpin{to{transform:rotate(360deg)}}._7D6uKa_primaryButton{color:var(--dsw-alias-label-primary-foreground);background:var(--dsw-alias-button-info-fill);cursor:pointer;white-space:nowrap;border:none;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600}._7D6uKa_primaryButton:hover:not(:disabled){background:var(--dsw-alias-button-info-hover)}._7D6uKa_primaryButton:disabled{opacity:.5;cursor:default}._7D6uKa_ghostButton{color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);cursor:pointer;white-space:nowrap;background:0 0;border-radius:8px;padding:5px 12px;font-size:12px}._7D6uKa_ghostButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}._7D6uKa_ghostButton:disabled{opacity:.45;cursor:default}._7D6uKa_dangerButton{color:#fff;background:var(--dsw-alias-state-error-primary);cursor:pointer;white-space:nowrap;border:none;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600}._7D6uKa_dangerButton:hover:not(:disabled){filter:brightness(1.08)}._7D6uKa_dangerButton:active:not(:disabled){filter:brightness(.94)}._7D6uKa_dangerButton:disabled{opacity:.5;cursor:default}._7D6uKa_iconButton{width:26px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:6px;justify-content:center;align-items:center;padding:0;font-size:13px;display:inline-flex}._7D6uKa_iconButton:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._7D6uKa_linkButton{color:var(--dsw-alias-state-business-primary);cursor:pointer;white-space:nowrap;background:0 0;border:none;padding:0;font-size:12px}._7D6uKa_linkButton:hover{text-decoration:underline}._7D6uKa_modalBackdrop{z-index:1300;background:var(--dsw-alias-bg-mask-1);justify-content:center;align-items:center;display:flex;position:fixed;inset:0}._7D6uKa_modal{background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);width:min(520px,100vw - 48px);max-height:calc(100vh - 96px);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:14px;flex-direction:column;gap:12px;padding:18px;display:flex;overflow-y:auto}._7D6uKa_modalTitle{margin:0;font-size:15px;font-weight:700}._7D6uKa_confirmMessage{color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font-size:13px;line-height:1.5}._7D6uKa_modalFooter{justify-content:flex-end;gap:10px;margin-top:4px;display:flex}._7D6uKa_field{flex-direction:column;gap:5px;display:flex}._7D6uKa_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600}._7D6uKa_input{color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);resize:vertical;border-radius:8px;outline:none;padding:7px 10px;font-family:inherit;font-size:13px}._7D6uKa_input:focus{border-color:var(--dsw-alias-state-business-primary)}._7D6uKa_select{color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;outline:none;max-width:100%;padding:7px 10px;font-family:inherit;font-size:13px}._7D6uKa_input::placeholder{color:var(--dsw-alias-label-tertiary)}._7D6uKa_formError{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px}._7D6uKa_detail{background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);width:min(640px,100vw - 48px);max-height:calc(100vh - 80px);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:14px;flex-direction:column;display:flex;overflow:hidden}._7D6uKa_detailHeader{border-bottom:1px solid var(--dsw-alias-separator-primary);flex:none;align-items:center;gap:10px;padding:14px 18px;display:flex}._7D6uKa_detailTitle{overflow-wrap:anywhere;flex:1;margin:0;font-size:15px;font-weight:700}._7D6uKa_statusBadge{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:2px 10px;font-size:12px}._7D6uKa_statusBadge[data-status=running]{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}._7D6uKa_statusBadge[data-status=done]{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}._7D6uKa_statusBadge[data-status=failed]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}._7D6uKa_detailBody{flex-direction:column;flex:1;gap:16px;padding:14px 18px;display:flex;overflow-y:auto}._7D6uKa_detailSection{flex-direction:column;gap:6px;display:flex}._7D6uKa_detailSection h4{color:var(--dsw-alias-label-tertiary);text-transform:none;margin:0;font-size:12px;font-weight:700}._7D6uKa_detailText{color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font-size:13px;line-height:1.55}._7D6uKa_scheduleToggle{color:var(--dsw-alias-label-primary);cursor:pointer;user-select:none;align-items:center;gap:8px;font-size:13px;display:flex}._7D6uKa_scheduleToggle input{accent-color:var(--dsw-alias-state-business-primary)}._7D6uKa_scheduleRow{align-items:center;gap:8px;display:flex}._7D6uKa_scheduleInput{min-width:0;font-family:var(--dsw-font-markdown-code-block-small);flex:1;font-size:12.5px}._7D6uKa_scheduleInputInvalid,._7D6uKa_scheduleInputInvalid:focus{border-color:var(--dsw-alias-state-error-primary)}._7D6uKa_schedulePreset{color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;outline:none;flex:none;padding:7px 8px;font-size:12.5px}._7D6uKa_scheduleMeta{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:12px}._7D6uKa_promptBlock{font-size:12.5px;line-height:1.5;font-family:var(--dsw-font-markdown-code-block-small);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-markdown-code-block);border:1px solid var(--dsw-alias-border-l1);white-space:pre-wrap;overflow-wrap:anywhere;border-radius:8px;max-height:240px;margin:0;padding:10px 12px;overflow-y:auto}._7D6uKa_executionList{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}._7D6uKa_executionRow{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;flex-wrap:wrap;align-items:center;gap:10px;padding:8px 10px;display:flex}._7D6uKa_executionBadge{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-secondary);border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:600}._7D6uKa_executionBadge[data-result=succeeded]{color:var(--dsw-alias-state-success-primary);background:0 0}._7D6uKa_executionBadge[data-result=failed]{color:var(--dsw-alias-state-error-primary);background:0 0}._7D6uKa_executionBadge[data-result=cancelled]{color:var(--dsw-alias-label-tertiary);background:0 0}._7D6uKa_executionTimes{color:var(--dsw-alias-label-secondary);font-size:12px}._7D6uKa_executionError{width:100%;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;font-size:12px}._7D6uKa_moveRow{flex-wrap:wrap;gap:8px;display:flex}._7D6uKa_detailFooter{border-top:1px solid var(--dsw-alias-separator-primary);flex:none;align-items:center;gap:10px;padding:12px 18px;display:flex}._7D6uKa_detailMeta{color:var(--dsw-alias-label-tertiary);margin-left:auto;font-size:11px}._7D6uKa_entry:focus-visible,._7D6uKa_card:focus-visible,._7D6uKa_primaryButton:focus-visible,._7D6uKa_ghostButton:focus-visible,._7D6uKa_dangerButton:focus-visible,._7D6uKa_iconButton:focus-visible,._7D6uKa_linkButton:focus-visible,._7D6uKa_search:focus-visible,._7D6uKa_input:focus-visible,._7D6uKa_select:focus-visible,._7D6uKa_schedulePreset:focus-visible,._7D6uKa_scheduleToggle input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._7D6uKa_entry,._7D6uKa_primaryButton,._7D6uKa_ghostButton,._7D6uKa_dangerButton,._7D6uKa_iconButton,._7D6uKa_linkButton,._7D6uKa_search,._7D6uKa_input,._7D6uKa_select,._7D6uKa_schedulePreset,._7D6uKa_scheduleToggle input{transition:background-color .12s,color .12s,border-color .12s,outline-color .12s,box-shadow .12s,transform .12s}._7D6uKa_card:active{box-shadow:var(--dsw-shadow-lv1);transform:translateY(0)}._7D6uKa_entry:active,._7D6uKa_primaryButton:active:not(:disabled),._7D6uKa_ghostButton:active:not(:disabled),._7D6uKa_dangerButton:active:not(:disabled),._7D6uKa_iconButton:active:not(:disabled),._7D6uKa_linkButton:active:not(:disabled){transform:translateY(1px)}._7D6uKa_entry[data-active]:hover{background:var(--dsw-specific-sidebar-nav-item-active)}._7D6uKa_iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._7D6uKa_linkButton:hover:not(:disabled){text-decoration:underline}._7D6uKa_iconButton:disabled,._7D6uKa_linkButton:disabled{opacity:.45;cursor:default}._7D6uKa_search:focus,._7D6uKa_select:focus,._7D6uKa_schedulePreset:focus{border-color:var(--dsw-alias-state-business-primary)}._7D6uKa_scheduleToggle input{margin:0}@media (prefers-reduced-motion:reduce){._7D6uKa_entry,._7D6uKa_card,._7D6uKa_primaryButton,._7D6uKa_ghostButton,._7D6uKa_dangerButton,._7D6uKa_iconButton,._7D6uKa_linkButton,._7D6uKa_search,._7D6uKa_input,._7D6uKa_select,._7D6uKa_schedulePreset,._7D6uKa_scheduleToggle input{transition:none}._7D6uKa_cardSpinner{animation:none}}";
		const tagId$1 = "@linxin666/dsh-client-ui-task-board/board.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-client-ui-task-board";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var board_module_css_default = {
			"board": "_7D6uKa_board",
			"boardHeader": "_7D6uKa_boardHeader",
			"boardTitle": "_7D6uKa_boardTitle",
			"card": "_7D6uKa_card",
			"cardExcerpt": "_7D6uKa_cardExcerpt",
			"cardMeta": "_7D6uKa_cardMeta",
			"cardRun": "_7D6uKa_cardRun",
			"cardRunningLabel": "_7D6uKa_cardRunningLabel",
			"cardSchedule": "_7D6uKa_cardSchedule",
			"cardSession": "_7D6uKa_cardSession",
			"cardSpinner": "_7D6uKa_cardSpinner",
			"cardTime": "_7D6uKa_cardTime",
			"cardTitle": "_7D6uKa_cardTitle",
			"cards": "_7D6uKa_cards",
			"column": "_7D6uKa_column",
			"columnCount": "_7D6uKa_columnCount",
			"columnEmpty": "_7D6uKa_columnEmpty",
			"columnHeader": "_7D6uKa_columnHeader",
			"columnTitle": "_7D6uKa_columnTitle",
			"columns": "_7D6uKa_columns",
			"confirmMessage": "_7D6uKa_confirmMessage",
			"dangerButton": "_7D6uKa_dangerButton",
			"detail": "_7D6uKa_detail",
			"detailBody": "_7D6uKa_detailBody",
			"detailFooter": "_7D6uKa_detailFooter",
			"detailHeader": "_7D6uKa_detailHeader",
			"detailMeta": "_7D6uKa_detailMeta",
			"detailSection": "_7D6uKa_detailSection",
			"detailText": "_7D6uKa_detailText",
			"detailTitle": "_7D6uKa_detailTitle",
			"dshTbSpin": "_7D6uKa_dshTbSpin",
			"entry": "_7D6uKa_entry",
			"entryIcon": "_7D6uKa_entryIcon",
			"entryLabel": "_7D6uKa_entryLabel",
			"executionBadge": "_7D6uKa_executionBadge",
			"executionError": "_7D6uKa_executionError",
			"executionList": "_7D6uKa_executionList",
			"executionRow": "_7D6uKa_executionRow",
			"executionTimes": "_7D6uKa_executionTimes",
			"field": "_7D6uKa_field",
			"fieldLabel": "_7D6uKa_fieldLabel",
			"formError": "_7D6uKa_formError",
			"ghostButton": "_7D6uKa_ghostButton",
			"iconButton": "_7D6uKa_iconButton",
			"input": "_7D6uKa_input",
			"linkButton": "_7D6uKa_linkButton",
			"modal": "_7D6uKa_modal",
			"modalBackdrop": "_7D6uKa_modalBackdrop",
			"modalFooter": "_7D6uKa_modalFooter",
			"modalTitle": "_7D6uKa_modalTitle",
			"moveRow": "_7D6uKa_moveRow",
			"primaryButton": "_7D6uKa_primaryButton",
			"promptBlock": "_7D6uKa_promptBlock",
			"scheduleInput": "_7D6uKa_scheduleInput",
			"scheduleInputInvalid": "_7D6uKa_scheduleInputInvalid",
			"scheduleMeta": "_7D6uKa_scheduleMeta",
			"schedulePreset": "_7D6uKa_schedulePreset",
			"scheduleRow": "_7D6uKa_scheduleRow",
			"scheduleToggle": "_7D6uKa_scheduleToggle",
			"search": "_7D6uKa_search",
			"select": "_7D6uKa_select",
			"statusBadge": "_7D6uKa_statusBadge",
			"statusDot": "_7D6uKa_statusDot"
		};
		//#endregion
		//#region src/client/board/NewTaskModal.tsx
		/**
		* New-task modal: title + description + the prompt that execution will send.
		* Creates through the controller (which persists immediately).
		*/
		/** New-task form overlay. */
		function NewTaskModal({ controller, onClose }) {
			const [title, setTitle] = (0, react.useState)("");
			const [description, setDescription] = (0, react.useState)("");
			const [prompt, setPrompt] = (0, react.useState)("");
			const [workspaceId, setWorkspaceId] = (0, react.useState)("");
			const [mode, setMode] = (0, react.useState)("");
			const [permission, setPermission] = (0, react.useState)("");
			const [error, setError] = (0, react.useState)(void 0);
			const [options, setOptions] = (0, react.useState)(controller.getSnapshot().executionOptions);
			(0, react.useEffect)(() => controller.subscribe(() => setOptions(controller.getSnapshot().executionOptions)), [controller]);
			const submit = () => {
				if (controller.createTask({
					title,
					description,
					prompt,
					workspaceId: workspaceId === "" ? void 0 : workspaceId,
					mode: mode === "" ? void 0 : mode,
					permission: permission === "" ? void 0 : permission
				}) === void 0) {
					setError(t("new.required"));
					return;
				}
				onClose();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: board_module_css_default.modalBackdrop,
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
					className: board_module_css_default.modal,
					role: "dialog",
					"aria-label": t("board.new"),
					onSubmit: (event) => {
						event.preventDefault();
						submit();
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: board_module_css_default.modalTitle,
							children: t("board.new")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: board_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: board_module_css_default.fieldLabel,
								children: t("new.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: board_module_css_default.input,
								value: title,
								autoFocus: true,
								placeholder: t("new.titlePlaceholder"),
								onChange: (event) => {
									setTitle(event.target.value);
									setError(void 0);
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: board_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: board_module_css_default.fieldLabel,
								children: t("new.description")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: board_module_css_default.input,
								rows: 3,
								value: description,
								placeholder: t("new.descriptionPlaceholder"),
								onChange: (event) => {
									setDescription(event.target.value);
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: board_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: board_module_css_default.fieldLabel,
								children: t("new.prompt")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: board_module_css_default.input,
								rows: 4,
								value: prompt,
								placeholder: t("new.promptPlaceholder"),
								onChange: (event) => {
									setPrompt(event.target.value);
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: board_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: board_module_css_default.fieldLabel,
								children: t("new.workspace")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: board_module_css_default.select,
								value: workspaceId,
								onChange: (event) => {
									setWorkspaceId(event.target.value);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("exec.workspace.recent")
								}), options.workspaces.map((workspace) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: workspace.workspaceId,
									children: workspace.title
								}, workspace.workspaceId))]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: board_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: board_module_css_default.fieldLabel,
								children: t("new.mode")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: board_module_css_default.select,
								value: mode,
								onChange: (event) => {
									setMode(event.target.value);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("exec.mode.default")
								}), options.presets.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: preset.id,
									disabled: preset.broken !== void 0,
									children: [
										preset.name ?? preset.id,
										preset.isDefault ? t("exec.mode.defaultSuffix") : "",
										preset.broken !== void 0 ? t("exec.mode.brokenSuffix") : ""
									]
								}, preset.id))]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: board_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: board_module_css_default.fieldLabel,
								children: t("new.permission")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: board_module_css_default.select,
								value: permission,
								onChange: (event) => {
									setPermission(event.target.value);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("exec.permission.default")
								}), TASK_PERMISSIONS.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: id,
									children: t(`exec.permission.${id}`)
								}, id))]
							})]
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: board_module_css_default.formError,
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							className: board_module_css_default.modalFooter,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: board_module_css_default.ghostButton,
								onClick: onClose,
								children: t("new.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "submit",
								className: board_module_css_default.primaryButton,
								children: t("new.submit")
							})]
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/board/TaskCard.tsx
		/**
		* Task card: the board's column item. Clicking opens the task detail — it
		* never executes anything directly (detail holds the Run button).
		*
		* Memoized: the card re-renders only when its own task record changes, so a
		* status/filter update on one card (or scrolling) never re-renders every
		* card on the board. The per-card onClick is built with a stable task reference
		* by the board, so the memo boundary is effective.
		*/
		/** Compact relative/absolute time label. */
		function formatTime(ms) {
			const date = new Date(ms);
			const minutes = Math.floor((Date.now() - ms) / 6e4);
			if (minutes < 1) return t("time.justNow");
			if (minutes < 60) return `${minutes}m`;
			if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		}
		/** One card in a column. */
		function TaskCardInner({ task, onClick }) {
			const latest = task.executions[task.executions.length - 1];
			const runs = task.executions.length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: board_module_css_default.card,
				"data-status": task.status,
				onClick,
				title: task.description !== "" ? task.description : task.title,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_css_default.cardTitle,
						children: task.title
					}),
					task.description !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_css_default.cardExcerpt,
						children: task.description
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: board_module_css_default.cardMeta,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: board_module_css_default.cardTime,
								children: [
									t("board.updated"),
									" ",
									formatTime(task.updatedAt)
								]
							}),
							task.schedule?.enabled === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: board_module_css_default.cardSchedule,
								title: task.schedule.nextRunAt !== void 0 ? `${t("card.scheduled")} · ${new Date(task.schedule.nextRunAt).toLocaleString()}` : t("card.scheduled"),
								children: t("card.scheduled")
							}),
							latest !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: board_module_css_default.cardRun,
								"data-result": latest.result,
								children: [
									runs,
									" ",
									t("board.runs")
								]
							}),
							latest?.sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: board_module_css_default.cardSession,
								title: latest.sessionId,
								children: "⌁"
							}),
							task.status === "running" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: board_module_css_default.cardSpinner,
								"aria-hidden": "true"
							})
						]
					}),
					latest !== void 0 && executionLabel(latest) === "running" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: board_module_css_default.cardRunningLabel,
						children: [t("detail.result.running"), "…"]
					})
				]
			});
		}
		/** Memoized card: re-renders only when the card's own task record changes. */
		const TaskCard = (0, react.memo)(TaskCardInner);
		//#endregion
		//#region src/client/board/ConfirmDialog.tsx
		/**
		* Generic confirm dialog used by destructive actions (task delete).
		*/
		/** Small confirm overlay. */
		function ConfirmDialog({ title, message, confirmLabel, danger, onCancel, onConfirm }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: board_module_css_default.modalBackdrop,
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onCancel();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: board_module_css_default.modal,
					role: "alertdialog",
					"aria-label": title,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: board_module_css_default.modalTitle,
							children: title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: board_module_css_default.confirmMessage,
							children: message
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							className: board_module_css_default.modalFooter,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: board_module_css_default.ghostButton,
								onClick: onCancel,
								children: t("delete.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: danger ? board_module_css_default.dangerButton : board_module_css_default.primaryButton,
								onClick: onConfirm,
								children: confirmLabel
							})]
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/board/TaskDetail.tsx
		/**
		* Task detail: the full view of one task — content, prompt, execution
		* history — and the only place execution can be triggered. Also offers
		* delete (with confirmation), manual status moves, and a jump to the
		* execution's session transcript.
		*/
		/** Execution outcome → locale key. */
		const RESULT_KEY = {
			succeeded: "detail.result.succeeded",
			failed: "detail.result.failed",
			cancelled: "detail.result.cancelled"
		};
		/** Status → locale key (detail badge). */
		const STATUS_KEY$1 = {
			backlog: "board.status.backlog",
			todo: "board.status.todo",
			running: "board.status.running",
			done: "board.status.done",
			failed: "board.status.failed"
		};
		/** One execution-history row. */
		function ExecutionRow({ execution, onOpen }) {
			const result = execution.result;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: board_module_css_default.executionRow,
				"data-result": result,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_css_default.executionBadge,
						"data-result": result,
						children: result === void 0 ? t("detail.result.running") : t(RESULT_KEY[result])
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: board_module_css_default.executionTimes,
						children: [
							t("detail.executionStarted"),
							" ",
							formatTime(execution.startedAt),
							execution.endedAt !== void 0 && ` · ${t("detail.executionEnded")} ${formatTime(execution.endedAt)}`
						]
					}),
					execution.sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: board_module_css_default.linkButton,
						onClick: () => {
							onOpen(execution.sessionId);
						},
						title: execution.sessionId,
						children: [t("detail.viewSession"), " ⌁"]
					}),
					execution.error !== void 0 && execution.error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: board_module_css_default.executionError,
						children: execution.error
					})
				]
			});
		}
		/** Common scheduled-run presets (cron → locale label). */
		const SCHEDULE_PRESETS = [
			{
				cron: "0 9 * * *",
				label: "detail.schedule.preset.daily9"
			},
			{
				cron: "0 * * * *",
				label: "detail.schedule.preset.hourly"
			},
			{
				cron: "*/10 * * * *",
				label: "detail.schedule.preset.tenMin"
			},
			{
				cron: "0 9 * * 1",
				label: "detail.schedule.preset.weeklyMon9"
			}
		];
		/** The execution-target editor: workspace / mode / permission pickers. */
		function ExecutionSettingsSection({ controller, task }) {
			const [options, setOptions] = (0, react.useState)(controller.getSnapshot().executionOptions);
			(0, react.useEffect)(() => controller.subscribe(() => setOptions(controller.getSnapshot().executionOptions)), [controller]);
			const workspaceId = task.workspaceId ?? "";
			const mode = task.mode ?? "";
			const permission = task.permission ?? "";
			const workspaceKnown = workspaceId === "" || options.workspaces.some((item) => item.workspaceId === workspaceId);
			const modeKnown = mode === "" || options.presets.some((item) => item.id === mode);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: board_module_css_default.detailSection,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.executionSettings") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: board_module_css_default.detailText,
						children: t("exec.hint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: board_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: board_module_css_default.fieldLabel,
							children: t("new.workspace")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: board_module_css_default.select,
							value: workspaceId,
							onChange: (event) => {
								controller.updateTask(task.id, { workspaceId: event.target.value });
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("exec.workspace.recent")
								}),
								!workspaceKnown && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: workspaceId,
									children: [workspaceId, t("exec.mode.removed")]
								}),
								options.workspaces.map((workspace) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: workspace.workspaceId,
									children: workspace.title
								}, workspace.workspaceId))
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: board_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: board_module_css_default.fieldLabel,
							children: t("new.mode")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: board_module_css_default.select,
							value: mode,
							onChange: (event) => {
								controller.updateTask(task.id, { mode: event.target.value });
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("exec.mode.default")
								}),
								!modeKnown && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: mode,
									children: [mode, t("exec.mode.removed")]
								}),
								options.presets.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: preset.id,
									disabled: preset.broken !== void 0,
									children: [
										preset.name ?? preset.id,
										preset.isDefault ? t("exec.mode.defaultSuffix") : "",
										preset.broken !== void 0 ? t("exec.mode.brokenSuffix") : ""
									]
								}, preset.id))
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: board_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: board_module_css_default.fieldLabel,
							children: t("new.permission")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: board_module_css_default.select,
							value: permission,
							onChange: (event) => {
								controller.updateTask(task.id, { permission: event.target.value === "" ? void 0 : event.target.value });
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: t("exec.permission.default")
							}), TASK_PERMISSIONS.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: id,
								children: t(`exec.permission.${id}`)
							}, id))]
						})]
					})
				]
			});
		}
		/** The scheduled-runs editor: enable toggle, cron input + presets, next-run info. */
		function ScheduleSection({ controller, task }) {
			const schedule = task.schedule;
			const [cron, setCron] = (0, react.useState)(schedule?.cron ?? "0 9 * * *");
			const [enabled, setEnabled] = (0, react.useState)(schedule?.enabled ?? false);
			const [nextRunAt, setNextRunAt] = (0, react.useState)(schedule?.nextRunAt);
			const [lastTriggeredAt, setLastTriggeredAt] = (0, react.useState)(schedule?.lastTriggeredAt);
			const [error, setError] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				setCron(schedule?.cron ?? "0 9 * * *");
				setEnabled(schedule?.enabled ?? false);
				setNextRunAt(schedule?.nextRunAt);
				setLastTriggeredAt(schedule?.lastTriggeredAt);
				setError(void 0);
			}, [
				task.id,
				schedule?.enabled,
				schedule?.cron,
				schedule?.nextRunAt,
				schedule?.lastTriggeredAt
			]);
			/** Validate + persist the current cron text (Enter or blur). */
			const saveCron = (value) => {
				const trimmed = value.trim();
				setCron(trimmed);
				if (trimmed === "" || !isValidCron(trimmed)) {
					setError(t("detail.schedule.invalid"));
					return;
				}
				setError(void 0);
				controller.setSchedule(task.id, { cron: trimmed });
			};
			/** Arm/disarm the schedule (arming first persists the edited cron). */
			const toggleEnabled = (next) => {
				const trimmed = cron.trim();
				if (next && (trimmed === "" || !isValidCron(trimmed))) {
					setError(t("detail.schedule.invalid"));
					return;
				}
				setError(void 0);
				if (next && trimmed !== schedule?.cron) controller.setSchedule(task.id, { cron: trimmed });
				if (controller.setSchedule(task.id, { enabled: next })) setEnabled(next);
			};
			const applyPreset = (preset) => {
				if (preset === "") return;
				setCron(preset);
				setError(void 0);
				controller.setSchedule(task.id, { cron: preset });
			};
			const nextLabel = !enabled || nextRunAt === void 0 ? t("detail.schedule.notScheduled") : nextRunAt <= Date.now() ? t("detail.schedule.dueSoon") : new Date(nextRunAt).toLocaleString();
			const lastLabel = lastTriggeredAt === void 0 ? "—" : new Date(lastTriggeredAt).toLocaleString();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: board_module_css_default.detailSection,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.schedule") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: board_module_css_default.scheduleToggle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: enabled,
							onChange: (event) => {
								toggleEnabled(event.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("detail.schedule.enable") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: board_module_css_default.scheduleRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: `${board_module_css_default.input} ${board_module_css_default.scheduleInput}${error !== void 0 ? ` ${board_module_css_default.scheduleInputInvalid}` : ""}`,
							value: cron,
							placeholder: "0 9 * * *",
							spellCheck: false,
							"aria-label": t("detail.schedule.cron"),
							onChange: (event) => {
								setCron(event.target.value);
								setError(void 0);
							},
							onBlur: () => {
								saveCron(cron);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter") saveCron(cron);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: board_module_css_default.schedulePreset,
							value: "",
							"aria-label": t("detail.schedule.presets"),
							onChange: (event) => {
								applyPreset(event.target.value);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
								value: "",
								children: [t("detail.schedule.presets"), "…"]
							}), SCHEDULE_PRESETS.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: preset.cron,
								children: t(preset.label)
							}, preset.cron))]
						})]
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: board_module_css_default.formError,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: board_module_css_default.scheduleMeta,
						children: [
							t("detail.schedule.nextRun"),
							" ",
							nextLabel,
							" · ",
							t("detail.schedule.lastTriggered"),
							" ",
							lastLabel
						]
					})
				]
			});
		}
		/** Task detail overlay. */
		function TaskDetail({ controller, task }) {
			const [confirmDelete, setConfirmDelete] = (0, react.useState)(false);
			const running = task.status === "running";
			const [latest, setLatest] = (0, react.useState)(task);
			(0, react.useEffect)(() => {
				setLatest(task);
			}, [task]);
			const current = latest;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: board_module_css_default.modalBackdrop,
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) controller.closeTask();
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: board_module_css_default.detail,
					role: "dialog",
					"aria-label": t("detail.title"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: board_module_css_default.detailHeader,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: board_module_css_default.detailTitle,
									children: current.title
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: board_module_css_default.statusBadge,
									"data-status": current.status,
									children: t(STATUS_KEY$1[current.status])
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: board_module_css_default.iconButton,
									"aria-label": t("detail.close"),
									onClick: () => {
										controller.closeTask();
									},
									children: "×"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: board_module_css_default.detailBody,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: board_module_css_default.detailSection,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.description") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: board_module_css_default.detailText,
										children: current.description !== "" ? current.description : "—"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: board_module_css_default.detailSection,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.prompt") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
										className: board_module_css_default.promptBlock,
										children: current.prompt !== "" ? current.prompt : current.title
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExecutionSettingsSection, {
									controller,
									task: current
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScheduleSection, {
									controller,
									task: current
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: board_module_css_default.detailSection,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("detail.execution") }), current.executions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: board_module_css_default.detailText,
										children: t("detail.noExecution")
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: board_module_css_default.executionList,
										children: [...current.executions].reverse().map((execution) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExecutionRow, {
											execution,
											onOpen: (sessionId) => {
												controller.openSession(sessionId);
											}
										}, execution.id))
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: board_module_css_default.detailSection,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: t("board.status") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: board_module_css_default.moveRow,
										children: MANUAL_STATUSES.map((status) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: board_module_css_default.ghostButton,
											disabled: current.status === status || running,
											onClick: () => {
												controller.moveTask(current.id, status);
											},
											children: t(`status.move.${status}`)
										}, status))
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							className: board_module_css_default.detailFooter,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: board_module_css_default.primaryButton,
									disabled: running,
									onClick: () => {
										controller.closeTask();
										controller.rerunTask(current.id);
									},
									children: current.executions.length === 0 ? t("detail.run") : t("detail.rerun")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: board_module_css_default.dangerButton,
									onClick: () => {
										setConfirmDelete(true);
									},
									children: t("detail.delete")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: board_module_css_default.detailMeta,
									children: [
										t("board.created"),
										" ",
										formatTime(current.createdAt)
									]
								})
							]
						})
					]
				}), confirmDelete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfirmDialog, {
					title: t("delete.title"),
					message: t("delete.confirm", { name: current.title }),
					confirmLabel: t("delete.ok"),
					danger: true,
					onCancel: () => {
						setConfirmDelete(false);
					},
					onConfirm: () => {
						setConfirmDelete(false);
						controller.deleteTask(current.id);
						controller.closeTask();
					}
				})]
			});
		}
		//#endregion
		//#region src/client/board/TaskBoard.tsx
		/**
		* Board view: the multi-column kanban that replaces the middle column while
		* active. Cards open the task detail (never execute directly); the header
		* offers filter, new-task, and a back-to-chat escape.
		*/
		/** Column status → locale key. */
		const STATUS_KEY = {
			backlog: "board.status.backlog",
			todo: "board.status.todo",
			running: "board.status.running",
			done: "board.status.done",
			failed: "board.status.failed"
		};
		/** Case-insensitive title/description match. */
		function matchesFilter(task, filter) {
			if (filter.trim() === "") return true;
			const needle = filter.trim().toLowerCase();
			return task.title.toLowerCase().includes(needle) || task.description.toLowerCase().includes(needle);
		}
		/**
		* Memoized per-card adapter: with a stable `onOpen` from the board and an
		* immutable task record (only the changed card gets a new object ref), a card
		* re-renders only when its own task changes — not when a sibling card status,
		* the filter, or the selection moves.
		*/
		const MemoTaskCard = (0, react.memo)(function MemoTaskCard({ task, onOpen }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskCard, {
				task,
				onClick: (0, react.useCallback)(() => {
					onOpen(task.id);
				}, [task.id, onOpen])
			});
		});
		/** Board component; subscribes to the controller snapshot. */
		function TaskBoard({ controller }) {
			const [snapshot, setSnapshot] = (0, react.useState)(controller.getSnapshot());
			(0, react.useEffect)(() => controller.subscribe(() => setSnapshot(controller.getSnapshot())), [controller]);
			const [filter, setFilter] = (0, react.useState)("");
			const [showNew, setShowNew] = (0, react.useState)(false);
			const selected = selectedTaskOf(snapshot);
			const visible = snapshot.tasks.filter((task) => matchesFilter(task, filter));
			const openTask = (0, react.useCallback)((id) => {
				controller.openTask(id);
			}, [controller]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: board_module_css_default.board,
				"data-dsh-taskboard-board": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: board_module_css_default.boardHeader,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: board_module_css_default.boardTitle,
								children: t("board.title")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: board_module_css_default.search,
								type: "search",
								placeholder: t("board.search"),
								value: filter,
								onChange: (event) => {
									setFilter(event.target.value);
								},
								"aria-label": t("board.search")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: board_module_css_default.primaryButton,
								onClick: () => {
									setShowNew(true);
								},
								children: ["+ ", t("board.new")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: board_module_css_default.ghostButton,
								onClick: () => {
									controller.closeBoard();
								},
								children: t("board.close")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: board_module_css_default.columns,
						children: COLUMNS.map((column) => {
							const tasks = visible.filter((task) => task.status === column.status);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: board_module_css_default.column,
								"data-status": column.status,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
									className: board_module_css_default.columnHeader,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: board_module_css_default.statusDot,
											"data-status": column.status,
											"aria-hidden": "true"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
											className: board_module_css_default.columnTitle,
											children: t(STATUS_KEY[column.status])
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: board_module_css_default.columnCount,
											children: tasks.length
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: board_module_css_default.cards,
									children: [tasks.map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MemoTaskCard, {
										task,
										onOpen: openTask
									}, task.id)), tasks.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: board_module_css_default.columnEmpty,
										children: t("board.empty")
									})]
								})]
							}, column.status);
						})
					}),
					selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskDetail, {
						controller,
						task: selected
					}),
					showNew && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewTaskModal, {
						controller,
						onClose: () => {
							setShowNew(false);
						}
					})
				]
			});
		}
		//#endregion
		//#region src/client/board-mount.tsx
		/**
		* Board view mounting.
		*
		* The `conversation` slot is single-occupant (ui-conversation) and external
		* plugins cannot declare slots, so the board takes over the center column at
		* the DOM level: a container is appended inside the center column
		* (`[class*="centerCol"]`, the dsh 0.1.0-rc.6 AppFrame layout; previously
		* `[data-pane="conversation"]` on older shells — the mount selector keeps both)
		* as an extra trailing child
		* React never manages, and a stylesheet
		* rule hides the conversation content while the board is active. Toggling is
		* a data attribute on <html> — no React involvement, so the conversation
		* subtree underneath stays mounted and stateful.
		*/
		const CONVERSATION_COLUMN_SELECTOR = "[data-pane=\"conversation\"], [class*=\"centerCol\"]";
		const ACTIVE_ATTR = "data-dsh-taskboard-active";
		/** The sibling panel's activation attribute (ssh), removed when this panel opens. */
		const OTHER_ACTIVE_ATTR = "data-dsh-ssh-active";
		/** Cross-plugin activation event; detail is the activating panel name. */
		const ACTIVATE_EVENT = "dsh-panel-activate";
		const PANEL_NAME = "taskboard";
		/** Find the center column, or undefined while the frame is not mounted. */
		function conversationColumn() {
			return document.querySelector(CONVERSATION_COLUMN_SELECTOR) ?? void 0;
		}
		/**
		* Mount the board React tree into the center column and bind its visibility
		* to the controller's boardOpen state.
		* @param controller - the board controller driving the view.
		* @returns disposer unmounting the tree and restoring the column.
		*/
		function mountBoard(controller) {
			let root;
			let container;
			const ensure = () => {
				if (container !== void 0) return;
				const column = conversationColumn();
				if (column === void 0) return;
				container = document.createElement("div");
				container.dataset.dshTaskboardView = "";
				container.className = board_module_css_default.boardView;
				column.appendChild(container);
				root = (0, react_dom_client.createRoot)(container);
				root.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskBoard, { controller }));
			};
			const waitObserver = new MutationObserver(() => {
				ensure();
			});
			waitObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			const applyActive = () => {
				if (controller.getSnapshot().boardOpen) {
					document.documentElement.removeAttribute(OTHER_ACTIVE_ATTR);
					document.documentElement.setAttribute(ACTIVE_ATTR, "");
					document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: PANEL_NAME }));
				} else document.documentElement.removeAttribute(ACTIVE_ATTR);
			};
			const onOtherActivate = (event) => {
				if (event.detail === "ssh" && controller.getSnapshot().boardOpen) controller.closeBoard();
			};
			const SIDEBAR_ROW_SELECTOR = "[class*=\"sessionRow\"], [class*=\"projectRow\"], [class*=\"searchResultRow\"], [class*=\"searchResultWorkspace\"], [class*=\"newSession\"]";
			const onClickSidebarRow = (event) => {
				if (!controller.getSnapshot().boardOpen) return;
				const target = event.target;
				if (target === null) return;
				if (target.closest(SIDEBAR_ROW_SELECTOR) !== null) controller.closeBoard();
			};
			document.addEventListener("click", onClickSidebarRow, true);
			document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
			const unsubscribe = controller.subscribe(applyActive);
			applyActive();
			ensure();
			return () => {
				document.removeEventListener("click", onClickSidebarRow, true);
				document.removeEventListener(ACTIVATE_EVENT, onOtherActivate);
				waitObserver.disconnect();
				unsubscribe();
				document.documentElement.removeAttribute(ACTIVE_ATTR);
				root?.unmount();
				root = void 0;
				container?.remove();
				container = void 0;
			};
		}
		//#endregion
		//#region src/client/sidebar-entry.ts
		/** Inline icon (matches the shell's 16px nav-icon look). */
		const ICON = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M6.5 6.5v7"/></svg>`;
		/** Find the sidebar shell root element, or undefined while not yet mounted. */
		function sidebarRoot() {
			const column = document.querySelector("[data-pane=\"sidebar\"], [class*=\"sidebarCol\"]");
			if (column === null) return void 0;
			return column.querySelector("[class*=\"logoRow\"]")?.parentElement ?? column.firstElementChild;
		}
		/** The New Session button: nested in the logo row on current shells, a direct child on legacy shells. */
		function newSessionButton(root) {
			const nested = root.querySelector("button[class*=\"newSession\"]");
			if (nested !== null) return nested;
			for (const child of root.children) if (child.tagName === "BUTTON") return child;
		}
		/** Build the entry row (a detached button; insert once the shell is up). */
		function createEntry(controller) {
			const entry = document.createElement("button");
			entry.type = "button";
			entry.dataset.dshTaskboardEntry = "";
			entry.className = board_module_css_default.entry;
			entry.setAttribute("aria-label", t("entry.label"));
			entry.innerHTML = `<span class="${board_module_css_default.entryIcon}">${ICON}</span><span class="${board_module_css_default.entryLabel}">${t("entry.label")}</span>`;
			entry.addEventListener("click", () => {
				controller.toggleBoard();
			});
			return entry;
		}
		/** Re-insert the entry after the New Session row (before the browser region). */
		function placeEntry(root, entry) {
			const button = newSessionButton(root);
			if (button === void 0) return false;
			if (entry.parentElement !== root) {
				const row = button.closest("[class*=\"logoRow\"]");
				const base = row !== null && row.parentElement === root ? row : button;
				const family = Array.from(root.children).filter((el) => el instanceof HTMLElement && el.matches("[data-dsh-taskboard-entry], [data-dsh-ssh-entry]"));
				const anchor = family.length > 0 ? family[0] : base.nextElementSibling;
				root.insertBefore(entry, anchor);
			}
			return true;
		}
		/**
		* Mount the sidebar entry, waiting for the shell to render and self-healing
		* on later React re-renders.
		* @param controller - the board controller the entry toggles.
		* @returns disposer removing the entry and its observers.
		*/
		function mountSidebarEntry(controller) {
			if (typeof document !== "undefined" && document.querySelector("[data-dsh-taskboard-entry]") !== null) return () => {};
			const entry = createEntry(controller);
			let root;
			let placed = false;
			const tryPlace = () => {
				if (root !== void 0 && !root.isConnected) {
					rootObserver.disconnect();
					root = void 0;
					placed = false;
				}
				if (placed) {
					if (document.body.contains(entry)) return;
					rootObserver.disconnect();
					root = void 0;
					placed = false;
				}
				root ??= sidebarRoot();
				if (root === void 0) return;
				placed = placeEntry(root, entry);
				if (placed) rootObserver.observe(root, {
					childList: true,
					subtree: true
				});
			};
			const waitObserver = new MutationObserver(() => {
				tryPlace();
			});
			waitObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			const rootObserver = new MutationObserver(() => {
				if (root === void 0 || !root.isConnected) {
					placed = false;
					tryPlace();
					return;
				}
				if (!root.contains(entry)) placed = placeEntry(root, entry);
			});
			const syncActive = () => {
				if (controller.getSnapshot().boardOpen) entry.dataset.active = "true";
				else delete entry.dataset.active;
			};
			const unsubscribe = controller.subscribe(syncActive);
			syncActive();
			tryPlace();
			return () => {
				waitObserver.disconnect();
				rootObserver.disconnect();
				unsubscribe();
				entry.remove();
			};
		}
		//#endregion
		//#region \0dsh-css:packages/dsh-task-board/src/client/settings-card.module.css.mjs
		const css = ".Jh0q7G_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}.Jh0q7G_card:hover{border-color:var(--dsw-alias-label-dimmed)}.Jh0q7G_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.Jh0q7G_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.Jh0q7G_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.Jh0q7G_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.Jh0q7G_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.Jh0q7G_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.Jh0q7G_pending{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.Jh0q7G_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.Jh0q7G_chevronOpen{transform:rotate(180deg)}.Jh0q7G_body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.Jh0q7G_readOnly{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}.Jh0q7G_notExposed{color:var(--dsw-alias-state-warn-primary);margin:12px 0 0;font-size:12px;line-height:1.5}.Jh0q7G_footer{border-top:1px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;display:flex}.Jh0q7G_failed{min-width:0;color:var(--dsw-alias-label-error);text-overflow:ellipsis;white-space:nowrap;flex:1;margin:0;font-size:12px;line-height:1.5;overflow:hidden}.Jh0q7G_discard,.Jh0q7G_save{appearance:none;font:inherit;cursor:pointer;border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.Jh0q7G_discard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}.Jh0q7G_discard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.Jh0q7G_save{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.Jh0q7G_discard:disabled,.Jh0q7G_save:disabled{opacity:.4;cursor:default}.Jh0q7G_discard:focus-visible,.Jh0q7G_save:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.Jh0q7G_field{flex-direction:column;gap:6px;padding:12px 0;display:flex}.Jh0q7G_field+.Jh0q7G_field{border-top:1px solid var(--dsw-alias-border-l2)}.Jh0q7G_head{align-items:center;gap:8px;display:flex}.Jh0q7G_label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}.Jh0q7G_badges{align-items:center;gap:8px;display:inline-flex}.Jh0q7G_badge{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.Jh0q7G_reset{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px;line-height:1.5}.Jh0q7G_reset:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.Jh0q7G_reset:disabled{cursor:default}.Jh0q7G_reset:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.Jh0q7G_input,.Jh0q7G_select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.Jh0q7G_input:focus-visible,.Jh0q7G_select:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.Jh0q7G_input:disabled,.Jh0q7G_select:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.Jh0q7G_inputInvalid{border:1px solid var(--dsw-alias-label-error);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.Jh0q7G_inputInvalid:focus-visible{outline:2px solid var(--dsw-alias-label-error);outline-offset:1px;border-color:var(--dsw-alias-label-error)}.Jh0q7G_invalid{color:var(--dsw-alias-label-error);margin:0;font-size:12px;line-height:1.5}.Jh0q7G_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}@media (prefers-reduced-motion:reduce){.Jh0q7G_card,.Jh0q7G_header,.Jh0q7G_chevron,.Jh0q7G_chevronOpen,.Jh0q7G_discard,.Jh0q7G_save{transition:none}}";
		const tagId = "@linxin666/dsh-client-ui-task-board/settings-card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-client-ui-task-board";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var settings_card_module_css_default = {
			"badge": "Jh0q7G_badge",
			"badges": "Jh0q7G_badges",
			"body": "Jh0q7G_body",
			"card": "Jh0q7G_card",
			"cardOpen": "Jh0q7G_cardOpen",
			"chevron": "Jh0q7G_chevron",
			"chevronOpen": "Jh0q7G_chevronOpen",
			"description": "Jh0q7G_description",
			"discard": "Jh0q7G_discard",
			"failed": "Jh0q7G_failed",
			"field": "Jh0q7G_field",
			"footer": "Jh0q7G_footer",
			"head": "Jh0q7G_head",
			"headText": "Jh0q7G_headText",
			"header": "Jh0q7G_header",
			"hint": "Jh0q7G_hint",
			"input": "Jh0q7G_input",
			"inputInvalid": "Jh0q7G_inputInvalid",
			"invalid": "Jh0q7G_invalid",
			"label": "Jh0q7G_label",
			"name": "Jh0q7G_name",
			"notExposed": "Jh0q7G_notExposed",
			"pending": "Jh0q7G_pending",
			"readOnly": "Jh0q7G_readOnly",
			"reset": "Jh0q7G_reset",
			"save": "Jh0q7G_save",
			"select": "Jh0q7G_select"
		};
		//#endregion
		//#region src/client/PluginSettingsCard.tsx
		/**
		* Family-shared chrome for plugin settings cards: a disclosure header naming
		* the plugin and what its settings govern, the controls inside, and the save
		* that writes them. Renders nothing while the namespace is unavailable — a
		* deployment that does not compose the owning plugin should show no trace of
		* it. Inlined into each consumer's client bundle; mirrors the official
		* ui-plugin-config PluginCard in a self-contained slice.
		*/
		/**
		* Render one plugin settings card.
		* @param props - the plugin's copy keys, its form state, and its controls.
		* @returns the card, or nothing while the namespace is still loading.
		*/
		function PluginSettingsCard(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const { state } = props;
			if (!state.available) return null;
			const title = props.t(props.titleKey);
			const description = props.t(props.descriptionKey);
			const blocked = !state.dirty || state.invalid || state.saving;
			const cardClass = open ? `${settings_card_module_css_default.cardOpen} ${settings_card_module_css_default.card}` : settings_card_module_css_default.card;
			if (!state.exposed) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: cardClass,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: settings_card_module_css_default.header,
					"aria-expanded": open,
					"aria-label": `${props.t(open ? "settings.collapse" : "settings.expand")}: ${title}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: settings_card_module_css_default.headText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_card_module_css_default.name,
							title,
							children: title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_card_module_css_default.description,
							title: description,
							children: description
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						width: "14",
						height: "14",
						viewBox: "0 0 14 14",
						fill: "none",
						xmlns: "http://www.w3.org/2000/svg",
						className: open ? `${settings_card_module_css_default.chevron} ${settings_card_module_css_default.chevronOpen}` : settings_card_module_css_default.chevron,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
							fill: "currentColor"
						})
					})]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: settings_card_module_css_default.body,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_card_module_css_default.notExposed,
						role: "status",
						children: props.t("settings.notExposed")
					})
				}) : null]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: cardClass,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: settings_card_module_css_default.header,
					"aria-expanded": open,
					"aria-label": `${props.t(open ? "settings.collapse" : "settings.expand")}: ${title}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: settings_card_module_css_default.headText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.name,
								title,
								children: title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.description,
								title: description,
								children: description
							})]
						}),
						state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_card_module_css_default.pending,
							title: props.t("settings.unsaved"),
							children: props.t("settings.unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
							width: "14",
							height: "14",
							viewBox: "0 0 14 14",
							fill: "none",
							xmlns: "http://www.w3.org/2000/svg",
							className: open ? `${settings_card_module_css_default.chevron} ${settings_card_module_css_default.chevronOpen}` : settings_card_module_css_default.chevron,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
								d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
								fill: "currentColor"
							})
						})
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_card_module_css_default.body,
					children: [
						!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: settings_card_module_css_default.readOnly,
							role: "status",
							children: props.t("settings.readOnly")
						}) : null,
						props.children,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_card_module_css_default.footer,
							children: [
								state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: settings_card_module_css_default.failed,
									role: "status",
									children: [props.t("settings.saveFailed"), state.failedReason ? " - " + state.failedReason : ""]
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.discard,
									disabled: !state.dirty || state.saving,
									onClick: props.onDiscard,
									children: props.t("settings.discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: settings_card_module_css_default.save,
									disabled: blocked,
									onClick: props.onSave,
									children: props.t(!state.saving ? "settings.save" : "settings.saving")
								})
							]
						})
					]
				}) : null]
			});
		}
		/** A staged boolean field: 继承 / 开 / 关. */
		function BooleanField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_card_module_css_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_card_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: settings_card_module_css_default.label,
							htmlFor: props.id,
							children: props.label
						}), props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: settings_card_module_css_default.badges,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_card_module_css_default.badge,
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: settings_card_module_css_default.reset,
								disabled: props.disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						id: props.id,
						className: settings_card_module_css_default.select,
						value: props.text,
						disabled: props.disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: props.inheritLabel
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "true",
								children: props.onLabel
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "false",
								children: props.offLabel
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_card_module_css_default.hint,
						children: props.hint
					})
				]
			});
		}
		//#endregion
		//#region src/client/settings-form.ts
		/** A boolean field, edited through true/false draft text. */
		function booleanField(field) {
			return {
				field,
				format: (value) => typeof value === "boolean" ? String(value) : "",
				parse: (text) => {
					const trimmed = text.trim();
					if (trimmed === "") return { kind: "clear" };
					if (trimmed === "true") return {
						kind: "set",
						value: true
					};
					if (trimmed === "false") return {
						kind: "set",
						value: false
					};
				}
			};
		}
		/**
		* Stages one card's edits over one settings namespace and writes them on save.
		*
		* The Host is the only authority on whether a value was accepted — its
		* validators own the constraints no schema can express — so the outcome is
		* read back from the section rather than predicted here. A save that did not
		* land keeps its drafts, so the user can correct them instead of retyping.
		*/
		var CardForm = class {
			scope;
			specs;
			staged = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			saving = false;
			failed = false;
			failedReason;
			/** @param scope - the bound settings scope for this card's namespace. */
			constructor(scope, specs) {
				this.scope = scope;
				this.specs = new Map(specs.map((spec) => [spec.field, spec]));
				scope.subscribe(() => {
					this.publish();
				});
			}
			/** Publish a projection of this form, rebuilt whenever the scope or a draft changes. */
			bind(project) {
				const store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(project());
				this.listeners.add(() => {
					store.set(project());
				});
				return store;
			}
			/** Read the card-level state: what the Host serves, and what a save would do. */
			shell() {
				const snapshot = this.scope.getSnapshot();
				const plan = this.plan();
				return {
					available: snapshot.status !== "loading",
					exposed: snapshot.status === "ready",
					writable: snapshot.writable,
					dirty: plan.length > 0,
					invalid: plan.some((item) => item.run === void 0),
					saving: this.saving,
					failed: this.failed,
					...this.failedReason === void 0 ? {} : { failedReason: this.failedReason }
				};
			}
			/** Read one field's state from the effective section and its staged draft. */
			field(field) {
				const spec = this.specOf(field);
				const staged = this.staged.get(field);
				if (staged === void 0) return {
					text: spec.format(this.sectionValue(field)),
					overridden: this.stored(field),
					invalid: false
				};
				const write = staged.clear ? { kind: "clear" } : spec.parse(staged.text);
				return {
					text: staged.text,
					overridden: write?.kind === "set",
					invalid: write === void 0
				};
			}
			/** The actions the card's slot registration injects. */
			actions() {
				return {
					edit: (field, text) => {
						this.stage(field, {
							text,
							clear: false
						});
					},
					resetField: (field) => {
						this.stage(field, {
							text: this.specOf(field).format(this.baseValue(field)),
							clear: true
						});
					},
					save: () => {
						this.save();
					},
					discard: () => {
						if (this.staged.size === 0 && !this.failed) return;
						this.staged.clear();
						this.failed = false;
						this.failedReason = void 0;
						this.publish();
					}
				};
			}
			/**
			* Write every staged edit, then re-seed from what the Host accepted.
			*
			* When the scope carries the optional batch surface (the dsh-web-ui
			* bridge scope), every planned write rides one mutation so cross-field
			* validate hooks (baseURL+model) judge the batch as a unit instead of
			* deadlocking on per-field writes. Otherwise the per-field loop runs.
			* A field lands only when the Host reports it held the staged value; a
			* landed field's draft is dropped, a failed one stays staged for the user.
			* @returns settlement after every write and the read-back.
			*/
			async save() {
				const plan = this.plan();
				const valid = plan.filter((item) => item.run !== void 0);
				if (plan.length === 0 || this.saving || valid.length !== plan.length) return;
				const plannedWrites = valid.map((item) => item.op);
				const fields = new Set(plan.map((item) => item.field));
				this.saving = true;
				this.failed = false;
				this.failedReason = void 0;
				this.publish();
				const landed = /* @__PURE__ */ new Set();
				const batch = this.batchedScope();
				if (batch !== void 0) {
					const result = await batch.mutate(plannedWrites);
					if (result.ok) {
						for (const field of result.fields) if (field.landed) landed.add(field.field);
					} else this.failedReason = result.message;
				} else for (const item of valid) if (await item.run()) landed.add(item.field);
				for (const field of fields) if (landed.has(field)) this.staged.delete(field);
				this.saving = false;
				this.failed = landed.size !== fields.size;
				this.publish();
			}
			/** The scope's batch surface when it supports one; undefined conservatively otherwise. */
			batchedScope() {
				const candidate = this.scope;
				return typeof candidate?.mutate === "function" ? candidate : void 0;
			}
			/**
			* Every staged edit a save would write. An entry whose draft is not a value
			* its field accepts carries no write: the form is still dirty, and the save
			* refuses rather than dropping the edit. A staged edit that matches the
			* effective section is not a write at all.
			* @returns the planned writes, in the order the fields were staged.
			*/
			plan() {
				const plan = [];
				for (const [field, staged] of this.staged) {
					const spec = this.specOf(field);
					if (staged.clear) {
						if (this.stored(field)) plan.push({
							field,
							op: {
								field,
								op: "unset"
							},
							run: () => this.clear(field)
						});
						continue;
					}
					if (staged.text === spec.format(this.sectionValue(field))) continue;
					const write = spec.parse(staged.text);
					if (write === void 0) plan.push({
						field,
						op: {
							field,
							op: "unset"
						},
						run: void 0
					});
					else if (write.kind === "clear") plan.push({
						field,
						op: {
							field,
							op: "unset"
						},
						run: () => this.clear(field)
					});
					else plan.push({
						field,
						op: {
							field,
							op: "set",
							value: write.value
						},
						run: () => this.store(field, write.value)
					});
				}
				return plan;
			}
			async clear(field) {
				await this.scope.unset(field);
				return !this.stored(field);
			}
			async store(field, value) {
				await this.scope.set(field, value);
				if (this.specOf(field).secret) return true;
				return this.userLayer()?.[field] === value;
			}
			stage(field, edit) {
				this.staged.set(field, edit);
				this.failed = false;
				this.failedReason = void 0;
				this.publish();
			}
			specOf(field) {
				const spec = this.specs.get(field);
				if (spec === void 0) throw new Error(`settings card has no field ${field}`);
				return spec;
			}
			snapshotOf() {
				return this.scope.getSnapshot();
			}
			sectionValue(field) {
				return this.snapshotOf().value?.[field];
			}
			baseValue(field) {
				return this.snapshotOf().base?.[field];
			}
			userLayer() {
				return this.snapshotOf().user;
			}
			stored(field) {
				const user = this.userLayer();
				return user !== void 0 && Object.hasOwn(user, field);
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region src/client/TaskBoardSettingsCard.tsx
		/** Bridges the `task-board` scope onto the card's staged form. */
		var TaskBoardSettingsCardController = class {
			form;
			store;
			/** @param scope - the bound settings scope for the `task-board` namespace. */
			constructor(scope) {
				this.form = new CardForm(scope, [booleanField("enabled"), booleanField("announceToAgent")]);
				this.store = this.form.bind(() => this.projection());
			}
			projection() {
				return {
					...this.form.shell(),
					enabled: this.form.field("enabled"),
					announceToAgent: this.form.field("announceToAgent")
				};
			}
			/**
			* Build the face the card's slot registration injects.
			* @returns the card's snapshot and its form actions.
			*/
			inject() {
				return {
					hooks: { taskBoardSettingsCard: this.store },
					...this.form.actions()
				};
			}
		};
		/**
		* Render the task-board card.
		* @param props - locale copy, the card snapshot, and its form actions.
		* @returns the card.
		*/
		function TaskBoardSettingsCard(props) {
			const { t } = props;
			const state = props.useTaskBoardSettingsCard((snapshot) => snapshot);
			const disabled = !state.writable;
			const fieldProps = {
				overriddenLabel: t("settings.overridden"),
				resetLabel: t("settings.reset"),
				invalidLabel: t("settings.invalidNumber"),
				disabled
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PluginSettingsCard, {
				t,
				titleKey: "settings.title",
				descriptionKey: "settings.description",
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BooleanField, {
					id: "settings-task-board-enabled",
					label: t("settings.enabled"),
					hint: t("settings.enabledHint"),
					inheritLabel: t("settings.inherit"),
					onLabel: t("settings.on"),
					offLabel: t("settings.off"),
					...fieldProps,
					...state.enabled,
					onEdit: (text) => {
						props.edit("enabled", text);
					},
					onReset: () => {
						props.resetField("enabled");
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BooleanField, {
					id: "settings-task-board-announce",
					label: t("settings.announceToAgent"),
					hint: t("settings.announceToAgentHint"),
					inheritLabel: t("settings.inherit"),
					onLabel: t("settings.on"),
					offLabel: t("settings.off"),
					...fieldProps,
					...state.announceToAgent,
					onEdit: (text) => {
						props.edit("announceToAgent", text);
					},
					onReset: () => {
						props.resetField("announceToAgent");
					}
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Locale namespace this plugin owns. */
		const NS = "task-board";
		/** Settings namespace the settings card edits (the Host plugin registers it). */
		const TASK_BOARD_NS = "task-board";
		/** Required services (fiber inject waiting — the runtime must be up first). */
		const inject = [
			"slots",
			"sessions",
			"workspaces",
			"connection",
			"settingsScope",
			"locale",
			"remote"
		];
		/**
		* Mount the task board.
		* @param ctx - client root context (services: sessions, workspaces).
		*/
		function apply(ctx) {
			if (!claimTaskboardApply()) return;
			ctx.effect(() => releaseTaskboardApply, "task-board: apply claim");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "task-board: dictionaries");
			const settingsScope = (ctx.get("webUiSettings") ?? ctx.settingsScope).bind({ namespace: TASK_BOARD_NS });
			const settingsCard = new TaskBoardSettingsCardController(settingsScope);
			ctx.slots.inject("web-ui.plugin.item", () => ctx.slots.register({
				name: "web-ui.plugin.item",
				id: "task-board",
				order: 110,
				locale: NS,
				inject: () => settingsCard.inject()
			}, TaskBoardSettingsCard));
			let uiDisposer;
			const mountUi = () => {
				if (uiDisposer !== void 0) return;
				const sessions = ctx.sessions;
				const workspaces = ctx.workspaces;
				const connection = ctx.get("connection");
				const controller = new BoardController({
					store: new LocalStorageTaskStore(),
					exec: new ExecutionService({
						sessions: {
							list: sessions.list,
							binding: (id) => {
								const binding = sessions.binding(id);
								if (binding === void 0) return void 0;
								const { session } = binding;
								return { session: {
									rename: (title) => session.rename(title),
									prompt: (content, mode) => session.prompt(content, mode).then((result) => result.ok ? { ok: true } : {
										ok: false,
										error: result.error
									}),
									command: (line) => session.command(line).then((result) => result.ok ? {
										ok: true,
										matched: result.value.matched
									} : {
										ok: false,
										error: result.error
									}),
									getSnapshot: () => session.getSnapshot(),
									subscribe: (fn) => session.subscribe(fn)
								} };
							},
							noteAgentPreset: (sessionId, agentPreset) => sessions.noteAgentPreset(sessionId, agentPreset)
						},
						workspaces: {
							list: workspaces.list,
							connectWorkspace: (id) => workspaces.connectWorkspace(id)
						},
						presets: { select: async (sessionId, agentPreset) => {
							try {
								const response = await connection.api.agentPresets.select({
									sessionId,
									agentPreset
								});
								return response.result.ok ? { ok: true } : {
									ok: false,
									error: response.result.error
								};
							} catch (error) {
								return {
									ok: false,
									error
								};
							}
						} },
						history: { loadTail: async (sessionId) => {
							const response = await connection.api.sessions.history({
								sessionId,
								maxMessages: 20
							});
							return response.result.ok ? { events: response.result.value.events.map((entry) => entry.event) } : void 0;
						} }
					}),
					sessions: {
						list: sessions.list,
						open: (id) => sessions.open(id)
					}
				});
				controller.start();
				const scheduler = new SchedulerService({
					tasks: () => controller.getSnapshot().tasks,
					now: () => Date.now(),
					runTask: (id) => controller.runTask(id),
					applySchedule: (id, nextRunAt, lastTriggeredAt) => controller.applyScheduleNextRun(id, nextRunAt, lastTriggeredAt),
					ready: () => sessions.list.getSnapshot().phase === "ready",
					environment: {
						addEventListener: (type, listener) => document.addEventListener(type, listener),
						removeEventListener: (type, listener) => document.removeEventListener(type, listener)
					}
				});
				scheduler.start();
				const disposers = [];
				const pushWorkspaceOptions = () => {
					const snapshot = workspaces.list.getSnapshot();
					controller.setExecutionOptions({ workspaces: snapshot.items.map((item) => ({
						workspaceId: item.workspaceId,
						title: item.title !== "" ? item.title : item.path
					})) });
				};
				pushWorkspaceOptions();
				disposers.push(workspaces.list.subscribe(pushWorkspaceOptions));
				const pushPresetOptions = async () => {
					try {
						const response = await connection.api.agentPresets.list({});
						if (!response.result.ok) return;
						controller.setExecutionOptions({ presets: response.result.value.presets.map((preset) => ({
							id: preset.id,
							name: preset.name,
							description: preset.description,
							broken: preset.broken,
							isDefault: preset.isDefault
						})) });
					} catch (error) {
						console.error("[dsh-task-board] agent preset roster read failed", error);
					}
				};
				pushPresetOptions();
				disposers.push(ctx.on("connection/reset", () => {
					pushPresetOptions();
				}));
				try {
					disposers.push(mountSidebarEntry(controller));
					disposers.push(mountBoard(controller));
				} catch (error) {
					console.error("[dsh-task-board] mount failed:", error);
				}
				uiDisposer = () => {
					for (const dispose of disposers.splice(0)) dispose();
					scheduler.dispose();
					controller.dispose();
					uiDisposer = void 0;
				};
			};
			const syncEnabled = () => {
				const snapshot = settingsScope.getSnapshot();
				if (snapshot.status === "ready" ? snapshot.value?.enabled ?? true : snapshot.status === "unavailable") mountUi();
				else uiDisposer?.();
			};
			settingsScope.subscribe(syncEnabled);
			syncEnabled();
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map