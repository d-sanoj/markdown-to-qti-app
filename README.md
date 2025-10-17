# Markdown to QTI Converter - macOS App

A native macOS application to convert Markdown-formatted quizzes into QTI (Question and Test Interoperability) format.

## Installation for Development

1. Install dependencies:
```bash
   npm install
```

2. Run the app:
```bash
   npm start
```

## Building the macOS App

To create a distributable macOS application:
```bash
npm run build:mac
```

This will create a DMG file in the `dist/` folder that you can distribute to users.

## Usage

1. Open the app
2. Paste your Markdown quiz content
3. Click "Convert"
4. Download your QTI zip file

## Supported Question Types

- Multiple Choice
- True/False
- Multiple Answers
- Fill in the Blank
- Fill in Multiple Blanks
- Multiple Dropdowns
- Matching
- Numerical
- Essay
- File Upload
- Text Only

## Distribution

After building, share the DMG file from the `dist/` folder. Users can:
1. Download the DMG
2. Drag the app to Applications
3. Double-click to run

No technical knowledge required!