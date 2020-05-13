import * as _ from 'lodash';

import { showUploadedData } from '../../opentrace/processUploadedData';
import { generateUploadCode, listUploadCodes } from '../../opentrace/uploadCode';

/**
 * generate upload code - random the code and use for a short time
 */
export async function postGenerateUploadCode(req: any, res: any) {
  const codeInfo = await generateUploadCode();
  res.send(codeInfo);
}

/**
 * get list upload codes
 */
export async function getListUploadCodes(req: any, res: any) {
  const codes = await listUploadCodes();
  res.send({ codes });
}

/**
 * decrypt data upload
 * @param filePath - path file in storage
 */
export async function decryptCodeDataUpload(req: any, res: any) {
  const { filePath } = req.query || {};
  if(!filePath){
    res.status(400).send({message: 'filePath is require'});
    return;
  }
  
  const response = await showUploadedData(filePath, false);
  res.send(response);
}
