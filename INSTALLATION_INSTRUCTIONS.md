# Markdown to QTI - Installation Instructions

## For Users: How to Install and Run the App

### Option 1: Quick Installation (Recommended)

1. **Download the app** from the provided link
2. **Extract the ZIP file** if you received a ZIP archive
3. **Right-click on the app** and select "Open" (don't double-click)
4. **Click "Open"** when macOS asks for confirmation
5. The app should now run normally

### Option 2: If you get "App is damaged" error

If you see the "damaged and can't be opened" error, follow these steps:

1. **Open Terminal** (Press Cmd+Space, type "Terminal", press Enter)
2. **Run this command** (replace with your actual path):
   ```bash
   sudo xattr -rd com.apple.quarantine "/Applications/Markdown to QTI.app"
   ```
   Or if the app is in your Downloads folder:
   ```bash
   sudo xattr -rd com.apple.quarantine "~/Downloads/Markdown to QTI.app"
   ```
3. **Enter your password** when prompted
4. **Try opening the app again**

### Option 3: System Preferences Method

1. **Go to System Preferences** → **Security & Privacy**
2. **Click the "General" tab**
3. **Look for a message** about the app being blocked
4. **Click "Open Anyway"** next to the message
5. **Confirm** by clicking "Open" in the dialog

### Option 4: Disable Gatekeeper (Advanced Users Only)

⚠️ **Warning**: This reduces your Mac's security. Only do this if other methods don't work.

1. **Open Terminal**
2. **Run this command**:
   ```bash
   sudo spctl --master-disable
   ```
3. **Install and run the app**
4. **Re-enable Gatekeeper** after installation:
   ```bash
   sudo spctl --master-enable
   ```

## For Developers: Building and Distributing

### Building the App

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build for distribution**:
   ```bash
   # For unsigned build (easier for sharing)
   npm run dist:unsigned
   
   # For signed build (requires Apple Developer account)
   npm run dist
   ```

### Code Signing (Optional but Recommended)

To avoid security warnings completely, you can code-sign your app:

1. **Get an Apple Developer account** ($99/year)
2. **Create a Developer ID Application certificate**
3. **Set environment variables**:
   ```bash
   export CSC_LINK="path/to/your/certificate.p12"
   export CSC_KEY_PASSWORD="your_certificate_password"
   export APPLE_ID="your_apple_id@email.com"
   export APPLE_ID_PASSWORD="your_app_specific_password"
   export APPLE_TEAM_ID="your_team_id"
   ```
4. **Build with signing**:
   ```bash
   npm run dist
   ```

### Distribution Tips

- **Use the unsigned build** for internal testing
- **Use signed + notarized build** for public distribution
- **Include these instructions** with your app
- **Consider using a DMG installer** for better user experience

## Troubleshooting

### Common Issues

1. **"App is damaged"**: Use Option 2 above
2. **"App can't be opened"**: Use Option 3 above  
3. **App crashes on startup**: Check that you have the latest macOS version
4. **Permission denied**: Make sure the app is in Applications folder

### System Requirements

- **macOS 10.14** (Mojave) or later
- **64-bit Intel or Apple Silicon** processor
- **At least 100MB** free disk space

## Support

If you continue to have issues:

1. **Check the system requirements** above
2. **Try running from Terminal** to see error messages:
   ```bash
   /Applications/Markdown\ to\ QTI.app/Contents/MacOS/Markdown\ to\ QTI
   ```
3. **Contact the developer** with your macOS version and error details
