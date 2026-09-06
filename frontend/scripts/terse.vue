<script setup lang="ts">
// terse → js — the "terse" toy language, compiled (not interpreted) to JS.
//
// terse is a tiny async-only language; its keywords are @-mentions. Calls auto-await:
//   name = expr            bind a variable
//   @(params?) -> expr | { … }   a function — always async
//   f(args)                call a function — automatically awaited
//   @p expr                get the raw promise (opt out of the auto-await)
//   @r expr                return out of a function
//   @l(expr)               builtin: print
//   numbers, + - * /, ( )
//
// STRATEGY: don't interpret — COMPILE. The lexer + parser feed a code generator that emits plain
// JavaScript, which the browser then runs. @ = async fn; every call auto-awaits (@p opts out).
// Edit the source → Compile to see the emitted JS → Run to execute it.
import { ref, onMounted } from 'vue'
import LogPanel from './lib/LogPanel.vue'

/* ── 1. LEXER  (source text → tokens) ── */
const tokenize = (src: string) => {
  const tokens: any[] = []
  let i = 0
  const isDigit = (char: string) => char >= '0' && char <= '9'
  const isAlpha = (char: string) =>
    (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_'
  const isAlnum = (char: string) => isAlpha(char) || isDigit(char)

  while (i < src.length) {
    const char = src[i]
    if (char === '\n') {
      tokens.push({ type: 'NEWLINE' })
      i++
      continue
    }
    if (char === ' ' || char === '\t' || char === '\r') {
      i++
      continue
    }
    if (char === '-' && src[i + 1] === '>') {
      tokens.push({ type: 'ARROW' })
      i += 2
      continue
    }
    if (char === '@') {
      let j = i + 1
      while (j < src.length && isAlnum(src[j])) {
        j++
      }
      // bare '@' (name '') is the function marker (always async); '@p'/'@r'/'@l' are promise/return/log.
      tokens.push({ type: 'AT', name: src.slice(i + 1, j) })
      i = j
      continue
    }
    if (isAlpha(char)) {
      let j = i
      while (j < src.length && isAlnum(src[j])) {
        j++
      }
      tokens.push({ type: 'IDENT', name: src.slice(i, j) })
      i = j
      continue
    }
    if (isDigit(char)) {
      let j = i
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) {
        j++
      }
      tokens.push({ type: 'NUMBER', value: Number(src.slice(i, j)) })
      i = j
      continue
    }
    const single: Record<string, string> = {
      '=': 'EQUALS',
      '+': 'PLUS',
      '-': 'MINUS',
      '*': 'STAR',
      '/': 'SLASH',
      '(': 'LPAREN',
      ')': 'RPAREN',
      ',': 'COMMA',
      '{': 'LBRACE',
      '}': 'RBRACE',
    }
    if (single[char]) {
      tokens.push({ type: single[char] })
      i++
      continue
    }
    throw new SyntaxError(`Unexpected character '${char}' at position ${i}`)
  }
  tokens.push({ type: 'EOF' })
  return tokens
}

/* ── 2. PARSER  (tokens → AST), recursive descent ── */
const parse = (tokens: any[]) => {
  let pos = 0
  const peek = (offset = 0) => tokens[pos + offset] ?? tokens[tokens.length - 1]
  const next = () => tokens[pos++]
  const expect = (type: string) => {
    const token = next()
    if (token.type !== type) {
      throw new SyntaxError(`Expected ${type} but got ${token.type}`)
    }
    return token
  }
  const skipNewlines = () => {
    while (peek().type === 'NEWLINE') {
      next()
    }
  }
  const parseStatementList = (endType: string) => {
    const body: any[] = []
    skipNewlines()
    while (peek().type !== endType) {
      if (peek().type === 'EOF') {
        throw new SyntaxError(`Unexpected EOF: expected ${endType}`)
      }
      body.push(parseStatement())
      if (peek().type === 'NEWLINE') {
        skipNewlines()
      } else if (peek().type !== endType) {
        throw new SyntaxError(`Expected end of statement but got ${peek().type}`)
      }
    }
    return body
  }
  const parseBlock = () => {
    expect('LBRACE')
    const body = parseStatementList('RBRACE')
    expect('RBRACE')
    return { type: 'Block', body }
  }
  const parseStatement = (): any => {
    if (peek().type === 'AT' && peek().name === 'r') {
      next()
      const tokenType = peek().type
      const hasValue = tokenType !== 'NEWLINE' && tokenType !== 'RBRACE' && tokenType !== 'EOF'
      return { type: 'Return', value: hasValue ? parseExpression() : null }
    }
    if (peek().type === 'IDENT' && peek(1).type === 'EQUALS') {
      const name = next().name
      expect('EQUALS')
      return { type: 'Assign', name, value: parseExpression() }
    }
    return { type: 'ExprStmt', expr: parseExpression() }
  }
  const parseExpression = (): any => {
    if (peek().type === 'AT' && peek().name === '') {
      return parseFn()
    }
    return parseAdditive()
  }
  // Optional param list between @ and the arrow: @(a, b) -> …
  const parseParams = () => {
    const params: string[] = []
    expect('LPAREN')
    if (peek().type !== 'RPAREN') {
      params.push(expect('IDENT').name)
      while (peek().type === 'COMMA') {
        next()
        params.push(expect('IDENT').name)
      }
    }
    expect('RPAREN')
    return params
  }
  const parseFn = () => {
    next() // consume the '@'
    const params = peek().type === 'LPAREN' ? parseParams() : []
    expect('ARROW')
    const body = peek().type === 'LBRACE' ? parseBlock() : parseExpression()
    return { type: 'Fn', params, body }
  }
  const parseAdditive = () => {
    let node = parseMultiplicative()
    while (peek().type === 'PLUS' || peek().type === 'MINUS') {
      const op = next().type === 'PLUS' ? '+' : '-'
      node = { type: 'BinaryOp', op, left: node, right: parseMultiplicative() }
    }
    return node
  }
  const parseMultiplicative = () => {
    let node = parseUnary()
    while (peek().type === 'STAR' || peek().type === 'SLASH') {
      const op = next().type === 'STAR' ? '*' : '/'
      node = { type: 'BinaryOp', op, left: node, right: parseUnary() }
    }
    return node
  }
  const parseUnary = (): any => {
    // '@p' opts out of the automatic await on the call that follows — you get the raw promise.
    if (peek().type === 'AT' && peek().name === 'p') {
      next()
      const expr = parseUnary()
      if (expr.type === 'Call') {
        expr.promise = true
      }
      return expr
    }
    return parseCall()
  }
  const parseCall = () => {
    let node = parsePrimary()
    while (peek().type === 'LPAREN') {
      next()
      const args: any[] = []
      if (peek().type !== 'RPAREN') {
        args.push(parseExpression())
        while (peek().type === 'COMMA') {
          next()
          args.push(parseExpression())
        }
      }
      expect('RPAREN')
      node = { type: 'Call', callee: node, args }
    }
    return node
  }
  const parsePrimary = (): any => {
    const token = peek()
    if (token.type === 'NUMBER') {
      next()
      return { type: 'Number', value: token.value }
    }
    if (token.type === 'IDENT') {
      next()
      return { type: 'Var', name: token.name }
    }
    if (token.type === 'AT') {
      if (token.name === '') {
        return parseFn()
      }
      next()
      return { type: 'Builtin', name: token.name }
    }
    if (token.type === 'LPAREN') {
      next()
      const expr = parseExpression()
      expect('RPAREN')
      return expr
    }
    throw new SyntaxError(`Unexpected token ${token.type}`)
  }
  return { type: 'Program', body: parseStatementList('EOF') }
}

/* ── 3. CODEGEN  (AST → JavaScript source) ──
   terse's async model is JS's async model, so the mapping is direct:
     @(a,b) -> …   →  async (a, b) => …  (every fn is async; params optional)
     f(x)          →  (await f(x))       (calls auto-await; '@p f(x)' keeps the raw promise)
     @r e      →  return e
     @l        →  log  (the print builtin — sync, not auto-awaited)
   terse binds per-scope (set always writes the current scope), so each block tracks its own
   declared names: first binding → `let`, a re-binding in the same block → bare assign. */
const compileToJs = (ast: any) => {
  const genExpr = (node: any): string => {
    switch (node.type) {
      case 'Number':
        return String(node.value)
      case 'Var':
        return node.name
      case 'Builtin':
        return node.name === 'l' ? 'log' : node.name
      case 'BinaryOp':
        return `(${genExpr(node.left)} ${node.op} ${genExpr(node.right)})`
      case 'Call': {
        const call = `${genExpr(node.callee)}(${node.args.map(genExpr).join(', ')})`
        // every terse fn is async → calls auto-await; builtins (log) stay sync; '@p' keeps the promise.
        return node.callee.type === 'Builtin' || node.promise ? call : `(await ${call})`
      }
      case 'Fn': {
        const params = node.params.join(', ')
        const head = `async (${params}) => ` // every terse fn is async
        const body = node.body.type === 'Block' ? genBlock(node.body.body, 1) : genExpr(node.body)
        return head + body
      }
      default:
        throw new Error(`cannot generate expression: ${node.type}`)
    }
  }
  const genStmt = (node: any, declared: Set<string>): string => {
    switch (node.type) {
      case 'Assign': {
        const keyword = declared.has(node.name) ? '' : 'let '
        declared.add(node.name)
        return `${keyword}${node.name} = ${genExpr(node.value)}`
      }
      case 'Return':
        return node.value ? `return ${genExpr(node.value)}` : 'return'
      case 'ExprStmt':
        return genExpr(node.expr)
      default:
        throw new Error(`cannot generate statement: ${node.type}`)
    }
  }
  const genBlock = (body: any[], depth: number): string => {
    const declared = new Set<string>() // a block is its own scope
    const pad = '  '.repeat(depth)
    const lines = body.map((stmt) => pad + genStmt(stmt, declared))
    return `{\n${lines.join('\n')}\n${'  '.repeat(depth - 1)}}`
  }
  const declared = new Set<string>()
  return ast.body.map((stmt: any) => genStmt(stmt, declared)).join('\n')
}

const compile = (src: string) => compileToJs(parse(tokenize(src)))

/* ── 4. UI  (source → Compile → JS → Run) ── */
const SAMPLE = [
  'add = @(a, b) -> a + b',
  'double = @(n) -> add(n, n)',
  '',
  'result = double(5)',
  '@l(result)',
].join('\n')

const source = ref(SAMPLE)
const output = ref('// generated JS appears here')
const panel = ref<InstanceType<typeof LogPanel>>()

const showJs = () => {
  try {
    output.value = compile(source.value)
    return true
  } catch (err: any) {
    output.value = `// compile error: ${err.message}`
    return false
  }
}

const run = async () => {
  panel.value?.clear()
  if (!showJs()) {
    panel.value?.push('compile failed — see the generated panel', 'sys')
    return
  }
  // @l prints through here; the builtin returns its first arg (like the old interpreter).
  const log = (...args: unknown[]) => {
    panel.value?.push(args.map(String).join(' '), 'down')
    return args[0]
  }
  try {
    // Wrap the emitted top-level statements in an async IIFE so a top-level await (from an
    // auto-awaited call) is valid; new Function keeps the generated code out of this module's scope.
    const program = new Function('log', `return (async () => {\n${output.value}\n})()`)
    await program(log)
    panel.value?.push('done ✓', 'sys')
  } catch (err: any) {
    panel.value?.push(`runtime error: ${err.message}`, 'sys')
  }
}

const reset = () => {
  source.value = SAMPLE
  output.value = '// generated JS appears here'
}

// Auto-show the generated JS on open so the script is self-explanatory.
onMounted(showJs)
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-3">
    <div class="flex gap-2">
      <button class="btn btn-sm" @click="showJs">Compile → JS</button>
      <button class="btn btn-sm btn-primary" @click="run">Run ▶</button>
      <button class="btn btn-sm" @click="reset">Reset</button>
    </div>
    <textarea
      v-model="source"
      name="terse-source"
      spellcheck="false"
      class="textarea textarea-bordered w-full resize-y overflow-auto font-mono text-[13px] leading-normal whitespace-pre-wrap"
      rows="8"
    ></textarea>
    <pre
      class="overflow-auto rounded border border-base-300 bg-base-200 p-2 font-mono text-[13px] leading-normal whitespace-pre-wrap"
      >{{ output }}</pre
    >
    <LogPanel ref="panel" height="140px" />
  </div>
</template>
