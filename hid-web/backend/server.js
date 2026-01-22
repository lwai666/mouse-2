const path = require('node:path')
const cors = require('cors')
const express = require('express')
const multer = require('multer')
const db = require('./database')

const app = express()
const port = process.env.PORT || 3010

// Enable CORS
app.use(cors())

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage })

// Create uploads directory if it doesn't exist
const fs = require('node:fs')

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

// Get latest firmware version
app.get('/api/latest-version', (req, res) => {
  const sql = `
    SELECT id, version, description, spi_file_path, usb_file_path, upload_date
    FROM firmware_updates
    ORDER BY upload_date DESC
    LIMIT 1
  `

  db.get(sql, [], (err, row) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({ error: 'Failed to fetch latest version' })
    }

    if (!row) {
      return res.status(404).json({ error: 'No firmware versions found' })
    }

    res.json({
      id: row.id,
      version: row.version,
      description: row.description,
      spiFilePath: row.spi_file_path,
      usbFilePath: row.usb_file_path,
      uploadDate: row.upload_date,
    })
  })
})

// Upload endpoint
app.post('/api/upload-update-package', upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 },
]), async (req, res) => {
  try {
    const { version, description, productId, vendorId, productName } = req.body
    const files = req.files

    if (!files.file1 || !files.file2) {
      return res.status(400).json({ error: 'Both SPI and USB files are required' })
    }

    const spiFile = files.file1[0]
    const usbFile = files.file2[0]

    // Insert record into database
    const sql = `INSERT INTO firmware_updates
        (version, description, spi_file_path, usb_file_path)
        VALUES (?, ?, ?, ?)`

    db.run(sql, [
      version,
      description,
      productId,
      vendorId,
      productName,
      spiFile.path,
      usbFile.path,
    ], function (err) {
      if (err) {
        console.error('Database error:', err)
        return res.status(500).json({ error: 'Failed to save update package info' })
      }

      res.json({
        message: 'Update package uploaded successfully',
        id: this.lastID,
        version,
        description,
        productId,
        vendorId,
        productName,
        spiFilePath: spiFile.path,
        usbFilePath: usbFile.path,
      })
    })
  }
  catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Failed to process upload' })
  }
})

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'))
// app.use('/', express.static('dist'))
app.use(
  '/',
  express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y', // 缓存静态资源 1 年（适用于 hash 文件）
    setHeaders: (res, filePath) => {
      // 不缓存 HTML（确保 index.html 总是请求最新）
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      }
    },
  }),
)

// Start server
app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`)
})
