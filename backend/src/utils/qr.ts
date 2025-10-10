import QRCode from 'qrcode';

export async function generateQRDataURL(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
    width: 256,
  });
}