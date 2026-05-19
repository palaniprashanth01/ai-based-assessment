# AI Based Assessment

An advanced AI-powered web application built with Gradio that automates the generation of assessments and knowledge graphs from PDF documents.

## Features

- **Automated MCQ Generation**: Extracts text from PDF files, summarizes the content using `facebook/bart-large-cnn`, and automatically generates Multiple Choice Questions (MCQs).
- **Bloom's Taxonomy Support**: Adjusts the generated questions according to different cognitive levels of Bloom's Taxonomy (Remembering, Understanding, Applying, Analyzing).
- **Knowledge Graph Extraction**: Extracts named entities and their relationships from the text using spaCy and visualizes them as a Knowledge Graph using NetworkX and Matplotlib.
- **OCR Support**: Falls back to Tesseract OCR when direct text extraction fails, ensuring compatibility with scanned PDFs.
- **Multilingual Support**: Integrates `deep-translator` and dynamic font downloading (Noto Sans) to support rendering and translating different scripts and languages.

## Installation

### Prerequisites
- Python 3.8+
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
- [Poppler](https://poppler.freedesktop.org/)

**For macOS (using Homebrew):**
```bash
brew install tesseract poppler
```

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/ai-based-assessment.git
cd ai-based-assessment
```

2. **Create and activate a virtual environment:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. **Install the dependencies:**
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

## Usage

Run the Gradio application:

```bash
python ai_basesd_assessment.py
```

Open the provided local URL (typically `http://127.0.0.1:7860`) in your web browser to interact with the application. Upload a PDF to get started!

## How It Works

1. **Text Extraction**: The app reads the PDF using PyMuPDF (`fitz`). If it encounters images or scanned text, it uses `pdf2image` and `pytesseract` to extract the content.
2. **Summarization**: The extracted text is truncated and summarized using a Seq2Seq transformer model (`facebook/bart-large-cnn`).
3. **Keyword Extraction**: Uses RAKE and spaCy to find important keywords and concepts.
4. **Distractor Generation**: Dynamically creates plausible incorrect answers for MCQs based on the context and topic theme (computing, motivational, leadership).
5. **Knowledge Graph**: spaCy's Dependency Parser identifies subject-verb-object structures to map relationships between extracted named entities.
