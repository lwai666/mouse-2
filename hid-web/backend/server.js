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

    // 检查是否至少上传了一个文件
    if (!files.file1 && !files.file2) {
      return res.status(400).json({ error: 'At least one file (SPI or USB) is required ' })
    }

    const spiFile = files.file1 ? files.file1[0] : null
    const usbFile = files.file2 ? files.file2[0] : null

    // 查询最新的一条记录
    const checkSql = `SELECT * FROM firmware_updates ORDER BY id DESC LIMIT 1`

    db.get(checkSql, [], (err, row) => {
      if (err) {
        console.error('Database error:', err)
        return res.status(500).json({ error: 'Failed to check existing record' })
      }

      if (row) {
        // 记录已存在，执行 UPDATE（只更新传了的字段）
        const updateFields = []
        const updateValues = []

        // 只更新传了的字段
        if (version !== undefined) {
          updateFields.push('version = ?')
          updateValues.push(version)
        }
        if (description !== undefined) {
          updateFields.push('description = ?')
          updateValues.push(description)
        }
        if (productId !== undefined) {
          updateFields.push('productId = ?')
          updateValues.push(productId)
        }
        if (vendorId !== undefined) {
          updateFields.push('vendorId = ?')
          updateValues.push(vendorId)
        }
        if (productName !== undefined) {
          updateFields.push('productName = ?')
          updateValues.push(productName)
        }

        // 只更新传了的文件字段
        if (spiFile) {
          updateFields.push('spi_file_path = ?')
          updateValues.push(spiFile.path)
        }
        if (usbFile) {
          updateFields.push('usb_file_path = ?')
          updateValues.push(usbFile.path)
        }

        updateValues.push(row.id) // WHERE id = ?

        const updateSql = `UPDATE firmware_updates SET ${updateFields.join(', ')} WHERE id = ?`

        db.run(updateSql, updateValues, (err) => {
          if (err) {
            console.error('Database error:', err)
            return res.status(500).json({ error: 'Failed to update record' })
          }

          res.json({
            message: 'Update package updated successfully',
            id: row.id,
            version: version !== undefined ? version : row.version,
            description: description !== undefined ? description : row.description,
            productId: productId !== undefined ? productId : row.productId,
            vendorId: vendorId !== undefined ? vendorId : row.vendorId,
            productName: productName !== undefined ? productName : row.productName,
            spiFilePath: spiFile ? spiFile.path : row.spi_file_path,
            usbFilePath: usbFile ? usbFile.path : row.usb_file_path,
          })
        })
      }
      else {
        // 没有记录，执行 INSERT
        const fields = []
        const values = []
        const placeholders = []

        // 只插入传了的字段
        if (version) {
          fields.push('version')
          values.push(version)
          placeholders.push('?')
        }
        if (description) {
          fields.push('description')
          values.push(description)
          placeholders.push('?')
        }
        if (productId) {
          fields.push('productId')
          values.push(productId)
          placeholders.push('?')
        }
        if (vendorId) {
          fields.push('vendorId')
          values.push(vendorId)
          placeholders.push('?')
        }
        if (productName) {
          fields.push('productName')
          values.push(productName)
          placeholders.push('?')
        }

        if (spiFile) {
          fields.push('spi_file_path')
          values.push(spiFile.path)
          placeholders.push('?')
        }

        if (usbFile) {
          fields.push('usb_file_path')
          values.push(usbFile.path)
          placeholders.push('?')
        }

        const insertSql = `INSERT INTO firmware_updates (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`

        db.run(insertSql, values, function (err) {
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
            spiFilePath: spiFile ? spiFile.path : null,
            usbFilePath: usbFile ? usbFile.path : null,
          })
        })
      }
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
