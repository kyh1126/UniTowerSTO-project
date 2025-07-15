import { writable } from 'svelte/store';

export const contractStore = writable(null);
export const accountStore = writable('');
export const contractReadyStore = writable(false); 