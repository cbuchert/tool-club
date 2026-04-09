/**
 * Suggestions E2E tests.
 *
 * Covers TODO §13:
 *   - Suggestions: vote toggle
 *   - Suggestions: propose → appears in list
 *
 * Uses `memberPage` fixture from fixtures.ts — a page pre-authenticated as
 * the test member (Jordan Park) via saved storage state from auth.setup.ts.
 */
import { test, expect } from './fixtures';
import { adminClient, ADMIN_ID, MEMBER_ID } from './helpers';

// ── Vote toggle ───────────────────────────────────────────────────────────────

test.describe('vote toggle', () => {
	let suggestionId: string;

	test.beforeAll(async () => {
		const { data } = await adminClient()
			.from('suggestions')
			.insert({
				author_id: ADMIN_ID,
				title: '[test] Vote toggle suggestion',
				body_md: 'A test suggestion for vote toggle E2E.',
				status: 'open',
			})
			.select('id')
			.single();
		if (!data) throw new Error('Failed to create test suggestion');
		suggestionId = data.id;
	});

	test.afterAll(async () => {
		// Delete any residual vote then the suggestion
		await adminClient().from('votes').delete().eq('suggestion_id', suggestionId);
		await adminClient().from('suggestions').delete().eq('id', suggestionId);
	});

	test('voting increments count; voting again decrements it', async ({ memberPage }) => {
		await memberPage.goto(`/suggestions/${suggestionId}`);

		const voteCount = memberPage.getByTestId('vote-count');
		const voteBtn = memberPage.getByRole('button', { name: 'Vote' });

		// Initial state: 0 votes, button label "Vote"
		await expect(voteCount).toHaveText('0');
		await expect(voteBtn).toBeVisible();

		// Cast vote → count becomes 1, button label becomes "Remove vote"
		await voteBtn.click();
		await expect(voteCount).toHaveText('1');
		await expect(memberPage.getByRole('button', { name: 'Remove vote' })).toBeVisible();

		// Remove vote → count returns to 0, button label returns to "Vote"
		await memberPage.getByRole('button', { name: 'Remove vote' }).click();
		await expect(voteCount).toHaveText('0');
		await expect(memberPage.getByRole('button', { name: 'Vote' })).toBeVisible();
	});
});

// ── Propose → appears in list ─────────────────────────────────────────────────

test.describe('proposal submission', () => {
	const title = `[test] E2E proposal ${Date.now()}`;
	let createdId: string | null = null;

	test.afterAll(async () => {
		if (createdId) {
			await adminClient().from('comments').delete().eq('suggestion_id', createdId);
			await adminClient().from('votes').delete().eq('suggestion_id', createdId);
			await adminClient().from('suggestions').delete().eq('id', createdId);
		}
	});

	test('submitting the proposal form redirects to the new suggestion and it appears in the list', async ({
		memberPage,
	}) => {
		await memberPage.goto('/suggestions/new');

		// getByPlaceholder avoids the label <span>-children issue with getByLabel
		await memberPage.getByPlaceholder('e.g. Foundry tour at Provo Iron Works').fill(title);
		await memberPage
			.getByPlaceholder("What's the idea?", { exact: false })
			.fill('E2E test proposal body. Enough detail to pass validation.');
		await memberPage.getByRole('button', { name: 'Submit proposal' }).click();

		// After submit, redirected to the new suggestion's detail page
		await expect(memberPage).toHaveURL(/\/suggestions\/[a-f0-9-]+$/);
		createdId = memberPage.url().split('/').pop() ?? null;

		// The suggestion title is shown on the detail page
		await expect(memberPage.getByRole('heading', { level: 1 })).toHaveText(title);

		// Navigate to the list — the new suggestion appears at the top (newest first)
		await memberPage.goto('/suggestions');
		await expect(memberPage.getByText(title)).toBeVisible();
	});
});
