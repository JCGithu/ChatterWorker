// `wrangler dev src/index.ts`

import { Router, error, createCors, json } from 'itty-router';
import { ApiClient } from '@twurple/api';
import { AppTokenAuthProvider } from '@twurple/auth';

export interface Env {
	CLIENT_SECRET: string,
	CLIENT_ID: string
}
type upload = Record<string, Record<string, string>>

const { preflight, corsify } = createCors({
	origins: ['https://localhost:5173', 'http://localhost:5173', 'https://colloquial.studio', 'https://hootbeta.netlify.app', 'https://beta--hootbeta.netlify.app'],
});
const router = Router();

router.all('*', preflight);

function route(request: Request, env: Env) {
	router.get('/c/:id', async (data) => {
		if (!data.params.id) return error(404, 'No ID');
		let id = data.params.id;
		const authProvider = new AppTokenAuthProvider(env.CLIENT_ID, env.CLIENT_SECRET);
		const apiClient = new ApiClient({ authProvider });
		const userID = await apiClient.users.getUserByName(id);
		if (!userID) return error(404);
		let badgeData = await apiClient.chat.getChannelBadges(userID.id);
		let globalBadges = await apiClient.chat.getGlobalBadges();
		if (!badgeData) return error(404);
		badgeData = badgeData.concat(globalBadges);
		let upload: upload = {
			userID: {
				id: userID.id
			}
		};
		badgeData.forEach(b => {
			if (!upload[b.id]) upload[b.id] = {};
			b.versions.forEach(v => {
				upload[b.id][v.id] = v.getImageUrl(4);
			});
		});
		return upload;
	})
	return router.handle(request, env).then(json).catch(error).then(corsify);
}

const handler = {
	async fetch(request: Request, env: Env) {
		try {
			const result = await route(request, env);
			return result
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