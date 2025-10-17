# Markdown to QTI Converter - macOS App

A native macOS application to convert Markdown-formatted quizzes into QTI (Question and Test Interoperability) format.

## Install Release version of the macOS App

View [Simple_Install.md](Simple_Install.md) and follow the instructions to intall the release versionof the app.

## Installation for Development

1. Install dependencies:
```bash
   npm install
```

2. Run the app:
```bash
   npm run start
```

## Building the macOS App

To create a distributable macOS application:
```bash
npm run dist:unsigned
```

This will create a DMG file in the `dist/` folder that you can distribute to users.

For advanced installation options and signing the application view [INSTALLATION_INSTRUCTIONS.md](INSTALLATION_INSTRUCTIONS.md).

## Usage

1. Open the app
2. Paste your Markdown quiz content
3. Click "Convert to QTI"
4. Download your QTI zip file

## Supported Question Types

- Multiple Choice
- True/False
- Multiple Answers
- Fill in the Blank
- Fill in Multiple Blanks
- Calculated
- Matching
- Numerical
- Essay
- File Upload
- Text Only

Visit [infomation.md](public/information.md) to know more information.

No technical knowledge required to use the applicaion!
