import type { Area } from 'react-easy-crop'

const OUTPUT_SIZE = 512

export async function cropToBlob(imageUrl: string, area: Area) {
  const image = new Image()
  image.src = imageUrl
  await image.decode()

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')

  // JPEG has no transparency, and transparent areas would otherwise turn black.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not read the image'))),
      'image/jpeg',
      0.9,
    )
  })
}
