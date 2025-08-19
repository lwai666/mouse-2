# Firmware Update Backend Server

A Node.js backend server that handles firmware update package uploads and stores metadata in SQLite database.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

### Upload Update Package

**Endpoint:** `POST /api/upload-update-package`

**Request Body (multipart/form-data):**
- `version` (string): Version number of the firmware update
- `description` (string): Description of the update
- `file1` (file): SPI firmware file
- `file2` (file): USB firmware file

**Response:**
```json
{
  "message": "Update package uploaded successfully",
  "id": 1,
  "version": "1.0.0",
  "description": "Initial firmware release",
  "spiFilePath": "uploads/file1-1234567890",
  "usbFilePath": "uploads/file2-1234567890"
}
```

## File Storage

Uploaded files are stored in the `uploads/` directory with unique filenames. The file paths are stored in the SQLite database along with the version and description information.

## Database

The server uses SQLite3 for data storage. The database file `firmware.db` will be created automatically when the server starts. It contains a single table `firmware_updates` with the following schema:

- `id`: Auto-incrementing primary key
- `version`: Version number of the firmware update
- `description`: Description of the update
- `spi_file_path`: Path to the uploaded SPI firmware file
- `usb_file_path`: Path to the uploaded USB firmware file
- `upload_date`: Timestamp of when the update was uploaded
