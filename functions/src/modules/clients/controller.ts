import * as _ from 'lodash';

import { generateClient, allClient } from './service';

export async function postCreateClient(req: any, res: any) {
  const client = await generateClient();
  res.send(client);
}

export async function getAllClient(req: any, res: any) {
  const clients = await allClient();
  res.send({ clients });
}

