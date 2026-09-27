import { fetch } from 'expo/fetch';
export const request = (url: string, init: RequestInit) => fetch(url, init);
