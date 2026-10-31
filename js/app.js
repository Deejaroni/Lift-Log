// Lift Log: start-up. Loads every module, then runs each one's start-up code in the original order.

import { init as ui } from "./ui.js";
import { init as state } from "./state.js";
import { init as backup } from "./backup.js";
import { init as log } from "./log.js";
import { init as equipment } from "./equipment.js";
import { init as entries } from "./entries.js";
import "./exercise-library.js";
import { init as catalog } from "./catalog.js";
import { init as search } from "./search.js";
import { init as progress } from "./progress.js";
import "./plan.js";
import { init as exerciseSheet } from "./exercise-sheet.js";
import { init as planEditor } from "./plan-editor.js";
import { init as standards } from "./standards.js";
import { init as main } from "./main.js";

[ui, state, backup, log, equipment, entries, catalog, search, progress, exerciseSheet, planEditor, standards, main].forEach(init => init());
