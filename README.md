# AI Document Summarizer API 🧠

## Overview
This project is an AI-powered document summarization and metadata extraction service built with NestJS and TypeScript. It allows users to upload various document types (PDF, DOCX, TXT) and leverages OpenAI's GPT models to generate concise summaries and extract key information like title, keywords, language, domain, and sentiment.

## Features
- **Document Processing**: Efficiently extracts text from PDF, DOCX, and TXT files.
- **AI Summarization**: Integrates with OpenAI to provide AI-generated summaries of uploaded documents.
- **Metadata Extraction**: Automatically identifies and extracts crucial metadata such as document title, keywords, language, domain, and sentiment.
- **Robust API**: Built with NestJS, offering a scalable and maintainable backend architecture.
- **File Validation**: Includes comprehensive validation for file types and sizes to ensure secure and efficient processing.
- **Swagger Documentation**: Automatically generated API documentation for easy interaction and understanding.

## Getting Started

### Installation
To get this project up and running on your local machine, follow these steps:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/github_name/AI-Document-Summarization-Metadata-Extraction-Workflow.git
    cd AI-Document-Summarization-Metadata-Extraction-Workflow
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

### Environment Variables
Before running the application, you need to configure the following environment variable:

-   `OPENAI_API_KEY`: Your API key for accessing OpenAI services.

    **Example:**
    ```
    OPENAI_API_KEY=sk-your_openai_api_key_here
    ```
    Create a `.env` file in the root directory of the project and add this variable.

### Running the Application

1.  **Start in Development Mode**:
    ```bash
    npm run start:dev
    ```
    The application will run in watch mode, restarting on code changes.

2.  **Start in Production Mode**:
    ```bash
    npm run start:prod
    ```

The API will be accessible at `http://localhost:3000/api`.
The interactive API documentation (Swagger UI) will be available at `http://localhost:3000/api/docs`.

## Usage
Once the server is running, you can interact with the API to summarize documents.

To summarize a document:
1.  **Open Swagger UI**: Navigate to `http://localhost:3000/api/docs` in your browser.
2.  **Locate the `POST /documents/summarize` endpoint**: Expand it.
3.  **Try it out**: Click the "Try it out" button.
4.  **Upload File**: Select a PDF, DOCX, or TXT file from your local machine.
5.  **Optional Parameters**: Provide `desiredLength` (e.g., 'short', 'medium', 'long') and `maxKeywords` (a number between 1 and 10) if you wish to customize the summary.
6.  **Execute**: Click "Execute" to send the request.

The API will respond with a JSON object containing the summary and extracted metadata.

Alternatively, you can use a tool like `curl` or Postman to send a `multipart/form-data` request:

```bash
curl -X POST "http://localhost:3000/api/documents/summarize" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/document.pdf;type=application/pdf" \
  -F "desiredLength=medium" \
  -F "maxKeywords=5"
```

## API Documentation

### Base URL
`http://localhost:3000/api`

### Endpoints

#### POST /documents/summarize
This endpoint allows you to upload a document (PDF, DOCX, or TXT) to generate an AI-powered summary and extract relevant metadata.

**Request**:
`Content-Type: multipart/form-data`

| Field          | Type           | Description                                                                     | Required | Example                                    |
| :------------- | :------------- | :------------------------------------------------------------------------------ | :------- | :----------------------------------------- |
| `file`         | `binary`       | The document file (PDF, DOCX, or TXT) to be summarized. Max size: 10MB.         | `true`   | `(binary file data)`                       |
| `desiredLength`| `string`       | Optional. The desired length of the summary.                                    | `false`  | `"short"`, `"medium"`, `"long"`            |
| `maxKeywords`  | `number`       | Optional. The maximum number of keywords to extract (between 1 and 10).         | `false`  | `5`                                        |

**Response**:
`Content-Type: application/json`
```json
{
  "summary": "This is a concise summary of the uploaded document, highlighting its main points and key takeaways.",
  "title": "Document Title Example",
  "keywords": ["AI", "Summarization", "NestJS", "OpenAI", "Documents"],
  "language": "en",
  "domain": "Technology",
  "sentiment": "neutral"
}
```

**Errors**:
-   `400 Bad Request`:
    -   `Unsupported file type. Only PDF, DOCX, or TXT are allowed.`
    -   `File is required`
-   `500 Internal Server Error`:
    -   `Missing OPENAI_API_KEY — AI engine cannot run.`
    -   `Failed to extract text: [error_message]` (e.g., `PDF is corrupt or unreadable.`)
    -   `The uploaded document contains no readable or valid text.`
    -   `AI summarization request failed. Try again later.`
    -   `AI returned an empty or invalid response.`
    -   `AI returned malformed JSON. Try a shorter or clearer document.`
    -   `AI response missing required field: [field_name]` (e.g., `AI response missing required field: title`)

## Technologies Used

| Technology | Category         | Description                                                          | Link                                                       |
| :--------- | :--------------- | :------------------------------------------------------------------- | :--------------------------------------------------------- |
| **NestJS** | Backend Framework| A progressive Node.js framework for building efficient, reliable, and scalable server-side applications.| [https://nestjs.com/](https://nestjs.com/)                 |
| **TypeScript**| Language         | A strongly typed superset of JavaScript that compiles to plain JavaScript. | [https://www.typescriptlang.org/](https://www.typescriptlang.org/) |
| **Node.js**| Runtime          | A JavaScript runtime built on Chrome's V8 JavaScript engine.         | [https://nodejs.org/](https://nodejs.org/)                 |
| **OpenAI API**| AI Integration   | Provides access to advanced AI models for tasks like summarization and text generation. | [https://openai.com/](https://openai.com/)                 |
| **Multer** | File Upload      | Middleware for handling `multipart/form-data`, primarily used for uploading files. | [https://github.com/expressjs/multer](https://github.com/expressjs/multer) |
| **pdf-parse**| PDF Parsing      | A utility to extract text from PDF files.                            | [https://www.npmjs.com/package/pdf-parse](https://www.npmjs.com/package/pdf-parse) |
| **Swagger**| API Documentation| Tools for designing, building, documenting, and consuming REST APIs. | [https://swagger.io/](https://swagger.io/)                 |
| **ESLint** | Linter           | Pluggable JavaScript linter that helps ensure consistent code style and identify errors. | [https://eslint.org/](https://eslint.org/)                 |
| **Prettier**| Code Formatter   | An opinionated code formatter that enforces a consistent style.      | [https://prettier.io/](https://prettier.io/)               |
| **Jest**   | Testing Framework| A delightful JavaScript testing framework with a focus on simplicity. | [https://jestjs.io/](https://jestjs.io/)                   |

## Contributing
Contributions are welcome! If you have suggestions for improvements or new features, please follow these steps:

✨ Fork the repository.
🛠️ Create a new branch for your feature or bug fix.
💡 Implement your changes and write tests if applicable.
✅ Ensure all tests pass and lint checks are clear.
⬆️ Commit your changes with a descriptive message.
🚀 Open a pull request against the `main` branch.

Please make sure your code adheres to the project's coding standards.

## License
This project is currently UNLICENSED, as specified in the `package.json` file. Feel free to use and modify it for personal or educational purposes.

## Author Info
**Your Name**
*   LinkedIn: [Your LinkedIn Profile](https://linkedin.com/in/your_username)
*   Twitter: [@your_twitter_handle](https://twitter.com/your_twitter_handle)
*   Portfolio: [Your Portfolio Link](https://your-portfolio.com)

---

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)