#!/bin/bash

# Set JAVA_HOME to Android Studio's bundled JDK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Verify Java is available
if [ ! -d "$JAVA_HOME" ]; then
    echo "Error: Android Studio JDK not found at $JAVA_HOME"
    echo "Please ensure Android Studio is installed."
    exit 1
fi

# Navigate to mobile app directory
cd apps/mobile

# Run expo android
bun expo run:android