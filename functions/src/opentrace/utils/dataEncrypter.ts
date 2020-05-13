import getEncryptionKey from "./getEncryptionKey";
import CustomEncrypter from './CustomEncrypter';


/**
 * encrypt data with fixed iv - that mean not change result every encrypt
 * @param data
 * iv - 16
 */
export async function encryptData(data: any) {
  const encryptionKey = await getEncryptionKey();
  const customEncrypter = new CustomEncrypter(encryptionKey);
  const payload = Buffer.from(JSON.stringify(data));
  const payloadData = customEncrypter.encryptAndEncode(payload, 16, 16, false);
  return payloadData.toString('base64');
}

/**
 * decrypt data 
 * @param data
 */
export async function decryptData(dataEncrypt: string) {
  const encryptionKey = await getEncryptionKey();
  const customEncrypter = new CustomEncrypter(encryptionKey);
  const payloadData = Buffer.from(dataEncrypt, 'base64');
  const decryptedData = customEncrypter.decodeAndDecrypt(payloadData, [payloadData.length - 32, 16, 16]);
  return JSON.parse(Buffer.from(decryptedData, 'base64').toString());
}

