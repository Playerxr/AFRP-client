import axios from 'axios';
import { CacheType } from '../actions/loaderActions';
import { StaffConfig } from '../features/staffConfig';

export const DistributionService = {
  async get() {
    // URL modifiable depuis l'Espace Staff (sinon valeur du .env)
    const url = await StaffConfig.getDistributionUrl();
    const response = await axios
      .get<DistributionResponseType>(url)
      .then(res => res.data);
    return response;
  },
};

type DistributionResponseType = DistributionResponse & {
  cache: CacheType[];
};

export type DistributionResponse = {
  cdnLauncher: string;
  cdnCache: string;
  cacheMode: CacheType[];
  rss: string;
  versionHash: string;
  packageName: string;
  projectName: string;
  servers: ServerType[];
  launcher: LauncherType;
  filesContinue: FileContinueType;
};

type FileContinueType = string[];

type LauncherType = {
  appVersion: string;
  name: string;
  hash: string;
  bytes: number;
  size: string;
};

type EventType = {
  title: string;
  style: 'red' | 'blue';
};

export type ServerType = {
  id: number;
  show: boolean;
  version: string;
  icon: string;
  events: EventType[];
  slot: number;
  bonus: boolean;
  name: string;
  description: string;
  address: string;
  sampVersion: string;
};
