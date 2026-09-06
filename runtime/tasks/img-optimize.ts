import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

//node runtime/cli.ts run img-optimize data/assets/img/ryan-gosling-drive.jpg data/assets/img/ryan-gosling-drive.webp

export const run = async (ctx) => {
  const [inputPath, outputPath] = ctx.args

  if (!inputPath || !outputPath) {
    ctx.log('usage: img-optimize <input> <output>')
    return
  }

  const ext = path.extname(outputPath).toLowerCase()

  const image = sharp(inputPath)

  if (ext === '.jpg' || ext === '.jpeg') {
    await image.jpeg({ quality: 80 }).toFile(outputPath)
  } else if (ext === '.png') {
    await image.png({ compressionLevel: 9 }).toFile(outputPath)
  } else if (ext === '.webp') {
    await image.webp({ quality: 80 }).toFile(outputPath)
  } else {
    ctx.log(`unsupported format: ${ext}`)
    return
  }

  const inputSize = (await fs.stat(inputPath)).size
  const outputSize = (await fs.stat(outputPath)).size
  const saved = (((inputSize - outputSize) / inputSize) * 100).toFixed(1)

  ctx.log(`${inputPath} → ${outputPath}`)
  ctx.log(
    `${(inputSize / 1024).toFixed(1)}kb → ${(outputSize / 1024).toFixed(1)}kb (saved ${saved}%)`,
  )
}
