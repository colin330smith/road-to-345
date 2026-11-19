// Static check of inline event handlers (onclick="..." etc.) in the built app.
// ESLint cannot see into the 150-odd handler strings that live inside template literals, so a renamed or
// deleted function becomes a ReferenceError only when the button is tapped. This lists every identifier
// a handler calls or reads at its head and checks it is a global of the inline script.
//   node check-inline-handlers.js <path to road-to-345.html> [path to node_modules with espree]
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(process.argv[2], "utf8");
const nm = process.argv[3] || path.join(__dirname, "node_modules");
const espree = require(path.join(nm, "espree"));
const src = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
const ast = espree.parse(src, { ecmaVersion: 2023, sourceType: "script", range: true, loc: true });
const globals = new Set(["window", "document", "localStorage", "location", "confirm", "alert", "event", "this", "Math", "Number", "String", "JSON", "Date", "parseFloat", "parseInt", "isFinite", "setTimeout", "navigator", "console", "$"]);
const declNames = (id) => id.type === "Identifier" ? [id.name] : id.type === "ObjectPattern" ? id.properties.flatMap((p) => declNames(p.value || p.argument)) : id.type === "ArrayPattern" ? id.elements.filter(Boolean).flatMap(declNames) : id.type === "AssignmentPattern" ? declNames(id.left) : id.type === "RestElement" ? declNames(id.argument) : [];
for (const n of ast.body) {
  if (n.type === "FunctionDeclaration" || n.type === "ClassDeclaration") globals.add(n.id.name);
  else if (n.type === "VariableDeclaration") for (const d of n.declarations) for (const x of declNames(d.id)) globals.add(x);
}
// window.X = ... anywhere
const walk = (n, f) => { if (!n || typeof n.type !== "string") return; f(n); for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && walk(c, f)); else if (v && typeof v.type === "string") walk(v, f); } };
walk(ast, (n) => { if (n.type === "AssignmentExpression" && n.left.type === "MemberExpression" && n.left.object.type === "Identifier" && n.left.object.name === "window" && !n.left.computed) globals.add(n.left.property.name); });
// handlers: attribute text up to the closing quote (template-literal ${...} parts are replaced by 0)
const strip = (s) => { let out = "", depth = 0; for (let i = 0; i < s.length; i++) { if (s[i] === "$" && s[i + 1] === "{") { depth++; i++; if (depth === 1) out += "0"; continue; } if (depth) { if (s[i] === "{") depth++; else if (s[i] === "}") depth--; continue; } out += s[i]; } return out; };
const re = /\son([a-z]+)=(\\?")((?:\$\{(?:[^{}]|\{[^{}]*\})*\}|(?!\2)[^])*?)\2/g;
let m, total = 0; const bad = [], seen = new Map();
for (const text of [src, html.replace(/<script>[\s\S]*?<\/script>/g, "")]) {
  re.lastIndex = 0;
  while ((m = re.exec(text))) {
    total++;
    const code = strip(m[3]).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\\'/g, "'");
    let h;
    try { h = espree.parse("(function(event){" + code + "\n})", { ecmaVersion: 2023, sourceType: "script" }); }
    catch (e) { bad.push({ kind: "does not parse", ev: m[1], code: code.slice(0, 120), err: e.message }); continue; }
    // free identifiers: collect declared names in the handler, then referenced ones
    const local = new Set(["event"]);
    walk(h, (n) => { if (n.type === "VariableDeclarator") declNames(n.id).forEach((x) => local.add(x)); if (/Function/.test(n.type)) n.params.forEach((p) => declNames(p).forEach((x) => local.add(x))); });
    walk(h, (n) => {
      const refs = [];
      if (n.type === "CallExpression" && n.callee.type === "Identifier") refs.push(n.callee.name);
      if (n.type === "MemberExpression" && n.object.type === "Identifier") refs.push(n.object.name);
      if (n.type === "CallExpression") for (const a of n.arguments) if (a.type === "Identifier") refs.push(a.name);
      if (n.type === "AssignmentExpression" && n.left.type === "Identifier") refs.push(n.left.name);
      for (const name of refs) { seen.set(name, (seen.get(name) || 0) + 1); if (!local.has(name) && !globals.has(name) && !(name in globalThis)) bad.push({ kind: "undefined name", name, ev: m[1], code: code.slice(0, 120) }); }
    });
  }
}
console.log(`${total} inline handlers, ${seen.size} distinct names referenced, ${globals.size} globals known`);
for (const b of bad) console.log("PROBLEM", JSON.stringify(b));
console.log(bad.length ? `${bad.length} problem(s)` : "all inline handlers resolve");
process.exit(bad.length ? 1 : 0);
