import jsPDF from 'jspdf'

// Photos of book pages, one page per image, packed into a single PDF client-side
// so the rest of the app (upload, storage rules, reading, annotation) never has
// to know the source wasn't a PDF to begin with.
//
// Phone photos routinely run 3000-4000px on the long edge and several MB each —
// several of those would blow well past the 50 MB upload cap. Every image is
// downscaled to MAX_DIMENSION_PX and re-encoded as JPEG before it goes on a page,
// which also keeps the resulting PDF fast for pdf.js to render.
const MAX_DIMENSION_PX = 2000
const JPEG_QUALITY = 0.85

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// Safari can decode HEIC/HEIF in an <img> tag; Chrome and Firefox cannot without
// a decoder library. We accept the file and let the per-image decode fail with a
// clear message naming the file, rather than silently rejecting it everywhere.
export const HEIC_TYPES = ['image/heic', 'image/heif']

export function isImageFile(file: File): boolean {
  if (SUPPORTED_IMAGE_TYPES.includes(file.type) || HEIC_TYPES.includes(file.type)) return true
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(
        /\.(heic|heif)$/i.test(file.name) || HEIC_TYPES.includes(file.type)
          ? `"${file.name}" is a HEIC photo, which this browser can't open. On iPhone, share it as JPEG (or turn on Settings → Camera → Formats → Most Compatible), or convert it before uploading.`
          : `"${file.name}" could not be opened as an image.`,
      ))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function drawToJpeg(img: HTMLImageElement): { dataUrl: string; width: number; height: number } {
  const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.round(img.naturalWidth * scale)
  const height = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser.')
  ctx.drawImage(img, 0, 0, width, height)

  return { dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY), width, height }
}

// Converts one or more photos (selection order preserved by the caller) into a
// single multi-page PDF File, ready to hand to the existing upload pipeline.
export async function convertImagesToPdf(files: File[], pdfFileName: string): Promise<File> {
  if (files.length === 0) throw new Error('No images to convert.')

  let doc: jsPDF | null = null
  for (const file of files) {
    const img = await loadImage(file)
    const { dataUrl, width, height } = drawToJpeg(img)
    if (!doc) {
      doc = new jsPDF({ unit: 'px', format: [width, height] })
    } else {
      doc.addPage([width, height])
    }
    doc.addImage(dataUrl, 'JPEG', 0, 0, width, height)
  }

  const blob = doc!.output('blob')
  return new File([blob], pdfFileName, { type: 'application/pdf' })
}
