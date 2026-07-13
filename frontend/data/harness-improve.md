**Core (must have):**

1. `eval_js(code)` - run JS in page context, return result/errors
2. `read_state` / `dom_query(selector)` - inspect page/DOM
3. `console_capture` - get console logs, errors, unhandled rejections

**Harness-level (next):**

4. `define_script(name, code)` / `run_script(name)` - persistent script registry
5. `storage` - save/load snippets (localStorage or backend)
6. `net_probe` - test WS/WebRTC endpoints, report handshake/latency

**Nice to have:**

7. `ui_panel` - render output/controls into page
8. `timer/schedule` - run scripts on interval
