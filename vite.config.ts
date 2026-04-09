import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import type { Plugin } from 'vite';

// ── MJML email template compiler ─────────────────────────────────────────────
// Watches supabase/email-templates/*.mjml, compiles to supabase/templates/*.html
// on every save in dev and on every build. Output is committed so config.toml
// always has files to reference without needing a separate build step.
function emailTemplates(): Plugin {
	const inputDir = 'supabase/email-templates';
	const outputDir = 'supabase/templates';

	async function compile(filePath: string): Promise<void> {
		if (!filePath.endsWith('.mjml')) return;
		const { default: mjml2html } = await import('mjml');
		const source = readFileSync(filePath, 'utf-8');
		const { html, errors } = mjml2html(source, { validationLevel: 'strict' });
		if (errors.length) {
			console.error(
				`[mjml] errors in ${filePath}:\n` + errors.map((e) => e.formattedMessage).join('\n')
			);
			return;
		}
		mkdirSync(outputDir, { recursive: true });
		const outPath = join(outputDir, basename(filePath, '.mjml') + '.html');
		writeFileSync(outPath, html);
		console.log(`[mjml] ${basename(filePath)} → ${outPath}`);
	}

	async function compileAll(): Promise<void> {
		try {
			const files = readdirSync(inputDir).filter((f) => f.endsWith('.mjml'));
			await Promise.all(files.map((f) => compile(join(inputDir, f))));
		} catch {
			// inputDir may not exist yet on first run
		}
	}

	return {
		name: 'email-templates',
		buildStart: compileAll,
		configureServer(server) {
			server.watcher.add(`${inputDir}/**/*.mjml`);
			server.watcher.on('change', compile);
			server.watcher.on('add', compile);
		},
	};
}

export default defineConfig({
	plugins: [emailTemplates(), tailwindcss(), sveltekit()],
	resolve: {
		alias: {
			$content: fileURLToPath(new URL('./content', import.meta.url)),
		},
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					setupFiles: ['src/lib/tests/setup.ts'],
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
				},
			},
		],
	},
});
