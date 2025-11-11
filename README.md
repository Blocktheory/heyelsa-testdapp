# Test DApp with Secure Widget Integration

## Overview

This dApp demonstrates secure integration with the HeyElsa chat widget, implementing comprehensive security features to prevent message injection and authentication attacks.

## Quick Start

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Start the dApp**
```bash
npm start
```

### 3. **Start with Debug Logging**
```bash
npm run start:debug
```

## Security Features

- ✅ **HMAC-SHA256 Message Authentication**
- ✅ **Request-Response Correlation**  
- ✅ **Replay Attack Prevention**
- ✅ **Strict Message Validation**
- ✅ **Visual Security Status Indicators**

## Security Status

The app always runs in secure mode with full authentication:
- 🔒 **Secure Mode**: HMAC-SHA256 authentication always enabled

## Usage Examples

### Usage
```typescript
import { createWalletAdapter } from './adapter';

// Create secure adapter (always secure)
const secureAdapter = createWalletAdapter({
  onSharedSecretReceived: (secret) => {
    console.log('🔒 Secure communication established');
  }
});

// Use with widget
<HeyElsaChatWidget 
  messagePort={secureAdapter.port2}
  keyId="your-app"
/>
```

## Available Scripts

- `npm start` - Start the dApp (always secure)
- `npm run start:debug` - Enable debug logging
- `npm run build` - Production build
- `npm test` - Run tests

## Security Status

Current security implementation prevents:
- ❌ Message injection attacks
- ❌ Response forgery
- ❌ Replay attacks  
- ❌ Man-in-the-middle attacks
- ❌ Unauthorized wallet operations

## Files Structure

```
src/
├── adapter.ts              # Complete secure wallet adapter (single file!)
├── App.tsx                 # Main app with security status
└── components/             # UI components
```

**Everything you need is in `adapter.ts` - no external dependencies!**

## Testing Security

1. **Monitor Console**: Watch for authentication events
2. **Test Attack Prevention**: Try injecting fake messages (they'll be blocked)
3. **Verify Authentication**: Check for "✅ Authenticated" status in header

## Documentation

- `INTEGRATION_GUIDE.md` - **Quick start guide for dApp developers**
- `WIDGET_SECURITY.md` - Detailed security implementation guide  
- `FLOW_EXPLANATION.md` - How the secure communication works
- Browser console - Real-time security event logging

---

**Status**: 🔒 **SECURE**  
**Widget Version**: 2.0.0+  
**Security Level**: Production Ready

## Original Create React App Documentation

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).