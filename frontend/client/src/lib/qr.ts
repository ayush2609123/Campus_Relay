import QRCode from "qrcode";
export async function toQRDataURL(text: string) {
  return QRCode.toDataURL(text, { margin: 1, scale: 6 });
}
