# Production Build Guide - Critical Error Prevention

## 🚨 CRITICAL: React Context Error Prevention

### Problem
`Cannot read properties of undefined (reading 'createContext')` error occurs when React is split into separate vendor chunks, causing loading order issues.

### Root Cause
React gets bundled separately from main app code, creating race conditions where components try to use React context before React is loaded.

### ✅ SOLUTION (Already Implemented)

#### 1. Vite Configuration
```typescript
// vite.config.ts - manualChunks function
manualChunks: (id) => {
  if (id.includes("node_modules")) {
    // CRITICAL: Keep React in main chunk
    if (id.includes("react-dom") || id.includes("react/")) {
      return null; // Don't split React
    }
    // Other vendor chunks...
  }
}
```

#### 2. Explicit React Imports
```typescript
// src/main.tsx and src/App.tsx
import React from 'react'; // ALWAYS import React explicitly
```

### 🛡️ PREVENTION RULES

1. **NEVER split React into vendor chunks**
2. **ALWAYS import React explicitly in entry files**
3. **KEEP React and React-DOM in main bundle**
4. **TEST production builds regularly**

### 📋 Build Verification Checklist

- [ ] React not in separate vendor chunk
- [ ] Explicit React imports in main.tsx/App.tsx
- [ ] No React context errors in console
- [ ] Tauri app launches without blank screen

### 🔧 Quick Fix if Error Recurs

1. Check `dist/assets/` for React vendor chunks
2. Verify React imports in entry files
3. Rebuild with `npm run clean:build`

### 📁 Related Files
- `vite.config.ts` - Chunking strategy
- `src/main.tsx` - Entry point
- `src/App.tsx` - Main component

---
**Status**: ✅ FIXED - Never modify React chunking strategy
