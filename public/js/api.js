class VaultAPI {
  async request(method, url, body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);

    if (res.status === 401 && !url.includes('/api/auth/')) {
      window.location.reload();
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
  }

  get(url) { return this.request('GET', url); }
  post(url, body) { return this.request('POST', url, body); }
  put(url, body) { return this.request('PUT', url, body); }
  patch(url, body) { return this.request('PATCH', url, body); }
  delete(url) { return this.request('DELETE', url); }
}

export const api = new VaultAPI();
