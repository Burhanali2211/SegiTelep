# Troubleshooting Guide

## 🚨 Common Production Issues

### React Context Error
**Error**: `Cannot read properties of undefined (reading 'createContext')`

**Cause**: React split into vendor chunks causing loading order issues

**Solution**:
1. Check `vite.config.ts` manualChunks function
2. Ensure React returns `null` (not split)
3. Verify explicit React imports in entry files

**Files to Check**:
- `vite.config.ts` - Chunking strategy
- `src/main.tsx` - React import
- `src/App.tsx` - React import

### Blank Screen in Production
**Causes & Solutions**:

1. **BrowserRouter instead of HashRouter**
   - Use `HashRouter` for Tauri file:// protocol
   - File: `src/App.tsx`

2. **Environment Variables**
   - Replace `process.env.NODE_ENV` with `import.meta.env.DEV`
   - Search: `grep -r "process\.env" src/`

3. **Node.js Globals**
   - Remove `require()`, `__dirname`, `global` usage
   - Use browser-compatible alternatives

### Build Failures

#### Tauri Build Errors
**Error**: `failed to resolve: use of unresolved module`

**Solution**:
```rust
// src-tauri/src/main.rs
fn main() {
  segitelep_lib::run(); // Use correct library name
}
```

#### Permissions Errors
**Error**: Long permissions list in build output

**Solution**:
```json
// src-tauri/capabilities/default.json
{
  "permissions": [
    "core:default",
    "clipboard-manager:allow-read-text",
    "clipboard-manager:allow-write-text"
  ]
}
```

### Performance Issues

#### Large Bundle Size
**Check**: `npm run build` output

**Optimization**:
- Manual chunks for heavy libraries
- Tree shaking for unused code
- Asset optimization

#### Slow Startup
**Causes**:
- Too many vendor chunks
- Large initial bundle
- Missing lazy loading

## 🛠️ Diagnostic Commands

```bash
# Check bundle analysis
npm run build -- --analyze

# Clean rebuild
npm run clean:build

# Development testing
npm run tauri dev

# Production testing
npm run tauri build && npm run tauri dev -- --release
```

## 📋 Pre-Deployment Checklist

- [ ] React context working
- [ ] HashRouter implemented
- [ ] Environment variables fixed
- [ ] No Node.js globals
- [ ] Build completes without errors
- [ ] App launches in production
- [ ] All routes work in file://
- [ ] No console errors

## 🔧 Emergency Fixes

### Quick React Fix
```typescript
// Add to vite.config.ts
manualChunks: (id) => {
  if (id.includes("react")) return null; // Force React in main
}
```

### Quick Router Fix
```typescript
// Replace in App.tsx
import { HashRouter } from "react-router-dom";
// Use <HashRouter> instead of <BrowserRouter>
```

---
**Last Updated**: Fixed React context error - Never modify React chunking
