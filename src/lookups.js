import { api } from './api';

// Reference lists change rarely: fetch once per page load and share.
let countiesPromise = null;

export function getCounties() {
  countiesPromise ??= api('/counties').catch((e) => {
    countiesPromise = null; // allow a retry after a network error
    throw e;
  });
  return countiesPromise;
}
