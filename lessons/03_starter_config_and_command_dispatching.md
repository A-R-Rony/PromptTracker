# Engineering Lesson 03: Entry Point Configuration & Script Dispatching

> **Target Audience**: Engineers asking: *Where is the starter file configured? What does `npm run start` do vs `npm run scan` vs `npm run ui`?*

---

## 1. Where do we tell Node what the "Starter" file is?

In **C# / ASP.NET Core**, the compiler looks for a static method `Main` or top-level statements inside your `.csproj` project files.

In **Node.js / TypeScript**, there is no automatic class scanning. Instead, the entry points are explicitly defined in **[`package.json`](file:///d:/PetProjects/PromptTracker/prototype/package.json)** in two places:

### A. The `"scripts"` dictionary (for `npm run ...` commands):
```json
"scripts": {
  "build": "tsc",
  "start": "node dist/cli.js",
  "dev": "ts-node src/cli.ts",
  "scan": "ts-node src/cli.ts scan",
  "ui": "ts-node src/cli.ts ui"
}
```

### B. The `"bin"` field (for global CLI binary installation):
```json
"bin": {
  "prompttracker": "./dist/cli.js",
  "promptburn": "./dist/cli.js"
}
```
When someone installs your package globally (`npm install -g prompttracker`), running `prompttracker` in terminal executes `./dist/cli.js`.

---

## 2. What happens when you run `npm run start`?

Look closely at the command:
```bash
npm run start
# executes -> node dist/cli.js
```
Notice that **no sub-command (`scan` or `ui`) was passed**.

Here is what happens step-by-step:
1. Node executes `dist/cli.js`.
2. The file configures `commander` with two sub-commands: `scan` and `ui`.
3. `program.parse(process.argv)` evaluates the terminal arguments.
4. Because no command was given, **it prints the help menu** and exits without scanning anything:
   ```text
   Usage: prompttracker [options] [command]

   Universal AI Coding Prompt Tracker

   Options:
     -V, --version   output the version number
     -h, --help      display help for command

   Commands:
     scan [options]  Scan AI coding sessions (scoped to current project by default)
     ui [options]    Launch the interactive Web Dashboard
     help [command]  display help for command
   ```

> [!NOTE]
> If you pass arguments through `npm start`, such as `npm start -- scan`, it passes `scan` to `dist/cli.js`, which then runs the scanner.

---

## 3. Comparing `npm run scan` vs. `npm run ui`

Both commands execute the **same entry file** (`src/cli.ts`), but they trigger completely different execution paths based on Commander routing:

```
                                [ src/cli.ts ]
                                      │
                                      ▼
                         [ Commander CLI Router ]
                         Checks process.argv[2]
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
             If argv is "scan"                   If argv is "ui"
                    ▼                                   ▼
        [ Run Terminal Scanner ]               [ Start Express Server ]
     1. Runs ScannerRegistry.scanAll()       1. Calls createServer()
     2. Filters to current project           2. Registers /api/sessions & static files
     3. Calculates total token metrics       3. Listens on http://localhost:4321
     4. Renders Interactive TUI Menu         4. Opens browser dashboard automatically
```

---

### Command 1: `npm run scan` (Terminal Interactive Mode)
- **Target Audience**: Terminal-first developer wanting a quick check while coding.
- **Workflow**:
  1. Instantiates `ScannerRegistry` and executes `.scanAll()`.
  2. Scans `~/.gemini`, `~/.claude`, etc.
  3. Displays a formatted ASCII / Chalk summary directly in the command line:
     ```text
     [Project: PromptTracker]
     USAGE SUMMARY:  Prompts: 45 | Tokens: 182,450 | Cost: $0.0543
     ```
  4. Renders an interactive arrow-key list (`prompts`) to inspect turns or export to IDE.

---

### Command 2: `npm run ui` (Web Dashboard Mode)
- **Target Audience**: Visual dashboard for inspecting graphs, daily trends, and reading full side-by-side conversations.
- **Workflow**:
  1. Does **not** run the scanner immediately on the console.
  2. Calls `createServer()` (`src/server/index.ts`) which boots an Express Web Server on port `4321`.
  3. Serves the glassmorphism frontend at `http://localhost:4321`.
  4. The frontend browser JavaScript makes AJAX requests to `/api/sessions` and `/api/summary`.
  5. The server scans and caches the results for 10 seconds.

---

## 4. Summary Table

| Command | Executed Command Behind the Scenes | What It Does |
| :--- | :--- | :--- |
| **`npm run build`** | `tsc` | Compiles `.ts` files to `.js` in `dist/`. Does **not** run any code. |
| **`npm run start`** | `node dist/cli.js` | Runs compiled CLI without arguments (displays CLI help text). |
| **`npm run scan`** | `ts-node src/cli.ts scan` | Runs CLI scanner in the terminal with interactive arrow-key selection. |
| **`npm run ui`** | `ts-node src/cli.ts ui` | Launches local Express web server + opens browser UI at `localhost:4321`. |
