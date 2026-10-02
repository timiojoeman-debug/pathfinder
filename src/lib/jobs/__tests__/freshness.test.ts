// @vitest-environment node
import { EventEmitter } from 'node:events';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const lookup = vi.fn();
vi.mock('node:dns/promises', () => ({ lookup: (...a: unknown[]) => lookup(...a) }));

const request = vi.fn();
vi.mock('node:https', () => ({ default: { request: (...a: unknown[]) => request(...a) } }));

import {
  assertPublicHttpUrl, guardedLookup, isPrivateIp, nodeSend, probeStatus, statusToFreshness, type ProbeResponse,
} from '../freshness';

beforeEach(() => lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]));
afterEach(() => {
  lookup.mockReset();
  vi.useRealTimers();
});

describe('isPrivateIp', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0',
    '100.64.0.1', '224.0.0.1', '192.0.0.8', '192.0.2.1',
    // IPv6 is an allow-list: everything outside global unicast 2000::/3 is refused
    '::1', '::', 'fd00::1', 'fe80::1', 'fe80::1%eth0', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:93.184.216.34',
    '::127.0.0.1', '::7f00:1', '64:ff9b::7f00:1', '64:ff9b::808:808', 'ff02::1',
    '2002:7f00:1::1', '2001::1', '2001:0:4136:e378:8000:63bf:3fff:fdd2', '2001:db8::1',
    'not-an-ip',
  ])('blocks %s', (ip) => expect(isPrivateIp(ip)).toBe(true));

  it.each(['93.184.216.34', '8.8.8.8', '172.32.0.1', '192.0.3.1', '192.0.1.5', '2606:4700::1111', '2a00:1450:4009:81f::200e', '2001:4860:4860::8888'])(
    'allows %s',
    (ip) => expect(isPrivateIp(ip)).toBe(false),
  );
});

describe('assertPublicHttpUrl', () => {
  it.each([
    'file:///etc/passwd', 'javascript:alert(1)', 'ftp://example.com/x', 'http://localhost/x', 'http://foo.localhost/',
    'http://127.0.0.1/', 'http://[::1]/', 'http://[::127.0.0.1]/', 'http://[64:ff9b::7f00:1]/',
    'http://169.254.169.254/latest/meta-data', 'http://user:pw@example.com/',
    'https://example.com:8443/', 'https://example.com:80/', 'http://example.com:443/', 'http://example.com:8080/',
    'http://metadata.google.internal/', 'not a url',
  ])('refuses %s', async (u) => {
    await expect(assertPublicHttpUrl(u)).rejects.toThrow();
  });

  it('accepts the protocol\'s own port, explicit or not', async () => {
    await expect(assertPublicHttpUrl('https://boards.example.com:443/jobs/1')).resolves.toBeInstanceOf(URL);
    await expect(assertPublicHttpUrl('http://boards.example.com:80/jobs/1')).resolves.toBeInstanceOf(URL);
  });

  it('refuses a hostname that resolves to a private address, even if another address is public', async () => {
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.5', family: 4 }]);
    await expect(assertPublicHttpUrl('https://sneaky.example.com/')).rejects.toThrow('address not allowed');
  });

  it('gives up on a DNS lookup that hangs', async () => {
    vi.useFakeTimers();
    lookup.mockReturnValue(new Promise(() => {}));
    const p = assertPublicHttpUrl('https://slow.example.com/');
    const caught = p.catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(3_100);
    expect(await caught).toBe('dns lookup timed out');
  });

  it('accepts a public https URL', async () => {
    await expect(assertPublicHttpUrl('https://boards.example.com/jobs/1')).resolves.toBeInstanceOf(URL);
  });
});

describe('guardedLookup (the connect-time pin)', () => {
  const run = (host: string, opts: { all?: boolean } = {}) =>
    new Promise<{ err: Error | null; address?: unknown; family?: number }>((resolve) =>
      guardedLookup(host, opts, (err, address, family) => resolve({ err, address, family })),
    );

  it('rejects a private answer, including one that appears only at connect time (rebinding)', async () => {
    // The pre-check saw a public address; the connection-time lookup now returns a private one.
    lookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
    const { err } = await run('rebind.example.com');
    expect(err?.message).toBe('address not allowed');
  });

  it('rejects when any returned address is private, in both callback shapes', async () => {
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }, { address: '::1', family: 6 }]);
    expect((await run('mixed.example.com')).err).toBeTruthy();
    expect((await run('mixed.example.com', { all: true })).err).toBeTruthy();
  });

  it('hands the validated address to the socket', async () => {
    expect(await run('ok.example.com')).toMatchObject({ err: null, address: '93.184.216.34', family: 4 });
    expect((await run('ok.example.com', { all: true })).address).toEqual([{ address: '93.184.216.34', family: 4 }]);
  });
});

const sendWith = (...responses: ProbeResponse[]) => {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  return fn;
};

describe('probeStatus', () => {
  it('returns the status of a plain HEAD', async () => {
    expect(await probeStatus('https://boards.example.com/jobs/1', sendWith({ status: 404 }))).toBe(404);
  });

  it('falls back to GET when HEAD is refused', async () => {
    const send = sendWith({ status: 405 }, { status: 200 });
    expect(await probeStatus('https://boards.example.com/jobs/1', send)).toBe(200);
    expect(send.mock.calls.map((c) => c[1])).toEqual(['HEAD', 'GET']);
  });

  it('follows a redirect to another public URL', async () => {
    const send = sendWith({ status: 301, location: '/moved' }, { status: 410 });
    expect(await probeStatus('https://boards.example.com/jobs/1', send)).toBe(410);
    expect(String((send.mock.calls[1] as unknown[])[0])).toBe('https://boards.example.com/moved');
  });

  it('refuses a redirect into a private address and never requests it', async () => {
    const send = sendWith({ status: 302, location: 'http://169.254.169.254/latest/meta-data' });
    expect(await probeStatus('https://boards.example.com/jobs/1', send)).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('gives up on a redirect loop', async () => {
    const send = vi.fn(async () => ({ status: 302, location: '/again' }));
    expect(await probeStatus('https://boards.example.com/jobs/1', send)).toBeNull();
  });

  it('returns null without sending for a blocked URL', async () => {
    const send = vi.fn();
    expect(await probeStatus('http://127.0.0.1/admin', send)).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('returns null when the request fails', async () => {
    const send = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    expect(await probeStatus('https://boards.example.com/jobs/1', send)).toBeNull();
  });
});

describe('statusToFreshness', () => {
  it('only a hard "gone" counts as may-have-closed', () => {
    expect(statusToFreshness(404)).toBe('may-have-closed');
    expect(statusToFreshness(410)).toBe('may-have-closed');
    for (const s of [200, 301, 403, 429, 500, 503, null]) expect(statusToFreshness(s)).toBe('unknown');
  });
});

describe('nodeSend: bounded requests', () => {
  function fakeReq() {
    const req = new EventEmitter() as EventEmitter & { destroy: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
    req.destroy = vi.fn((err?: Error) => {
      if (err) req.emit('error', err);
    });
    req.end = vi.fn();
    return req;
  }

  beforeEach(() => request.mockReset());

  it('slow drip: the request is destroyed at 5s even though the socket is never idle', async () => {
    vi.useFakeTimers();
    const req = fakeReq();
    request.mockReturnValue(req);
    const signal = new AbortController().signal;
    const outcome = nodeSend(new URL('https://slow.example.com/a'), 'HEAD', signal).then(() => 'resolved', (e: Error) => e.message);

    expect((request.mock.calls[0][0] as { signal: AbortSignal }).signal).toBe(signal);
    // A byte every 4s would keep an idle timeout from ever firing; the overall timer still does.
    await vi.advanceTimersByTimeAsync(4_900);
    expect(req.destroy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(req.destroy).toHaveBeenCalledTimes(1);
    expect(await outcome).toBe('timeout');
  });

  it('a response clears the timer, so nothing is destroyed later', async () => {
    vi.useFakeTimers();
    const req = fakeReq();
    request.mockReturnValue(req);
    const pending = nodeSend(new URL('https://ok.example.com/a'), 'HEAD');
    // The response arrives: call the callback nodeSend registered.
    (request.mock.calls[0][1] as (res: unknown) => void)({ statusCode: 404, headers: {}, destroy: vi.fn() });
    const res = await pending;
    expect(res).toEqual({ status: 404, location: undefined });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(req.destroy).not.toHaveBeenCalled();
  });
});

describe('probeStatus with an abort signal', () => {
  it('does not start once aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    const send = vi.fn();
    expect(await probeStatus('https://boards.example.com/a', send, ac.signal)).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('stops between redirect hops once the signal aborts, and passes the signal to each request', async () => {
    const ac = new AbortController();
    const send = vi.fn(async () => {
      ac.abort(); // the deadline passes during the first hop
      return { status: 302, location: '/next' };
    });
    expect(await probeStatus('https://boards.example.com/a', send, ac.signal)).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0] as unknown[])[2]).toBe(ac.signal);
  });
});
