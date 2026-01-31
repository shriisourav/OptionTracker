# Flutter Setup Guide for CallTrack

## Prerequisites

Before setting up Flutter, ensure you have:
- macOS (your current system)
- Git
- Xcode Command Line Tools (already installed)

## Step 1: Install Flutter SDK

### Option A: Using Git (Recommended)

```bash
# Navigate to home directory
cd ~/

# Clone Flutter repository
git clone https://github.com/flutter/flutter.git -b stable

# Add Flutter to PATH
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.zshrc

# Reload shell configuration
source ~/.zshrc

# Verify installation
flutter --version
```

### Option B: Download ZIP

1. Download Flutter SDK: https://docs.flutter.dev/get-started/install/macos
2. Extract to `~/flutter`
3. Add to PATH as shown above

## Step 2: Install Android Studio

1. **Download Android Studio:**
   - Visit: https://developer.android.com/studio
   - Download macOS version
   - Install the app

2. **Install Android SDK:**
   - Open Android Studio
   - Go to: Settings → Appearance & Behavior → System Settings → Android SDK
   - Install latest SDK (API 34 recommended)

3. **Install Android Emulator:**
   - In Android Studio SDK Manager
   - Go to "SDK Tools" tab
   - Check "Android Emulator"
   - Click "Apply"

## Step 3: Configure Flutter

```bash
# Run Flutter doctor to check setup
flutter doctor

# Accept Android licenses
flutter doctor --android-licenses

# Check everything is ready
flutter doctor -v
```

### Expected Output
```
[✓] Flutter (Channel stable, 3.x.x)
[✓] Android toolchain - develop for Android devices
[✓] Chrome - develop for the web
[✓] Android Studio (version xxxx)
[✓] Connected device (1 available)
```

## Step 4: Create CallTrack Flutter App

```bash
# Navigate to project
cd ~/AI/OptionTracker/CallTrack_Prototype/flutter_app

# Create Flutter project
flutter create --platforms=android .

# Add dependencies
flutter pub add fl_chart http provider
```

## Step 5: Update pubspec.yaml

The `flutter create` command will generate `pubspec.yaml`. Update it:

```yaml
dependencies:
  flutter:
    sdk: flutter
  fl_chart: ^0.66.0      # For charting
  http: ^1.2.0           # For API calls
  provider: ^6.1.0       # For state management
```

Then run:
```bash
flutter pub get
```

## Step 6: Run the App

### On Android Emulator

```bash
# Start emulator
flutter emulators --launch <emulator_id>

# Or use Android Studio to start emulator

# Run app
flutter run
```

### On Physical Device

```bash
# Enable USB debugging on your Android phone
# Connect via USB
# Run:
flutter run
```

## Common Issues & Fixes

### Issue: "flutter: command not found"

**Fix:**
```bash
# Add to PATH
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.zshrc
source ~/.zshrc
```

### Issue: Android SDK not found

**Fix:**
```bash
# Set Android SDK path
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Issue: Licenses not accepted

**Fix:**
```bash
flutter doctor --android-licenses
# Press 'y' to accept all
```

### Issue: Emulator won't start

**Fix:**
1. Open Android Studio
2. Go to Tools → AVD Manager
3. Create new Virtual Device
4. Use recommended settings

## Alternative: Install via Homebrew

While Homebrew doesn't have an official Flutter formula, you can use:

```bash
# This will be available once Homebrew is installed
# brew install --cask flutter
```

## Verify Installation

Run this checklist:

```bash
# 1. Check Flutter
flutter --version

# 2. Check doctor
flutter doctor

# 3. List devices
flutter devices

# 4. List emulators
flutter emulators
```

## Next Steps

Once Flutter is installed:

1. **Update main.dart** (we'll create this)
2. **Add API integration**
3. **Implement fl_chart visualization**
4. **Test on device**

## Estimated Time

- Flutter SDK install: 5-10 minutes
- Android Studio install: 10-20 minutes
- Configuration: 5-10 minutes
- **Total: 20-40 minutes**

---

Need help? Check:
- Flutter docs: https://docs.flutter.dev
- Flutter Discord: https://discord.gg/flutter
- Stack Overflow: tag `flutter`
