import { writable } from "svelte/store";

export const ERROR_MESSAGES = {
	default: "Oops, something went wrong or need login.",
	authOnly: "Please sign in to continue using the chat service.",
	rateLimited: "You are sending too many messages. Try again later.",
};

export const error = writable<string | null>(null);
