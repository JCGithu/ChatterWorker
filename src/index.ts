/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler deploy src/index.ts --name my-worker` to deploy your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Router, error } from 'itty-router';
import { ApiClient } from '@twurple/api';
import { AppTokenAuthProvider } from '@twurple/auth';

export interface Env {
	CLIENT_SECRET: string,
	CLIENT_ID: string
}
type upload = Record<string, Record<string, string>>

const router = Router();

function route(request: Request, env: Env) {
	router.get('/c/:id', async (data) => {
		if (!data.params.id) return error(404, 'No ID');
		let id = data.params.id;
		const authProvider = new AppTokenAuthProvider(env.CLIENT_ID, env.CLIENT_SECRET);
		const apiClient = new ApiClient({ authProvider });
		const userID = await apiClient.users.getUserByName(id);
		if (!userID) return error(404);
		const badgeData = await apiClient.chat.getChannelBadges(userID.id);
		if (!badgeData) return error(404);
		let upload: upload = {
			userID: {
				id: userID.id
			}
		};
		badgeData.forEach(b => {
			b.versions.forEach(v => {
				upload[b.id][v.id] = v.getImageUrl(4)
			});
		});
		return upload;
	})
	return router.handle(request, env);
}

const handler = {
	async fetch(request: Request, env: Env) {
		try {
			const result = await route(request, env);
			console.log(result)
			return new Response(JSON.stringify(result), { status: 200 });
		} catch (error) {
			console.error(error);
			if (error instanceof Response) {
				return error
			} else {
				return new Response(String(error) || 'Error', {
					status: 500,
				})
			}
		}
	},
}

export default handler;