import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ api: vi.fn() }));

import { api } from './api';
import { auth } from './auth';
import { discard, flush, outbox, send } from './outbox';

const offline = () => Object.assign(new Error('Can’t reach the server.'), { status: 0 });
const refused = (message) => Object.assign(new Error(message), { status: 422 });

beforeEach(() => {
  outbox.items = [];
  outbox.online = true;
  auth.token = 'token';
  auth.user = { id: 'me' };
  api.mockReset();
});

describe('saving with and without signal', () => {
  it('saves straight away when there is signal', async () => {
    api.mockResolvedValue({ saved: 1 });
    const res = await send('/holdings/f1/milk/session', { body: { a: 1 }, kind: 'milk', label: 'Morning' });

    expect(res).toEqual({ data: { saved: 1 } });
    expect(outbox.items).toHaveLength(0);
  });

  it('keeps the record on the phone when the connection fails', async () => {
    api.mockRejectedValue(offline());
    const res = await send('/holdings/f1/milk/session', { body: { a: 1 }, kind: 'milk', farmId: 'f1', label: 'Morning' });

    expect(res.queued).toMatchObject({ kind: 'milk', farmId: 'f1', status: 'waiting', userId: 'me' });
    expect(outbox.online).toBe(false);
    expect(outbox.waiting).toHaveLength(1);
  });

  it('does not even try the network once it knows it is offline', async () => {
    outbox.online = false;
    await send('/x', { body: {}, kind: 'event', label: 'Vaccination' });

    expect(api).not.toHaveBeenCalled();
    expect(outbox.waiting).toHaveLength(1);
  });

  it('shows a refusal at once while the person is still on the form', async () => {
    api.mockRejectedValue(refused('Enter 0 to 60 litres per milking.'));

    await expect(send('/x', { body: {}, kind: 'milk', label: 'Morning' })).rejects.toThrow('Enter 0 to 60');
    expect(outbox.items).toHaveLength(0);
  });
});

describe('sending what waited', () => {
  async function queue(n) {
    outbox.online = false;
    for (let i = 1; i <= n; i += 1) await send(`/item/${i}`, { body: { i }, kind: 'delivery', label: `Item ${i}` });
  }

  it('sends oldest first and stops at the first connection problem', async () => {
    await queue(3);
    api.mockResolvedValueOnce({}).mockRejectedValueOnce(offline());

    await flush();

    expect(api.mock.calls.map((c) => c[0])).toEqual(['/item/1', '/item/2']);
    expect(outbox.waiting.map((i) => i.path)).toEqual(['/item/2', '/item/3']);
  });

  it('keeps a refused record for a person to read, and carries on with the rest', async () => {
    await queue(2);
    api.mockRejectedValueOnce(refused('That cow was removed from the farm.')).mockResolvedValueOnce({});

    await flush();

    expect(outbox.failed).toHaveLength(1);
    expect(outbox.failed[0].error).toBe('That cow was removed from the farm.');
    expect(outbox.waiting).toHaveLength(0);

    discard(outbox.failed[0].id);
    expect(outbox.items).toHaveLength(0);
  });

  it('sends in the workspace the record was made in', async () => {
    await queue(1);
    outbox.items[0].orgId = 'org-coop';
    api.mockResolvedValue({});

    await flush();

    expect(api).toHaveBeenCalledWith('/item/1', expect.objectContaining({ method: 'POST', orgId: 'org-coop' }));
  });

  it('only sends records made by the person signed in', async () => {
    await queue(1);
    auth.user = { id: 'someone-else' };
    api.mockResolvedValue({});

    await flush();

    expect(api).not.toHaveBeenCalled();
    expect(outbox.items).toHaveLength(1);
  });
});
