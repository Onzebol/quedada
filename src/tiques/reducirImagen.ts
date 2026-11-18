const LADO_MAXIMO = 1600
const CALIDAD = 0.8

/** Tamaño que queda al reducir una imagen para que su lado mayor no pase de `maximo`, sin deformarla. */
export function tamanoReducido(ancho: number, alto: number, maximo: number) {
  const escala = Math.min(1, maximo / Math.max(ancho, alto))
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) }
}

/**
 * Reduce una foto a JPEG de como mucho 1600 px de lado (un tique de móvil pasa de varios MB a unos
 * 300 KB y sigue leyéndose). Respeta la orientación EXIF. Necesita el navegador (lienzo), por eso
 * los tests de la interfaz la sustituyen.
 */
export async function reducirImagen(archivo: Blob): Promise<Blob> {
  const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  try {
    const { ancho, alto } = tamanoReducido(mapa.width, mapa.height, LADO_MAXIMO)
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const contexto = lienzo.getContext('2d')
    if (!contexto) throw new Error('No se pudo preparar la imagen')
    contexto.fillStyle = '#fff'
    contexto.fillRect(0, 0, ancho, alto)
    contexto.drawImage(mapa, 0, 0, ancho, alto)
    return await new Promise<Blob>((resolver, rechazar) =>
      lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error('No se pudo preparar la imagen'))), 'image/jpeg', CALIDAD),
    )
  } finally {
    mapa.close()
  }
}
